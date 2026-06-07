'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore, getUserStoreContexts } from '@/lib/auth/store-context';
import { createAdminClient } from '@/lib/supabase/admin';

type Result =
  | { ok: true; attendanceId: string; distanceM?: number }
  | { error: string; distanceM?: number };

/**
 * 두 GPS 좌표 사이 거리 (m, haversine).
 */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

async function resolveStoreId(): Promise<{ storeId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  // 1) admin이면 currentStore 사용
  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (adminStore) return { storeId: adminStore.storeId };

  // 2) 직원이면 store_members에서 활성 매장 1개 (getUserStoreContexts는 is_active=true만 포함)
  const ctxs = await getUserStoreContexts(supabase, user.id);
  if (ctxs.length === 0) return { error: '소속된 활성 매장이 없습니다.' };
  return { storeId: ctxs[0].storeId };
}

/**
 * GPS 출근 — 위치를 받아 매장 좌표 반경 내인지 검증 후 attendances row 생성.
 */
export async function gpsCheckIn(input: { lat: number; lng: number; accuracy?: number }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const storeRes = await resolveStoreId();
  if ('error' in storeRes) return { error: storeRes.error };
  const storeId = storeRes.storeId;

  const { data: store } = await supabase
    .from('stores')
    .select('lat, lng, radius_m')
    .eq('id', storeId)
    .maybeSingle();

  if (!store || store.lat == null || store.lng == null) {
    return { error: '매장 GPS 좌표가 설정되지 않았습니다. 사장님이 [설정 → 매장 정보]에서 위치를 등록해야 합니다.' };
  }

  const radius = store.radius_m ?? 100;
  const dist = distanceMeters(input.lat, input.lng, Number(store.lat), Number(store.lng));

  // 휴대폰 GPS 오차 보정 — 실내에서는 수십~수백 m 튀는 게 정상이라,
  // 기기가 보고한 정확도(±accuracy)를 최대 100m까지 허용 오차로 인정한다.
  const accuracyBuffer = Math.min(Math.max(Math.round(input.accuracy ?? 0), 0), 100);
  if (dist > radius + accuracyBuffer) {
    const accNote = accuracyBuffer > 0 ? ` · GPS 오차 ±${accuracyBuffer}m 감안` : '';
    return {
      error: `매장 반경 ${radius}m 밖입니다 (현재 ${dist}m${accNote}). 창가나 야외 등 GPS가 잘 잡히는 곳에서 다시 시도해주세요.`,
      distanceM: dist,
    };
  }

  // 오늘(KST 기준) 이미 미완료 출근 row가 있으면 차단.
  // 서버는 UTC라 new Date().setHours(0,0,0,0)는 UTC 자정 → 한국 자정과 9시간 어긋남.
  // KST(UTC+9) 자정에 해당하는 UTC 시각을 계산한다.
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStart = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - 9 * 60 * 60 * 1000,
  );
  const { data: openRow } = await supabase
    .from('attendances')
    .select('id')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .is('check_out_at', null)
    .gte('check_in_at', todayStart.toISOString())
    .maybeSingle();
  if (openRow) {
    return { error: '이미 근무 중 상태입니다. 먼저 퇴근 처리를 해주세요.' };
  }

  // is_valid / work_minutes는 generated column 가능성이 있어 직접 insert 안 함
  const { data: row, error } = await supabase
    .from('attendances')
    .insert({
      store_id: storeId,
      user_id: user.id,
      check_in_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !row) return { error: error?.message ?? '출근 기록 실패' };

  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  revalidatePath('/employee/me');
  return { ok: true, attendanceId: row.id, distanceM: dist };
}

/**
 * 퇴근 — 가장 최근 미완료 출근 row를 업데이트.
 *
 * ⚠ 퇴근은 GPS를 요구하지 않는다 (어디서나 가능).
 *   - 출근은 '매장에 있다'는 인증이 목적이지만, 퇴근은 깜빡하고 매장을 떠난 뒤
 *     누르는 경우가 많고, 실내 GPS 불량으로 매장 안에서도 차단되는 문제가 있었음.
 *   - 좌표가 오면 기록용으로만 쓰고, 없거나 멀어도 퇴근 처리는 항상 진행한다.
 */
export async function gpsCheckOut(input?: { lat?: number | null; lng?: number | null }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const storeRes = await resolveStoreId();
  if ('error' in storeRes) return { error: storeRes.error };
  const storeId = storeRes.storeId;

  // (기록용) 좌표가 있으면 매장과의 거리만 계산 — 차단하지 않음
  let dist: number | undefined;
  if (input?.lat != null && input?.lng != null) {
    const { data: store } = await supabase
      .from('stores')
      .select('lat, lng')
      .eq('id', storeId)
      .maybeSingle();
    if (store?.lat != null && store?.lng != null) {
      dist = distanceMeters(input.lat, input.lng, Number(store.lat), Number(store.lng));
    }
  }

  // 가장 최근 미완료 row
  const { data: openRow } = await supabase
    .from('attendances')
    .select('id, check_in_at')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .is('check_out_at', null)
    .order('check_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openRow) {
    return { error: '진행 중인 출근 기록이 없습니다.' };
  }

  const checkOut = new Date();

  // work_minutes는 generated column으로 check_out_at 설정 시 자동 계산됨 — 직접 update 금지
  const { error } = await supabase
    .from('attendances')
    .update({
      check_out_at: checkOut.toISOString(),
    })
    .eq('id', openRow.id);

  if (error) return { error: error.message };

  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  revalidatePath('/employee/me');
  return { ok: true, attendanceId: openRow.id, distanceM: dist };
}
/**
 * 출퇴근 시간 수정 — 사장/매니저 전용.
 * 직원이 퇴근을 늦게 찍는 등 실제와 다른 기록을 사장님이 바로잡는 용도.
 * 시간은 해당 기록의 KST 날짜 기준 'HH:MM'으로 받는다. 퇴근이 출근보다 이르면 익일로 간주(야간 근무).
 */
export async function updateAttendanceTimes(input: {
  attendanceId: string;
  checkInHM: string;          // 'HH:MM' (KST)
  checkOutHM: string | null;  // null이면 '근무 중'으로 되돌림
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '관리자만 수정할 수 있습니다.' };

  if (!/^\d{2}:\d{2}$/.test(input.checkInHM)) return { error: '출근 시간이 올바르지 않습니다.' };
  if (input.checkOutHM !== null && !/^\d{2}:\d{2}$/.test(input.checkOutHM)) {
    return { error: '퇴근 시간이 올바르지 않습니다.' };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('attendances')
    .select('id, store_id, check_in_at')
    .eq('id', input.attendanceId)
    .maybeSingle();
  if (!row || row.store_id !== adminStore.storeId) {
    return { error: '해당 기록을 찾을 수 없습니다.' };
  }

  // 기존 출근 시각의 KST 날짜를 유지한 채 시:분만 교체
  const kstDate = new Date(new Date(row.check_in_at).getTime() + 9 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const newIn = new Date(`${kstDate}T${input.checkInHM}:00+09:00`);
  let newOut: Date | null = null;
  if (input.checkOutHM !== null) {
    newOut = new Date(`${kstDate}T${input.checkOutHM}:00+09:00`);
    if (newOut.getTime() <= newIn.getTime()) {
      newOut = new Date(newOut.getTime() + 24 * 3600 * 1000); // 자정 넘김(야간 근무)
    }
    if (newOut.getTime() - newIn.getTime() > 24 * 3600 * 1000) {
      return { error: '근무 시간이 24시간을 넘을 수 없습니다.' };
    }
  }

  // work_minutes는 generated column — check_in/out만 갱신하면 자동 재계산된다
  const { error } = await admin
    .from('attendances')
    .update({
      check_in_at: newIn.toISOString(),
      check_out_at: newOut ? newOut.toISOString() : null,
    })
    .eq('id', row.id);
  if (error) return { error: error.message };

  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  revalidatePath('/employees');
  revalidatePath('/employees/payroll');
  revalidatePath('/employee/me');
  return { ok: true };
}
