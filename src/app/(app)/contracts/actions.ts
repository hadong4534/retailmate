'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { randomBytes } from 'node:crypto';
import { validateWith, contractFormSchema, ndaFormSchema } from '@/lib/validation/schemas';

export type ContractType = 'fulltime' | 'parttime' | 'daily';
export type WageType = 'hourly' | 'monthly' | 'daily';
export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface SocialInsurance {
  national_pension: boolean;
  health_insurance: boolean;
  employment_insurance: boolean;
  industrial_accident: boolean;
}

export interface ContractFormData {
  invite_name: string;
  invite_phone: string;
  contract_type: ContractType;
  work_start_date: string;
  work_end_date: string | null;
  workplace_address: string;
  job_description: string;
  work_days: WeekDay[];
  work_start_time: string;
  work_end_time: string;
  break_minutes: number;
  wage_type: WageType;
  wage_amount: number;
  weekly_holiday_allowance: boolean;
  social_insurance: SocialInsurance;
  payroll_mode?: 'four_major' | 'freelance_3_3' | 'daily' | 'none';
  pay_day: number;
  pay_method: string;
  annual_leave_policy: string;
  additional_terms: string;
}

export interface CreateContractResult {
  contractId?: string;
  signToken?: string;
  /** null = 시간 제한 없이 유효 (사용자 정책) */
  expiresAt?: string | null;
  error?: string;
}

function validate(input: ContractFormData): string | null {
  return validateWith(contractFormSchema, input);
}

function generateSignToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createContract(
  input: ContractFormData,
  ownerSignatureDataUrl: string,
  opts?: { renewOfId?: string },
): Promise<CreateContractResult> {
  const validation = validate(input);
  if (validation) return { error: validation };
  if (!ownerSignatureDataUrl || !ownerSignatureDataUrl.startsWith('data:image/')) {
    return { error: '사장님 서명을 입력해주세요.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };
  const store = { id: adminStore.storeId };

  const invitePhoneDigits = input.invite_phone.replace(/\D/g, '');
  if (invitePhoneDigits.length !== 10 && invitePhoneDigits.length !== 11) {
    return { error: '직원 휴대폰 번호 형식이 올바르지 않습니다.' };
  }

  // 중복 활성 계약 사전 검증 (unique index가 안전망 역할도 함)
  const { data: existing } = await supabase
    .from('labor_contracts')
    .select('id, status')
    .eq('store_id', store.id)
    .eq('invite_phone', invitePhoneDigits)
    .in('status', ['sent', 'signed']);
  if (existing && existing.length > 0) {
    // 갱신 작성: 활성 계약이 "갱신 대상 1건"뿐이면 통과 —
    // 직원이 새 계약서에 서명하는 순간 기존 계약은 자동 종료된다 (sign/actions.ts 2.5단계).
    // DB 유니크 인덱스도 안전: 새 row는 employee_id=null(sent)이라 기존 signed(employee_id 보유)와 충돌하지 않음.
    const isRenewal =
      !!opts?.renewOfId && existing.every((e) => e.id === opts.renewOfId);
    if (!isRenewal) {
      return {
        error: '이 직원에게 이미 진행 중인 계약서가 있습니다. 기존 계약을 먼저 종료하거나, 계약서 목록의 "갱신" 버튼으로 작성해주세요.',
      };
    }
  }

  const signToken = generateSignToken();
  // 사용자 정책: 서명 링크는 시간 제한 없이 유효해야 한다.
  // expires_at = null → sign/page.tsx의 만료 체크가 자동으로 통과 (`if (expires_at && new Date(...) < now)`)
  const expiresAt: string | null = null;

  // 권한 검증은 위 getCurrentAdminStore로 이미 완료. RLS INSERT 정책이 owner에게도
  // 안 열려 있어 user client INSERT가 "new row violates row-level security policy"로
  // 실패하는 케이스가 있어, 검증된 매장 한정으로 admin client로 INSERT.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('labor_contracts')
    .insert({
      store_id: store.id,
      employee_id: null,
      invite_name: input.invite_name.trim(),
      invite_phone: invitePhoneDigits,
      contract_type: input.contract_type,
      work_start_date: input.work_start_date,
      work_end_date: input.work_end_date || null,
      workplace_address: input.workplace_address.trim(),
      job_description: input.job_description.trim(),
      work_days: input.work_days,
      work_start_time: input.work_start_time,
      work_end_time: input.work_end_time,
      break_minutes: input.break_minutes,
      wage_type: input.wage_type,
      wage_amount: input.wage_amount,
      weekly_holiday_allowance: input.weekly_holiday_allowance,
      social_insurance: input.social_insurance,
      payroll_mode: input.payroll_mode ?? null,
      pay_day: input.pay_day,
      pay_method: input.pay_method || '계좌이체',
      annual_leave_policy: input.annual_leave_policy || null,
      additional_terms: input.additional_terms || null,
      status: 'sent',
      sign_token: signToken,
      sign_token_expires_at: expiresAt,
      owner_signed_at: new Date().toISOString(),
      owner_signature_image: ownerSignatureDataUrl,
    })
    .select('id')
    .single();

  if (error) {
    if (/uniq_active_contract/.test(error.message)) {
      return {
        error: '이 직원에게 이미 진행 중인 계약서가 있습니다. 기존 계약을 먼저 종료해주세요.',
      };
    }
    return { error: error.message };
  }

  revalidatePath('/contracts');
  revalidatePath('/employees');

  return {
    contractId: data.id,
    signToken,
    expiresAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 계약서 발송 취소 (서명 전에만 가능)
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelContract(
  contractId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!contractId) return { error: '계약서 ID가 필요합니다.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 권한이 없습니다.' };

  // 계약서가 현재 매장 소속 + sent 상태인지 확인
  const { data: c, error: selErr } = await supabase
    .from('labor_contracts')
    .select('id, store_id, status, invite_name')
    .eq('id', contractId)
    .maybeSingle();
  if (selErr || !c) return { error: '계약서를 찾을 수 없습니다.' };
  if (c.store_id !== adminStore.storeId) {
    return { error: '이 매장의 계약서가 아닙니다.' };
  }
  if (c.status === 'signed') {
    return { error: '이미 서명된 계약서는 취소할 수 없습니다.' };
  }
  if (c.status !== 'sent' && c.status !== 'draft') {
    return { error: '취소할 수 있는 상태가 아닙니다.' };
  }

  // 상태만 cancelled로 변경. sign_token은 유지해서 직원이 옛 링크 클릭 시
  // "취소된 계약서" 안내 페이지가 정확히 노출되도록 한다.
  // (서명 액션은 status 체크로 차단 — 토큰만으로는 무력함)
  // admin client 사용 — RLS 우회로 일관 동작 보장.
  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from('labor_contracts')
    .update({
      status: 'cancelled',
    })
    .eq('id', contractId);
  if (updErr) return { error: updErr.message };

  revalidatePath('/contracts');
  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * 계약서 완전 삭제.
 *
 * 패턴:
 *   1) 권한 검증 — user client + getCurrentAdminStore (사장/매니저 확인)
 *   2) 매장 소속 확인 — user client SELECT
 *   3) 실제 DELETE — admin client (RLS 우회)
 *      → RLS 정책이 DELETE를 owner에게도 안 줘서 user client는 0건으로 조용히 실패하는 케이스 방지
 *
 * 정책:
 *   - 모든 상태(draft / sent / signed / cancelled)에서 호출 가능
 *   - Storage PDF도 best-effort 제거
 *   - 사용자 정책: "영구적으로 쌓이지 않도록"
 */
export async function deleteContract(
  contractId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!contractId) return { error: '계약서 ID가 필요합니다.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 권한이 없습니다.' };

  // 권한 검증을 admin client로 통일 — 일관된 보안 검사
  const admin = createAdminClient();
  const { data: c, error: selErr } = await admin
    .from('labor_contracts')
    .select('id, store_id, pdf_url')
    .eq('id', contractId)
    .maybeSingle();
  if (selErr || !c) return { error: '계약서를 찾을 수 없습니다.' };
  if (c.store_id !== adminStore.storeId) {
    return { error: '이 매장의 계약서가 아닙니다.' };
  }

  // 실제 삭제 — admin client (RLS 우회)
  const { error: delErr } = await admin
    .from('labor_contracts')
    .delete()
    .eq('id', contractId);
  if (delErr) return { error: delErr.message };

  // storage의 PDF는 best-effort — 실패해도 row는 이미 지워졌으므로 조용히 무시.
  if (c.pdf_url) {
    try {
      await admin.storage.from('contracts').remove([c.pdf_url]);
    } catch {
      // ignore — orphan PDF로 남지만 보안 위험 없음
    }
  }

  revalidatePath('/contracts');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// NDA (비밀유지서약서) 작성 액션
// labor_contracts 테이블을 contract_type='nda'로 재사용.
// 근로조건 필드(임금·근로시간 등)는 NDA에 무관하지만 NOT NULL이라 sensible default로 채운다.
// ─────────────────────────────────────────────────────────────────────────────

export interface NDAFormData {
  invite_name: string;
  invite_phone: string;
  effective_date: string;        // 시행일 (work_start_date에 저장)
  retention_years: number;       // 퇴직 후 비밀유지 기간 (1~10)
  extra_scope: string;           // 비밀정보 범위 추가 (선택)
}

function validateNDA(input: NDAFormData): string | null {
  return validateWith(ndaFormSchema, input);
}

export async function createNDA(
  input: NDAFormData,
  ownerSignatureDataUrl: string,
): Promise<CreateContractResult> {
  const validation = validateNDA(input);
  if (validation) return { error: validation };
  if (!ownerSignatureDataUrl || !ownerSignatureDataUrl.startsWith('data:image/')) {
    return { error: '사장님 서명을 입력해주세요.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  // 매장 정보 (workplace_address 자동 채우기용)
  const { data: store } = await supabase
    .from('stores')
    .select('id, address')
    .eq('id', adminStore.storeId)
    .single();
  if (!store) return { error: '매장을 찾을 수 없습니다.' };

  const invitePhoneDigits = input.invite_phone.replace(/\D/g, '');
  if (invitePhoneDigits.length !== 10 && invitePhoneDigits.length !== 11) {
    return { error: '직원 휴대폰 번호 형식이 올바르지 않습니다.' };
  }

  // NDA는 같은 직원에 여러 건 가능 (계약 종류가 다름) — 중복 활성 검사는 'nda'만 같은지 체크
  const { data: existing } = await supabase
    .from('labor_contracts')
    .select('id, status')
    .eq('store_id', store.id)
    .eq('invite_phone', invitePhoneDigits)
    .eq('contract_type', 'nda')
    .in('status', ['sent', 'signed']);
  if (existing && existing.length > 0) {
    return {
      error: '이 직원에게 이미 진행 중인 비밀유지 서약서가 있습니다.',
    };
  }

  const signToken = generateSignToken();
  // 사용자 정책: 서명 링크는 시간 제한 없이 유효해야 한다.
  // expires_at = null → sign/page.tsx의 만료 체크가 자동으로 통과 (`if (expires_at && new Date(...) < now)`)
  const expiresAt: string | null = null;

  // 권한 검증은 위 getCurrentAdminStore로 이미 완료. RLS INSERT 차단 우회를 위해 admin client 사용.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('labor_contracts')
    .insert({
      store_id: store.id,
      employee_id: null,
      invite_name: input.invite_name.trim(),
      invite_phone: invitePhoneDigits,
      contract_type: 'nda',
      work_start_date: input.effective_date,
      work_end_date: null,
      workplace_address: store.address,            // 매장 주소 자동
      job_description: '비밀유지 서약',              // 고정값
      work_days: [],                                // 빈 배열
      work_start_time: '00:00:00',                  // 더미
      work_end_time: '00:00:00',                    // 더미
      break_minutes: 0,
      wage_type: 'monthly',                         // 더미
      wage_amount: 0,                               // NDA는 임금 무관
      weekly_holiday_allowance: false,
      social_insurance: {
        national_pension: false,
        health_insurance: false,
        employment_insurance: false,
        industrial_accident: false,
      },
      pay_day: 1,
      pay_method: null,
      annual_leave_policy: null,
      additional_terms: null,
      nda_retention_years: input.retention_years,
      nda_info_scope: input.extra_scope.trim() || null,
      status: 'sent',
      sign_token: signToken,
      sign_token_expires_at: expiresAt,
      owner_signed_at: new Date().toISOString(),
      owner_signature_image: ownerSignatureDataUrl,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contracts');

  return {
    contractId: data.id,
    signToken,
    expiresAt,
  };
}
