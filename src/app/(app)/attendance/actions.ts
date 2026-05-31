'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore, getUserStoreContexts } from '@/lib/auth/store-context';

type Result =
  | { ok: true; attendanceId: string; distanceM: number }
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
export async function gpsCheckIn(input: { lat: number; lng: number }): Promise<Result> {
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

  if (dist > radius) {
    return {
      error: `매장 반경 ${radius}m 밖입니다 (현재 ${dist}m). 매장 가까이에서 다시 시도해주세요.`,
      distanceM: dist,
    };
  }

  // 오늘 이미 미완료 출근 row가 있으면 차단
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
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
  return { ok: true, attendanceId: row.id, distanceM: dist };
}

/**
 * GPS 퇴근 — 가장 최근 미완료 출근 row를 업데이트.
 */
export async function gpsCheckOut(input: { lat: number; lng: number }): Promise<Result> {
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
    return { error: '매장 GPS 좌표가 설정되지 않았습니다.' };
  }

  const radius = store.radius_m ?? 100;
  const dist = distanceMeters(input.lat, input.lng, Number(store.lat), Number(store.lng));

  if (dist > radius) {
    return {
      error: `매장 반경 ${radius}m 밖입니다 (현재 ${dist}m). 매장 가까이에서 다시 시도해주세요.`,
      distanceM: dist,
    };
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
  return { ok: true, attendanceId: openRow.id, distanceM: dist };
}
