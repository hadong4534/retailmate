'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';

type Result = { ok: true } | { error: string };

export async function updateStoreInfo(input: {
  name: string;
  business_no: string;
  business_name: string;
  industry: string;
  address: string;
  postcode: string;
  detail_address: string;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  open_time: string;
  close_time: string;
  vat_type: string;
  monthly_target: number;
}): Promise<Result> {
  if (!input.name.trim()) return { error: '매장명을 입력해주세요.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const { error } = await supabase
    .from('stores')
    .update({
      name: input.name.trim(),
      business_no: input.business_no || null,
      business_name: input.business_name || null,
      industry: input.industry || null,
      address: input.address.trim(),
      postcode: input.postcode || null,
      detail_address: input.detail_address || null,
      lat: input.lat,
      lng: input.lng,
      radius_m: input.radius_m,
      open_time: input.open_time || null,
      close_time: input.close_time || null,
      vat_type: input.vat_type || null,
      monthly_target: input.monthly_target ?? 0,
    })
    .eq('id', adminStore.storeId);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function updateWageSettings(input: {
  wage_calc_mode: 'hourly' | 'monthly';
  weekly_holiday_default: boolean;
  pay_day_default: number;
  tax_filing_mode: 'simple' | 'general';
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const { error } = await supabase
    .from('stores')
    .update({
      wage_calc_mode: input.wage_calc_mode,
      weekly_holiday_default: input.weekly_holiday_default,
      pay_day_default: input.pay_day_default,
      tax_filing_mode: input.tax_filing_mode,
    })
    .eq('id', adminStore.storeId);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}

export async function updateNotificationPrefs(input: {
  expense_alert: boolean;
  attendance_alert: boolean;
  notice_alert: boolean;
  important_alert: boolean;
  briefing_alert: boolean;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('user_notification_prefs')
    .upsert(
      {
        user_id: user.id,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}

/**
 * 프로필 (이름·전화) 수정.
 * 휴대폰은 normalize_phone 함수가 DB trigger에서 처리됨.
 */
export async function updateProfile(input: {
  name: string;
  phone: string;
}): Promise<Result> {
  const trimmed = input.name.trim();
  if (!trimmed) return { error: '이름을 입력해주세요.' };
  if (trimmed.length > 30) return { error: '이름은 30자 이내여야 합니다.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      name: trimmed,
      phone: input.phone.trim() || null,
    })
    .eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * 프로필 사진 업로드 — base64 dataURL 받아서 storage에 저장 후 path 갱신.
 * 경로: avatars/{user_id}/{timestamp}.png
 */
export async function uploadAvatar(input: { dataUrl: string }): Promise<Result & { path?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const m = input.dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
  if (!m) return { error: '이미지 형식이 올바르지 않습니다.' };
  const ext = m[1].replace('jpeg', 'jpg');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > 5 * 1024 * 1024) {
    return { error: '5MB 이하의 이미지만 업로드 가능합니다.' };
  }

  const admin = createAdminClient();
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: upErr } = await admin.storage
    .from('avatars')
    .upload(path, bytes, {
      contentType: `image/${ext}`,
      upsert: true,
    });
  if (upErr) return { error: upErr.message };

  // 기존 사진 path가 있으면 → 새 사진 업데이트하면서 자동 대체.
  // 이전 파일은 사용자 폴더 안에서 자동 청소 (간단화 — 누적되는 건 추후 정리)
  const { error: profErr } = await admin
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', user.id);
  if (profErr) return { error: profErr.message };

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/ai/chat');
  revalidatePath('/employee/me');
  return { ok: true, path };
}

/**
 * 프로필 사진 제거.
 */
export async function removeAvatar(): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const admin = createAdminClient();

  // 현재 path 확인
  const { data: profile } = await admin
    .from('profiles')
    .select('avatar_path')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.avatar_path) {
    await admin.storage.from('avatars').remove([profile.avatar_path]);
  }

  const { error } = await admin
    .from('profiles')
    .update({ avatar_path: null })
    .eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/employee/me');
  return { ok: true };
}

/**
 * 비밀번호 변경 — 현재 비밀번호 검증 후 변경.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<Result> {
  if (input.newPassword.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다.' };
  }
  if (input.currentPassword === input.newPassword) {
    return { error: '새 비밀번호가 기존과 같습니다.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: '로그인이 필요합니다.' };

  // 현재 비밀번호 검증 = signInWithPassword 재시도
  const { error: signinErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });
  if (signinErr) {
    return { error: '현재 비밀번호가 올바르지 않습니다.' };
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });
  if (error) return { error: error.message };

  return { ok: true };
}

/**
 * 회원 탈퇴 — 본인 계정 + 데이터 완전 삭제.
 * DB의 delete_my_account() 함수(원자적, owner-가드 포함)를 호출한 뒤 로그아웃.
 */
export async function deleteMyAccount(): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { error: error.message };

  await supabase.auth.signOut().catch(() => undefined);
  return { ok: true };
}
