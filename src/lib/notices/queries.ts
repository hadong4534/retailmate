import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreRole } from '@/lib/auth/store-context';

export interface Notice {
  id: string;
  store_id: string;
  author_id: string;
  title: string;
  body: string;
  target: 'all' | 'employees';
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 사용자가 봐야 할 미읽 공지 (모든 멤버 매장 통합).
 * - target='all'은 모두에게
 * - target='employees'는 employee role에게만 (owner/manager는 제외)
 */
export async function getUnreadNotices(
  supabase: SupabaseClient,
  userId: string,
  storeRoles: Map<string, StoreRole>, // storeId → role
): Promise<Notice[]> {
  const storeIds = Array.from(storeRoles.keys());
  if (storeIds.length === 0) return [];

  const nowIso = new Date().toISOString();

  const { data: notices } = await supabase
    .from('notices')
    .select('*')
    .in('store_id', storeIds)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(50);

  const all = (notices ?? []) as Notice[];

  // role 기반 필터
  const visible = all.filter((n) => {
    if (n.target === 'all') return true;
    // 'employees' — employee role만 볼 수 있게
    return storeRoles.get(n.store_id) === 'employee';
  });

  if (visible.length === 0) return [];

  // 본인이 이미 읽은 항목 제외
  const ids = visible.map((n) => n.id);
  const { data: reads } = await supabase
    .from('notice_reads')
    .select('notice_id')
    .eq('user_id', userId)
    .in('notice_id', ids);

  const readSet = new Set((reads ?? []).map((r) => r.notice_id));
  return visible.filter((n) => !readSet.has(n.id));
}

export async function getStoreNotices(
  supabase: SupabaseClient,
  storeId: string,
): Promise<Notice[]> {
  const { data } = await supabase
    .from('notices')
    .select('*')
    .eq('store_id', storeId)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false });
  return (data ?? []) as Notice[];
}
