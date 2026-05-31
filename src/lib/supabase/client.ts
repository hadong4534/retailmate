import { createBrowserClient } from '@supabase/ssr';
import { cookieDomainFor } from '@/lib/auth/cookie-domain';

/**
 * 영구 인증 쿠키 — 자동 로그인이 브라우저 재시작 후에도 유지되도록
 * 모든 auth 쿠키 쓰기에 Max-Age를 강제로 박는다.
 *
 * @supabase/ssr의 cookieOptions만 넘기면 일부 케이스에서 Max-Age가 누락되는 이슈가
 * 관찰돼, document.cookie를 직접 제어하는 명시적 setAll을 제공한다.
 */
const COOKIE_MAX_AGE_DAYS = 400; // Chrome 최대 (rfc 6265 권장 한계)
const MAX_AGE = 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS;

function parseDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined') return [];
  if (!document.cookie) return [];
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      const name = eq === -1 ? pair : pair.slice(0, eq);
      const raw = eq === -1 ? '' : pair.slice(eq + 1);
      let value = raw;
      try {
        value = decodeURIComponent(raw);
      } catch {
        // ignore decode error
      }
      return { name, value };
    });
}

function writeDocumentCookies(
  cookies: { name: string; value: string; options?: { maxAge?: number } }[],
) {
  if (typeof document === 'undefined') return;
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const domain =
    typeof window !== 'undefined'
      ? cookieDomainFor(window.location.hostname)
      : undefined;
  for (const { name, value, options } of cookies) {
    // 빈 값이거나 maxAge가 0/음수면 삭제 의도
    const remove = value === '' || (options?.maxAge !== undefined && options.maxAge <= 0);
    const maxAge = remove ? 0 : MAX_AGE;
    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      `Max-Age=${maxAge}`,
      'Path=/',
      'SameSite=Lax',
    ];
    if (domain) parts.push(`Domain=${domain}`);
    if (isHttps) parts.push('Secure');
    document.cookie = parts.join('; ');
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: MAX_AGE,
        sameSite: 'lax',
        path: '/',
      },
      cookies: {
        getAll() {
          return parseDocumentCookies();
        },
        setAll(cookiesToSet) {
          writeDocumentCookies(cookiesToSet);
        },
      },
    },
  );
}
