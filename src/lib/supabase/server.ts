import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { cookieDomainFor } from '@/lib/auth/cookie-domain';

// 자동로그인 유지 — Supabase가 토큰 갱신 시 maxAge를 안 넘기는 케이스를 방어
const PERSIST_MAX_AGE = 60 * 60 * 24 * 400;

export async function createClient() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const domain = cookieDomainFor(headersList.get('host'));

  const cookieOptions = {
    maxAge: PERSIST_MAX_AGE,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...cookieOptions,
              })
            );
          } catch {
            // Server Component에서 호출 시 set 불가 — 무시
          }
        },
      },
    }
  );
}
