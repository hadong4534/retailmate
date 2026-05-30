'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';

type RoleResult = { ok: true } | { error: string };

/**
 * 안전 가드: 호출자가 현재 매장의 owner/manager이고
 * 대상 store_member가 같은 매장 소속인지 확인한다.
 * 통과 시 { store, target } 반환, 실패 시 { error }.
 */
async function authorize(memberId: string): Promise<
  | { store: { storeId: string }; target: { user_id: string; store_id: string; role: string } }
  | { error: string }
> {
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

  return { store: { storeId: store.storeId }, target };
}

export async function updateMemberWage(
  memberId: string,
  hourlyWage: number,
): Promise<RoleResult> {
  if (hourlyWage < 0 || hourlyWage > 1_000_000) {
    return { error: '시급이 올바르지 않습니다.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('store_members')
    .update({ hourly_wage: hourlyWage })
    .eq('id', memberId);
  if (error) return { error: error.message };

  revalidatePath('/employees');
  return { ok: true };
}

export async function promoteToManager(memberId: string): Promise<RoleResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('store_members')
    .update({ role: 'manager' })
    .eq('id', memberId);
  if (error) return { error: error.message };

  revalidatePath('/employees');
  return { ok: true };
}

export async function demoteToEmployee(memberId: string): Promise<RoleResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  // 자기 자신 강등 방지
  const { data: target } = await supabase
    .from('store_members')
    .select('user_id')
    .eq('id', memberId)
    .maybeSingle();
  if (target?.user_id === user.id) {
    return { error: '본인을 강등할 수 없습니다.' };
  }

  const { error } = await supabase
    .from('store_members')
    .update({ role: 'employee' })
    .eq('id', memberId);
  if (error) return { error: error.message };

  revalidatePath('/employees');
  return { ok: true };
}

/* ───────────────────── 신규 액션 ─────────────────────
   사장님이 직원의 이름·연락처를 직접 수정하고, 퇴사/복직 처리를 할 수 있게 한다.
   본인(owner)은 자기 자신을 퇴사 처리할 수 없도록 가드. */

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

  // profiles.email은 NOT NULL 제약. upsert로 신규 row 생성될 가능성에 대비해
  // auth.users에서 email을 미리 가져와 함께 넣는다.
  // (row가 이미 있으면 onConflict로 update만 되므로 email은 그대로 유지)
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

  revalidatePath('/employees');
  revalidatePath('/attendance');
  revalidatePath('/contracts');
  return { ok: true };
}

/**
 * 직원 퇴사 = store_members row 완전 삭제.
 *
 * 정책: 사용자 요청에 따라 hard delete.
 *  - 직원 목록에서 즉시 제거됨
 *  - 출퇴근(attendances)·계약서(labor_contracts) 등 user_id로 연결된 히스토리는 그대로 보존
 *    (FK가 store_members.id가 아닌 auth.users.id를 가리키므로 영향 없음)
 *  - 복직 시에는 새 근로계약서를 작성해야 store_members가 다시 생성됨
 *
 * 가드:
 *  - 본인 퇴사 금지
 *  - owner 퇴사 금지 (매장 소유자는 별도 매장 양도 흐름 필요)
 */
export async function resignMember(memberId: string): Promise<RoleResult> {
  const auth = await authorize(memberId);
  if ('error' in auth) return auth;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (auth.target.user_id === user?.id) {
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

  revalidatePath('/employees');
  revalidatePath('/attendance');
  revalidatePath('/employees/payroll');
  return { ok: true };
}
