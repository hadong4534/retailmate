import type { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { cookies } from 'next/headers';

export type StoreRole = 'owner' | 'manager' | 'employee';

export const CURRENT_STORE_COOKIE = 'rm_current_store';

export interface StoreContext {
  storeId: string;
  storeName: string;
  role: StoreRole;
  isAdmin: boolean;
}

/**
 * 사용자가 접근 가능한 모든 매장과 매장별 역할을 반환.
 * - owner: stores.owner_id = user.id
 * - manager / employee: store_members
 * 같은 매장에 동시에 여러 row가 있으면 (예: owner + 자기 자신을 manager로 등록)
 * owner > manager > employee 순으로 우선.
 */
export const getUserStoreContexts = cache(async function getUserStoreContexts(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoreContext[]> {
  const [ownedRes, memberRes] = await Promise.all([
    supabase.from('stores').select('id, name').eq('owner_id', userId),
    supabase
      .from('store_members')
      // 매장 이름을 조인으로 함께 조회 — 추가 왕복 1회 제거 (RLS는 기존 별도 조회와 동일하게 적용)
      .select('store_id, role, stores(id, name)')
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  const owned = (ownedRes.data ?? []) as { id: string; name: string }[];
  const members = (memberRes.data ?? []) as unknown as {
    store_id: string;
    role: StoreRole;
    stores: { id: string; name: string } | null;
  }[];

  const map = new Map<string, StoreContext>();

  owned.forEach((s) => {
    map.set(s.id, {
      storeId: s.id,
      storeName: s.name,
      role: 'owner',
      isAdmin: true,
    });
  });

  members.forEach((m) => {
    if (map.has(m.store_id)) return; // owner가 우선
    const store = m.stores;
    if (!store) return;
    map.set(m.store_id, {
      storeId: m.store_id,
      storeName: store.name,
      role: m.role,
      isAdmin: m.role === 'manager',
    });
  });

  return Array.from(map.values());
});

/**
 * 현재 활성 매장 컨텍스트 (관리자 권한 필요).
 * Cookie `rm_current_store`로 사용자가 선택한 매장 우선.
 * Cookie 없거나 권한 없으면 owner > manager > 이름순으로 fallback.
 *
 * @returns admin(owner OR manager) 매장 1개. 없으면 null.
 */
export async function getCurrentAdminStore(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoreContext | null> {
  const contexts = await getUserStoreContexts(supabase, userId);
  const admin = contexts.filter((c) => c.isAdmin);
  if (admin.length === 0) return null;

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(CURRENT_STORE_COOKIE)?.value;
  if (selectedId) {
    const found = admin.find((c) => c.storeId === selectedId);
    if (found) return found;
  }

  admin.sort((a, b) => {
    if (a.role === b.role) return a.storeName.localeCompare(b.storeName, 'ko');
    return a.role === 'owner' ? -1 : 1;
  });
  return admin[0];
}
