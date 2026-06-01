'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';

type Result = { ok: true } | { error: string };

/** 호출자가 현재 관리(owner/manager)하는 매장인지 확인하고 storeId 반환. */
async function authorizeStore(): Promise<{ storeId: string; userId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };
  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 관리 권한이 없습니다.' };
  return { storeId: adminStore.storeId, userId: user.id };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 특정 직원의 특정 날짜 근무 스케줄 저장(직원당 1일 1교대).
 * 기존 같은 날짜 스케줄을 지우고 새로 넣는다.
 */
export async function saveShift(input: {
  memberUserId: string;
  date: string;        // YYYY-MM-DD
  start: string;       // HH:MM
  end: string;         // HH:MM
  label?: string | null;
}): Promise<Result> {
  const auth = await authorizeStore();
  if ('error' in auth) return auth;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: '날짜 형식 오류' };
  if (!TIME_RE.test(input.start) || !TIME_RE.test(input.end)) return { error: '시간 형식 오류(HH:MM)' };

  const admin = createAdminClient();
  // 대상이 이 매장 소속 직원인지 확인
  const { data: mem } = await admin.from('store_members')
    .select('id').eq('store_id', auth.storeId).eq('user_id', input.memberUserId).maybeSingle();
  if (!mem) return { error: '해당 매장 직원이 아닙니다.' };

  await admin.from('work_schedules')
    .delete().eq('store_id', auth.storeId).eq('user_id', input.memberUserId).eq('schedule_date', input.date);
  const { error } = await admin.from('work_schedules').insert({
    store_id: auth.storeId,
    user_id: input.memberUserId,
    schedule_date: input.date,
    start_time: input.start,
    end_time: input.end,
    shift_label: input.label || null,
    created_by: auth.userId,
  });
  if (error) return { error: error.message };
  revalidatePath('/attendance');
  return { ok: true };
}

/** 특정 직원의 특정 날짜 스케줄 삭제. */
export async function clearShift(input: { memberUserId: string; date: string }): Promise<Result> {
  const auth = await authorizeStore();
  if ('error' in auth) return auth;
  const admin = createAdminClient();
  const { error } = await admin.from('work_schedules')
    .delete().eq('store_id', auth.storeId).eq('user_id', input.memberUserId).eq('schedule_date', input.date);
  if (error) return { error: error.message };
  revalidatePath('/attendance');
  return { ok: true };
}
