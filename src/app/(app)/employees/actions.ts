'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { logAudit } from '@/lib/audit/log';

type RoleResult = { ok: true } | { error: string };

type AuthOk = {
  actorId: string;
  callerRole: string; // 'owner' | 'manager'
  store: { storeId: string };
  target: { user_id: string; store_id: string; role: string };
};

/**
 * 안전 가드: 호출자가 현재 매장의 owner/manager이고
 * 대상 store_member가 같은 매장 소속인지 확인한다.
 */
async function authorize(memberId: string): Promise<AuthOk | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const store = await getCurrentAdminStore(supabase, user.id);
  if (!store) return { error: '관리자 권한이 없습니다.' };

  const { data: target } = await supabase
    .from('store_members')
    .select('user_id, store_id, role')
    .eq('id', memberId)
    .maybeSingle();
  if (!target) return { error: '직원을 찾을 수 없습니다.' };
  if (target.store_id !== store.storeId) return { error: '다른 매장의 직원입니다.' };

  return { actorId: user.id, callerRole: store.role, store: { storeId: store.storeId }, target };
}

export async function updateMemberWage(
  memberId: string,
  hourlyWage: number,
): Promise<RoleResult> {
  if (hourlyWage < 0 || hourlyWage > 1_000_000) {
    return { error: '시급이 올바르지 않습니다.' };
  }
  const auth = await authorize(memberId);
  if ('error' in auth) return auth;

  const admin = createAdminClient();
  const { error } = await admin
    .from('store_members')
    .update({ hourly_wage: hourlyWage })
    .eq('id', memberId);
  if (error) return { error: error.message };

  void logAudit({
    storeId: auth.store.storeId, actorId: auth.actorId, actorRole: auth.callerRole,
    action: 'member.wage_update', targetType: 'store_member', targetId: memberId,
    summary: `시급을 ${hourlyWage.toLocaleString('ko-KR')}원으로 변경`, metadata: { hourlyWage },
  });

  revalidatePath('/employees');
  revalidatePath('/employees/payroll');
  return { ok: true };
}

/** 매니저 임명 — 사장(owner) 전용. */
export async function promoteToManager(memberId: string): Promise<RoleResult> {
  const auth = await authorize(memberId);
  if ('error' in auth) return auth;
  if (auth.callerRole !== 'owner') {
    return { error: '매니저 임명은 사장님만 할 수 있습니다.' };
  }
  if (auth.target.role === 'owner') {
    return { error: '사장님 계정은 변경할 수 없습니다.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('store_members')
    .update({ role: 'manager' })
    .eq('id', memberId);
  if (error) return { error: error.message };

  void logAudit({
    storeId: auth.store.storeId, actorId: auth.actorId, actorRole: auth.callerRole,
    action: 'member.promote_manager', targetType: 'store_member', targetId: memberId,
    summary: '직원을 매니저로 임명', metadata: { targetUserId: auth.target.user_id },
  });

  revalidatePath('/employees');
  return { ok: true };
}

/** 매니저 해제 — 사장(owner) 전용. */
export async function demoteToEmployee(memberId: string): Promise<RoleResult> {
  const auth = await authorize(memberId);
  if ('error' in auth) return auth;
  if (auth.callerRole !== 'owner') {
    return { error: '매니저 해제는 사장님만 할 수 있습니다.' };
  }
  if (auth.target.user_id === auth.actorId) {
    return { error: '본인을 강등할 수 없습니다.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('store_members')
    .update({ role: 'employee' })
    .eq('id', memberId);
  if (error) return { error: error.message };

  void logAudit({
    storeId: auth.store.storeId, actorId: auth.actorId, actorRole: auth.callerRole,
    action: 'member.demote_employee', targetType: 'store_member', targetId: memberId,
    summary: '매니저를 직원으로 변경', metadata: { targetUserId: auth.target.user_id },
  });

  revalidatePath('/employees');
  return { ok: true };
}

/** 직원 프로필(name, phone) 편집 — admin client로 RLS 우회. 같은 매장 멤버만 가능. */
export async function updateMemberProfile(
  memberId: string,
  patch: { name?: string; phone?: string | null },
): Promise<RoleResult> {
  const auth = await authorize(memberId);
  if ('error' in auth) return auth;

  const name = patch.name?.trim();
  const phone = patch.phone?.trim() || null;

  if (name !== undefined && (name.length < 1 || name.length > 30)) {
    return { error: '이름은 1~30자로 입력해주세요.' };
  }
  if (phone && !/^[0-9\-+\s]{6,20}$/.test(phone)) {
    return { error: '연락처 형식이 올바르지 않습니다.' };
  }

  const update: Record<string, string | null> = {};
  if (name !== undefined) update.name = name;
  if (patch.phone !== undefined) update.phone = phone;

  if (Object.keys(update).length === 0) {
    return { error: '변경할 항목이 없습니다.' };
  }

  const admin = createAdminClient();

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(auth.target.user_id);
  if (authErr || !authData?.user) {
    return { error: '사용자 정보를 찾을 수 없습니다.' };
  }
  const payload: Record<string, string | null> = {
    id: auth.target.user_id,
    email: authData.user.email ?? `unknown_${auth.target.user_id}@retailmate.local`,
    ...update,
  };

  const { error } = await admin
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });
  if (error) return { error: error.message };

  void logAudit({
    storeId: auth.store.storeId, actorId: auth.actorId, actorRole: auth.callerRole,
    action: 'member.profile_update', targetType: 'store_member', targetId: memberId,
    summary: '직원 프로필(이름/연락처) 수정', metadata: update,
  });

  revalidatePath('/employees');
  revalidatePath('/attendance');
  revalidatePath('/contracts');
  return { ok: true };
}

/**
 * 직원 퇴사 = store_members row 완전 삭제 (히스토리는 user_id 기준 보존).
 * 가드: 본인·owner 삭제 금지.
 */
export async function resignMember(memberId: string): Promise<RoleResult> {
  const auth = await authorize(memberId);
  if ('error' in auth) return auth;

  if (auth.target.user_id === auth.actorId) {
    return { error: '본인은 삭제할 수 없습니다.' };
  }
  if (auth.target.role === 'owner') {
    return { error: '사장님(매장 소유자)은 삭제할 수 없습니다.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('store_members')
    .delete()
    .eq('id', memberId);
  if (error) return { error: error.message };

  void logAudit({
    storeId: auth.store.storeId, actorId: auth.actorId, actorRole: auth.callerRole,
    action: 'member.resign', targetType: 'store_member', targetId: memberId,
    summary: '직원 퇴사 처리(목록에서 제거)', metadata: { targetUserId: auth.target.user_id, targetRole: auth.target.role },
  });

  revalidatePath('/employees');
  revalidatePath('/attendance');
  revalidatePath('/employees/payroll');
  return { ok: true };
}
