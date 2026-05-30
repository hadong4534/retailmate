import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 카카오 OAuth 진입점.
 * Supabase 기본 OAuth는 default scope(account_email, profile_image, profile_nickname)을
 * 강제로 포함하는데, account_email은 비즈앱 미인증 상태에서 거부(KOE205) → 직접 구현.
 *
 * scope='profile_nickname openid' 만 요청해서 비즈앱 없이도 OAuth 성공.
 * 이후 callback 라우트에서 id_token으로 Supabase 세션 발급.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/dashboard';

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/login?error=kakao_misconfigured', url.origin),
    );
  }

  // Vercel 환경에서는 https, 로컬에서는 http
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = request.headers.get('host') ?? url.host;
  const redirectUri = `${proto}://${host}/api/auth/kakao/callback`;

  // OIDC nonce — id_token 재사용 공격 방어용
  const nonce = randomUUID();

  const authorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'profile_nickname openid');
  authorizeUrl.searchParams.set('state', next);
  authorizeUrl.searchParams.set('nonce', nonce);

  const res = NextResponse.redirect(authorizeUrl.toString());
  // 콜백에서 검증할 수 있도록 nonce를 httpOnly 쿠키에 저장 (10분)
  res.cookies.set('kakao_oauth_nonce', nonce, {
    httpOnly: true,
    secure: proto === 'https',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
