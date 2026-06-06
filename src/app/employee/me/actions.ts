'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 회원탈퇴(계정 삭제) — 본인 계정만.
 *
 * 정책:
 *  - 매장을 소유한 사장님은 바로 탈퇴 불가 (매장 정리/양도 먼저). stores.owner_id RESTRICT와도 일치.
 *  - 직원/매니저(소유 매장 없음)는 탈퇴 가능.
 *
 * 처리:
 *  1) created_by(NULL 허용)는 NULL 처리 — 삭제 차단(NO ACTION) 방지.
 *  2) notices.author_id(NOT NULL)는 매장 소유자로 이관.
 *  3) auth.users 삭제 → profiles·store_members·attendances·labor_contracts(employee)·
 *     payrolls·consent_logs·notice_reads 등은 ON DELETE CASCADE로 자동 정리.
 */
export async function deleteMyAccount(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const admin = createAdminClient();

  // 1) 사장(매장 소유자)은 탈퇴 차단
  const { data: owned } = await admin
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1);
  if (owned && owned.length > 0) {
    return {
      error:
        '매장을 보유한 사장님은 바로 탈퇴할 수 없습니다. 매장을 먼저 정리하거나 양도한 뒤 다시 시도해주세요.',
    };
  }

  // 2) created_by 계열(NULL 허용) 비우기 — FK 삭제 차단 방지
  await admin.from('sales').update({ created_by: null }).eq('created_by', user.id);
  await admin.from('expenses').update({ created_by: null }).eq('created_by', user.id);
  await admin.from('work_schedules').update({ created_by: null }).eq('created_by', user.id);
  await admin.from('contract_templates').update({ created_by: null }).eq('created_by', user.id);
  await admin.from('contract_revisions').update({ revised_by: null }).eq('revised_by', user.id);

  // 3) notices.author_id(NOT NULL) -> 매장 소유자로 이관
  const { data: myNotices } = await admin
    .from('notices')
    .select('id, store_id')
    .eq('author_id', user.id);
  if (myNotices && myNotices.length > 0) {
    const storeIds = Array.from(new Set(myNotices.map((n) => n.store_id)));
    const { data: storeOwners } = await admin
      .from('stores')
      .select('id, owner_id')
      .in('id', storeIds);
    const ownerMap = new Map((storeOwners ?? []).map((s) => [s.id, s.owner_id]));
    for (const n of myNotices) {
      const newAuthor = ownerMap.get(n.store_id);
      if (newAuthor) {
        await admin.from('notices').update({ author_id: newAuthor }).eq('id', n.id);
      } else {
        await admin.from('notices').delete().eq('id', n.id);
      }
    }
  }

  // 4) 계정 삭제 (나머지 개인정보는 CASCADE로 정리)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  // 5) 세션 정리
  await supabase.auth.signOut();
  return { ok: true };
}
