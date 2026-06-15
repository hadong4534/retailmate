'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserStoreContexts } from '@/lib/auth/store-context';

/** 직원: 연장근무 신청(대기) 생성. 본인이 소속된 매장에 한함. */
export async function submitOvertime(input: {
  storeId: string;
  workDate: string;
  minutes: number;
  reason?: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workDate)) return { error: '날짜 형식이 올바르지 않습니다.' };
  const minutes = Math.round(input.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
    return { error: '연장 시간이 올바르지 않습니다.' };
  }
  const contexts = await getUserStoreContexts(supabase, user.id);
  if (!contexts.some((c) => c.storeId === input.storeId)) {
    return { error: '해당 매장 소속이 아닙니다.' };
  }
  const admin = createAdminClient();
  const { error } = await admin.from('overtime_requests').insert({
    store_id: input.storeId,
    user_id: user.id,
    work_date: input.workDate,
    minutes,
    reason: input.reason?.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/employee/me');
  return { ok: true };
}

/** 사장/매니저: 연장근무 승인/거절. 해당 매장 관리자만. */
export async function decideOvertime(input: {
  id: string;
  decision: 'approved' | 'rejected';
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    return { error: '잘못된 요청입니다.' };
  }
  const admin = createAdminClient();
  const { data: req } = await admin
    .from('overtime_requests')
    .select('id, store_id, status')
    .eq('id', input.id)
    .maybeSingle();
  if (!req) return { error: '신청을 찾을 수 없습니다.' };

  const contexts = await getUserStoreContexts(supabase, user.id);
  const ctx = contexts.find((c) => c.storeId === req.store_id);
  if (!ctx || !ctx.isAdmin) return { error: '승인 권한이 없습니다.' };

  const { error } = await admin
    .from('overtime_requests')
    .update({ status: input.decision, decided_by: user.id, decided_at: new Date().toISOString() })
    .eq('id', input.id);
  if (error) return { error: error.message };
  revalidatePath('/employees/payroll');
  return { ok: true };
}
