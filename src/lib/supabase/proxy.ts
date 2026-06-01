import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookieDomainFor } from '@/lib/auth/cookie-domain';

// 자동로그인 유지 — 모든 auth 쿠키에 강제로 maxAge 400일 적용
// Supabase SSR이 setAll에 maxAge를 안 넘기는 케이스(특히 토큰 갱신 시)가 있어
// 옵션을 그대로 받지 말고 우리 쪽에서 명시적으로 덮어쓴다.
const PERSIST_MAX_AGE = 60 * 60 * 24 * 400;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // retailmate.io / www.retailmate.io 어느 쪽으로 들어와도 동일 쿠키 적용
  const domain = cookieDomainFor(request.headers.get('host'));
  const cookieOptions = {
    maxAge: PERSIST_MAX_AGE,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...cookieOptions,
            })
          );
        },
      },
    }
  );

  // ⚡ 자동 로그인 보존 + 속도 균형:
  //   1) getClaims()는 access_token JWT를 로컬 검증 — 정상 케이스에서 네트워크 0
  //   2) claims가 없으면(=토큰 만료) getUser()를 호출 — refresh_token으로 access_token을 갱신해
  //      자동 로그인이 끊기지 않게 한다. setAll 콜백이 새 쿠키를 응답에 박는다.
  //   결과: 평소엔 빠르고, 만료 시점에만 1회 Supabase 왕복.
  let user: { id: string } | null = null;
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims) {
    user = { id: claimsData.claims.sub as string };
  } else {
    const { data: { user: refreshedUser } } = await supabase.auth.getUser();
    user = refreshedUser ? { id: refreshedUser.id } : null;
  }

  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/debug/') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    (pathname.startsWith('/contracts/') && pathname.endsWith('/sign')) ||
    pathname.startsWith('/api/public') ||
    // ⚠ 인증 관련 API는 정의상 비로그인 상태에서 호출됨.
    //    이게 빠져 있으면 회원가입 SMS(/api/auth/phone/send) 호출 시 미들웨어가 307로
    //    /login으로 redirect → 라우트 실행 자체 안 됨 → 인증번호가 발송된 적이 없음.
    //    각 라우트가 자체적으로 svc-role 검증을 하므로 미들웨어에서 풀어도 안전.
    pathname.startsWith('/api/auth/') ||
    // Supabase OAuth/매직링크 콜백 — 비로그인 상태에서 code→session 교환이 일어나는 곳.
    // 이게 빠져 있으면 콜백이 307로 /login으로 튕겨 OAuth·이메일확인 가입이 끊긴다.
    pathname.startsWith('/auth/callback');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(url);
    // 핵심: 이 응답은 "이 사용자의 인증 쿠키 상태"에 따른 결정이므로
    // CDN(특히 Vercel Edge)이 절대 캐시해서는 안 된다.
    // 캐시되면 인증된 사용자에게도 캐시된 /login redirect가 서빙되어
    // 모든 보호 라우트가 로그인으로 빠지는 장애가 발생한다.
    redirectResponse.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    redirectResponse.headers.set('Vary', 'Cookie');
    return redirectResponse;
  }

  // 보호 라우트 통과 응답: CDN/공유 캐시는 금지하되 브라우저 BFCache는 허용해야
  // 탭 전환·뒤로가기가 즉시 떠서 체감 속도가 빨라진다.
  //
  // `no-store`는 BFCache까지 막아 매 탭 클릭마다 새 SSR 요청 → 누적 200~500ms 지연 원인.
  // `no-cache`로 완화 — 캐시 자체는 보관하되 사용 전 origin에 재검증 (인증 변화 즉시 반영).
  // `Vary: Cookie`로 다른 사용자의 응답이 섞이지 않게 보장.
  //
  // redirect 응답(위 if-블록)은 여전히 `no-store` 유지 — 그쪽은 CDN 캐시되면 장애였던 부분.
  if (!isPublic) {
    response.headers.set('Cache-Control', 'private, no-cache, max-age=0');
    response.headers.set('Vary', 'Cookie');
  }

  return response;
}
