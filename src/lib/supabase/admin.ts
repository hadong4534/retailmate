import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase 클라이언트 — RLS 우회.
 * 토큰 기반 anon 접근(서명 페이지)에서만 사용한다. 절대 클라이언트 번들에 노출 금지.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
