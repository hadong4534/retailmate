import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * id_token의 nonce claim을 검증하기 위해 JWT payload만 디코딩 (서명 검증 X).
 * 카카오 id_token은 RS256으로 서명되지만 우리는 nonce 일치만 확인하면 충분 —
 * 진짜 검증은 access_token으로 /v2/user/me 호출 성공에서 이미 했음.
 */
function decodeJwtNonce(idToken: string): string | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as { nonce?: string };
    return json.nonce ?? null;
  } catch {
    return null;
  }
}

/**
 * 카카오 placeholder 이메일로 기존 supabase user를 찾는다.
 * admin.listUsers는 디폴트 perPage=50이고 페이지네이션이 필요해
 * 그냥 한 번 호출하면 51번째 사용자 이후엔 항상 못 찾고 중복 신규 가입이 발생한다.
 * 여기서는 큰 perPage로 모든 페이지를 순회한다 — 매장당 카카오 가입자가 많지 않으므로 지출 미미.
 */
async function findKakaoUserByEmail(
  svc: SupabaseClient,
  email: string,
): Promise<{ id: string } | null> {
  const PER_PAGE = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) return null;
    if (!data?.users?.length) return null;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return { id: hit.id };
    if (data.users.length < PER_PAGE) return null; // 마지막 페이지
  }
  return null;
}

interface KakaoTokenResponse {
  access_token?: string;
  token_type?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface KakaoUserResponse {
  id?: number;
  connected_at?: string;
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account?: {
    profile_nickname_needs_agreement?: boolean;
    profile?: {
      nickname?: string;
    };
  };
}

/**
 * 카카오 OAuth 콜백.
 *
 * 흐름:
 *  1) code 받아서 access_token + id_token 교환
 *  2) /v2/user/me 로 사용자 정보 (kakao id, 닉네임) 조회
 *  3) Service Role로 Supabase 사용자 find-or-create
 *     - email 은 카카오 id 기반 가짜 주소 (kakao_<id>@retailmate.local) — 추후 사용자가 설정에서 실 이메일 입력
 *  4) generateLink (magiclink) → token_hash 추출 → verifyOtp 로 세션 발급
 *  5) 매장 유무에 따라 /onboarding/store 또는 /dashboard 로 redirect
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('state') ?? '/dashboard';
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, url.origin),
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=kakao_no_code', url.origin));
  }

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/login?error=kakao_misconfigured', url.origin),
    );
  }

  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = request.headers.get('host') ?? url.host;
  const redirectUri = `${proto}://${host}/api/auth/kakao/callback`;

  // 0. nonce 검증 — start에서 저장한 nonce 쿠키와 id_token.nonce 일치 확인.
  //    공격자가 다른 사용자의 인가 code를 가로채 우리 callback에 보내는 replay 공격 방어.
  //    쿠키가 없으면(직접 진입 등) 부드럽게 nonce 검증을 건너뛴다.
  const nonceCookie = (await cookies()).get('kakao_oauth_nonce')?.value;

  // 1. 토큰 교환
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    }),
    cache: 'no-store',
  });
  const tokens = (await tokenRes.json()) as KakaoTokenResponse;
  if (!tokenRes.ok || !tokens.access_token) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(tokens.error_description ?? 'kakao_token_failed')}`,
        url.origin,
      ),
    );
  }

  // 1.5. nonce 검증 — id_token이 있고 우리가 발행한 nonce 쿠키가 있다면 일치 확인.
  if (nonceCookie && tokens.id_token) {
    const tokenNonce = decodeJwtNonce(tokens.id_token);
    if (tokenNonce && tokenNonce !== nonceCookie) {
      return NextResponse.redirect(new URL('/login?error=kakao_nonce_mismatch', url.origin));
    }
  }

  // 2. 사용자 정보 조회
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: 'no-store',
  });
  const kakaoUser = (await userRes.json()) as KakaoUserResponse;
  if (!userRes.ok || !kakaoUser.id) {
    return NextResponse.redirect(
      new URL('/login?error=kakao_userinfo_failed', url.origin),
    );
  }

  const kakaoId = String(kakaoUser.id);
  const nickname =
    kakaoUser.kakao_account?.profile?.nickname ??
    kakaoUser.properties?.nickname ??
    `카카오사용자${kakaoId.slice(-4)}`;

  // 3. Supabase 사용자 find-or-create
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const placeholderEmail = `kakao_${kakaoId}@retailmate.local`;

  // 기존 사용자 조회: placeholder 이메일로 페이지네이션 순회.
  // (이전 코드는 listUsers의 첫 50명만 봐서 그 이후 가입한 카카오 사용자는 매번 신규로 생성되는 버그였음)
  const existing = await findKakaoUserByEmail(svc, placeholderEmail);

  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    // 신규 — 무작위 비밀번호로 생성 (로그인에 직접 안 씀)
    const randomPassword = randomBytes(24).toString('hex');
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email: placeholderEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        provider: 'kakao',
        kakao_id: kakaoId,
        name: nickname,
        role: 'owner',
      },
    });
    if (createErr || !created.user) {
      return NextResponse.redirect(
        new URL('/login?error=kakao_user_create_failed', url.origin),
      );
    }
    userId = created.user.id;

    // profiles 행 채우기 (트리거가 만든 빈 행 갱신)
    await svc.from('profiles').upsert({
      id: userId,
      name: nickname,
    });
  }

  // 4. magiclink 생성 → 즉시 verifyOtp 로 세션 발급
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: placeholderEmail,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.redirect(
      new URL('/login?error=kakao_link_failed', url.origin),
    );
  }

  const supabase = await createClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyErr) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(verifyErr.message)}`, url.origin),
    );
  }

  // 5. 매장 유무 체크 → 신규는 매장 등록으로
  const [{ data: owned }, { data: member }] = await Promise.all([
    supabase.from('stores').select('id').eq('owner_id', userId).limit(1),
    supabase.from('store_members').select('store_id').eq('user_id', userId).eq('is_active', true).limit(1),
  ]);
  const hasStore = (owned?.length ?? 0) > 0 || (member?.length ?? 0) > 0;

  // 직원이 소속만 되어있으면 온보딩(매장 생성)으로 보내지 않는다.
  const finalRes = !hasStore
    ? NextResponse.redirect(new URL('/onboarding/store', url.origin))
    : NextResponse.redirect(new URL(next, url.origin));
  finalRes.cookies.delete('kakao_oauth_nonce');
  return finalRes;
}
