import { createAdminClient } from '@/lib/supabase/admin';

export interface PendingOvertime {
  id: string;
  userId: string;
  name: string;
  workDate: string;
  minutes: number;
  reason: string | null;
}

function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

/** 매장의 대기중 연장근무 신청(이름 포함). 사장 승인 화면용. */
export async function listPendingOvertime(storeId: string): Promise<PendingOvertime[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('overtime_requests')
    .select('id, user_id, work_date, minutes, reason')
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .order('work_date', { ascending: true });
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profs } = await admin.from('profiles').select('id, name').in('id', userIds);
  const nameMap = new Map((profs ?? []).map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: nameMap.get(r.user_id) || '이름 미등록',
    workDate: r.work_date,
    minutes: r.minutes,
    reason: r.reason,
  }));
}

/** 매장+월 승인 연장근무 분(分)을 직원별 합산 (사장 급여 집계용). */
export async function approvedOvertimeByUser(storeId: string, month: string): Promise<Map<string, number>> {
  const admin = createAdminClient();
  const { from, to } = monthBounds(month);
  const { data } = await admin
    .from('overtime_requests')
    .select('user_id, minutes')
    .eq('store_id', storeId)
    .eq('status', 'approved')
    .gte('work_date', from)
    .lte('work_date', to);
  const map = new Map<string, number>();
  (data ?? []).forEach((r) => map.set(r.user_id, (map.get(r.user_id) ?? 0) + r.minutes));
  return map;
}

/** 특정 직원의 매장별 승인 연장근무 분 (직원 본인 화면용). */
export async function approvedOvertimeForUser(userId: string, month: string): Promise<Map<string, number>> {
  const admin = createAdminClient();
  const { from, to } = monthBounds(month);
  const { data } = await admin
    .from('overtime_requests')
    .select('store_id, minutes')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .gte('work_date', from)
    .lte('work_date', to);
  const map = new Map<string, number>();
  (data ?? []).forEach((r) => map.set(r.store_id, (map.get(r.store_id) ?? 0) + r.minutes));
  return map;
}
