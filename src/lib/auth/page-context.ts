import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentAdminStore, type StoreContext } from './store-context';

/**
 * SSR 페이지 진입 시 사용자 + 관리 매장 컨텍스트를 한 번에 가져온다.
 *
 * 핵심: `auth.getUser()` 대신 `auth.getClaims()` 사용 — JWT 로컬 검증으로 Supabase 왕복 1회 절약.
 * proxy.ts middleware가 이미 매 요청마다 토큰 유효성과 refresh를 처리하므로,
 * SSR 단계에선 claims만 신뢰해도 충분히 안전. 페이지당 ~150ms 단축 (서울 ↔ Vercel us-east).
 *
 * 반환:
 *   - null: 비로그인이거나 관리 매장이 없는 사용자
 *   - { userId, adminStore }: 정상
 */
export async function getPageContext(
  supabase: SupabaseClient,
): Promise<{ userId: string; adminStore: StoreContext } | null> {
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as { sub?: string } | undefined;
  if (!claims?.sub) return null;
  const adminStore = await getCurrentAdminStore(supabase, claims.sub);
  if (!adminStore) return null;
  return { userId: claims.sub, adminStore };
}
