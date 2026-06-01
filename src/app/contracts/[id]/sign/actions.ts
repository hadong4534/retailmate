'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateContractPDF } from '@/lib/contract/pdf-generator';
import type { LaborContract, Profile, Store } from '@/types/database';

export interface SubmitSignatureInput {
  token: string;
  signatureDataUrl: string;
  consents: {
    terms: boolean;
    privacy: boolean;
    gps_location: boolean;
  };
}

interface ConsentLogInsert {
  user_id: string;
  consent_type: 'terms' | 'privacy' | 'gps_location';
  agreed: boolean;
  ip: string | null;
  user_agent: string | null;
  version: string;
}

export async function submitEmployeeSignature(
  input: SubmitSignatureInput,
): Promise<{ ok: true; contractId: string } | { error: string }> {
  if (!input.consents.terms || !input.consents.privacy) {
    return { error: '필수 약관에 동의해주세요.' };
  }
  if (!input.signatureDataUrl?.startsWith('data:image/')) {
    return { error: '서명을 입력해주세요.' };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    null;
  const userAgent = hdrs.get('user-agent') || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const admin = createAdminClient();

  const { data: contract, error: fetchErr } = await admin
    .from('labor_contracts')
    .select('id, store_id, status, sign_token_expires_at, invite_name, invite_phone, wage_type, wage_amount, contract_type, work_start_date, work_end_date')
    .eq('sign_token', input.token)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };
  if (!contract) return { error: '유효하지 않은 서명 링크입니다.' };
  if (contract.status === 'signed') return { error: '이미 서명이 완료된 계약입니다.' };
  if (contract.status === 'cancelled') return { error: '취소된 계약입니다. 사장님께 새 계약서를 요청해주세요.' };
  if (
    contract.sign_token_expires_at &&
    new Date(contract.sign_token_expires_at) < new Date()
  ) {
    return { error: '서명 링크가 만료되었습니다. 사장님께 재발급을 요청해주세요.' };
  }

  const now = new Date().toISOString();

  // 0) 사장/매니저 본인은 자기 계약서에 서명할 수 없음 (자기 매장의 직원이 될 수 없음).
  //    이 가드가 없으면 아래 upsert에서 owner role이 employee로 강등되어
  //    직원관리 페이지에 사장이 직원으로 노출됨.
  const { data: existingMember } = await admin
    .from('store_members')
    .select('role')
    .eq('store_id', contract.store_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingMember && (existingMember.role === 'owner' || existingMember.role === 'manager')) {
    return {
      error:
        '사장 또는 매니저는 본인 매장의 근로계약서에 직접 서명할 수 없습니다. 직원 본인 계정으로 로그인해주세요.',
    };
  }

  // 1) 직원 등록 (store_members upsert)
  //    계약서의 wage_type/wage_amount를 store_members의 hourly/monthly/daily_wage로 매핑한다.
  //    이렇게 해야 사장님 대시보드/직원 페이지의 "이번 달 인건비 예상"이 자동 계산됨.
  type WageColumn = 'hourly_wage' | 'monthly_wage' | 'daily_wage';
  const wageColumnMap: Record<string, WageColumn | null> = {
    hourly: 'hourly_wage',
    monthly: 'monthly_wage',
    daily: 'daily_wage',
  };
  const wageColumn = wageColumnMap[contract.wage_type] ?? null;

  const memberPayload: Record<string, string | number | boolean | null> = {
    store_id: contract.store_id,
    user_id: user.id,
    role: 'employee',
    is_active: true,
    gps_consent_at: input.consents.gps_location ? now : null,
    privacy_consent_at: input.consents.privacy ? now : null,
    // ⚠ hire_date는 계약서의 근로 시작일을 사용.
    //    이전엔 서명일(`now.slice(0, 10)`)을 썼는데, 사용자 정책상 재직 기간은
    //    "계약서에 명시된 근로 기간"이 기준이어야 함. 직원관리 페이지의 재직 기간 표시도
    //    이 값을 따라가게 됨. (백필이 어려운 기존 row는 page.tsx 표시단에서 contract.work_start_date를 우선 사용해 보정.)
    hire_date: contract.work_start_date,
    // 계약 종료일이 있으면 그대로 옮겨 만료 추적
    resign_date: null,
  };
  // 계약 wage_amount > 0 일 때만 해당 컬럼에 세팅 (0이면 기존 값 보존을 위해 미설정)
  if (wageColumn && contract.wage_amount > 0) {
    memberPayload[wageColumn] = contract.wage_amount;
  }

  // 신규 직원만 급여 처리방식 기본값 세팅 (정규직→4대보험, 그 외→미적용).
  // 기존 직원이면 사장님이 설정한 처리방식을 보존하기 위해 건드리지 않는다.
  if (!existingMember) {
    memberPayload.payroll_mode = contract.contract_type === 'fulltime' ? 'four_major' : 'none';
  }

  const { error: memberErr } = await admin
    .from('store_members')
    .upsert(memberPayload, { onConflict: 'store_id,user_id' });
  if (memberErr) return { error: memberErr.message };

  // 1.5) 직원 profile에 이름/전화가 비어있으면 계약서의 invite_name/invite_phone으로 백필.
  //      회원가입 → 계약 서명 사이에 이름/전화가 다른 경로(카카오 OAuth nickname 등)로 누락될 수 있어
  //      직원관리 페이지에 "이름 미입력"으로 표시되는 문제를 막는다.
  //      이미 채워진 값은 절대 덮지 않는다 (직원이 의도적으로 설정한 이름 보호).
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('name, phone')
    .eq('id', user.id)
    .maybeSingle();
  const profilePatch: Record<string, string> = {};
  if (contract.invite_name && (!existingProfile?.name || existingProfile.name.trim() === '')) {
    profilePatch.name = contract.invite_name;
  }
  if (contract.invite_phone && (!existingProfile?.phone || existingProfile.phone.trim() === '')) {
    profilePatch.phone = contract.invite_phone;
  }
  if (Object.keys(profilePatch).length > 0) {
    // upsert로 안전하게 — profiles trigger가 미생성 케이스도 커버.
    await admin.from('profiles').upsert({ id: user.id, ...profilePatch });
  }

  // 2) 동의 이력 기록
  const consentRows: ConsentLogInsert[] = [
    {
      user_id: user.id,
      consent_type: 'terms',
      agreed: input.consents.terms,
      ip,
      user_agent: userAgent,
      version: 'v1.0',
    },
    {
      user_id: user.id,
      consent_type: 'privacy',
      agreed: input.consents.privacy,
      ip,
      user_agent: userAgent,
      version: 'v1.0',
    },
    {
      user_id: user.id,
      consent_type: 'gps_location',
      agreed: input.consents.gps_location,
      ip,
      user_agent: userAgent,
      version: 'v1.0',
    },
  ];
  const { error: consentErr } = await admin.from('consent_logs').insert(consentRows);
  if (consentErr) return { error: consentErr.message };

  // 3) 계약 업데이트: 서명 처리
  // 사용자 정책: 서명 완료 후에도 sign_token은 유지한다.
  // 이유: 직원이 SMS 링크를 다시 열어도 page.tsx의 isSigned 분기가 "이미 서명 완료" 카드를 보여주려면
  //       토큰으로 contract row를 조회할 수 있어야 한다. 토큰을 null로 비우면 조회가 실패해서
  //       "유효하지 않은 링크"로 잘못 안내됨.
  // 중복 서명은 위 line 59의 status === 'signed' 가드로 이미 차단되어 있어 보안상 안전.
  const { error: updateErr } = await admin
    .from('labor_contracts')
    .update({
      employee_id: user.id,
      employee_signature_image: input.signatureDataUrl,
      employee_signed_at: now,
      employee_signed_ip: ip,
      employee_signed_user_agent: userAgent,
      status: 'signed',
    })
    .eq('id', contract.id);
  if (updateErr) return { error: updateErr.message };

  // 4) PDF 생성 + Storage 업로드 (실패해도 서명은 유지)
  try {
    const { data: fullContract } = await admin
      .from('labor_contracts')
      .select('*')
      .eq('id', contract.id)
      .maybeSingle<LaborContract>();
    const { data: store } = await admin
      .from('stores')
      .select('*')
      .eq('id', contract.store_id)
      .maybeSingle<Store>();
    if (!fullContract || !store) throw new Error('PDF용 데이터 조회 실패');

    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', store.owner_id)
      .maybeSingle<Profile>();
    const { data: empProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle<Profile>();
    if (!ownerProfile || !empProfile) throw new Error('PDF용 프로필 조회 실패');

    const pdfBytes = await generateContractPDF({
      contract: fullContract,
      store,
      owner: ownerProfile,
      employee: empProfile,
    });

    const path = `${store.id}/${contract.id}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from('contracts')
      .upload(path, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadErr) throw uploadErr;

    await admin
      .from('labor_contracts')
      .update({ pdf_url: path })
      .eq('id', contract.id);
  } catch (e) {
    console.error('PDF 생성/업로드 실패:', e);
  }

  revalidatePath('/contracts');
  revalidatePath('/employees');

  return { ok: true, contractId: contract.id };
}

/**
 * 기존 서명 완료 계약에 대해 PDF가 누락된 경우 재생성.
 * /contracts/[id]/view에서 "PDF 다운로드" 버튼이 클릭됐을 때 fallback.
 */
export async function regeneratePDF(
  contractId: string,
): Promise<{ ok: true; path: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const admin = createAdminClient();
  const { data: fullContract } = await admin
    .from('labor_contracts')
    .select('*')
    .eq('id', contractId)
    .maybeSingle<LaborContract>();
  if (!fullContract) return { error: '계약서를 찾을 수 없습니다.' };
  if (fullContract.status !== 'signed') return { error: '서명 완료된 계약만 PDF 생성 가능합니다.' };

  // 권한 검증: 사장 또는 본인 직원
  const { data: store } = await admin
    .from('stores')
    .select('*')
    .eq('id', fullContract.store_id)
    .maybeSingle<Store>();
  if (!store) return { error: '매장 정보를 찾을 수 없습니다.' };
  if (store.owner_id !== user.id && fullContract.employee_id !== user.id) {
    return { error: '권한이 없습니다.' };
  }

  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', store.owner_id)
    .maybeSingle<Profile>();
  const { data: empProfile } = fullContract.employee_id
    ? await admin
        .from('profiles')
        .select('*')
        .eq('id', fullContract.employee_id)
        .maybeSingle<Profile>()
    : { data: null };
  if (!ownerProfile || !empProfile) return { error: '프로필 조회 실패' };

  try {
    const pdfBytes = await generateContractPDF({
      contract: fullContract,
      store,
      owner: ownerProfile,
      employee: empProfile,
    });
    const path = `${store.id}/${contractId}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from('contracts')
      .upload(path, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadErr) return { error: uploadErr.message };

    await admin
      .from('labor_contracts')
      .update({ pdf_url: path })
      .eq('id', contractId);

    return { ok: true, path };
  } catch (e) {
    return { error: (e as Error).message ?? 'PDF 생성 실패' };
  }
}
