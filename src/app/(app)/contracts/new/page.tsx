import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { todayInKST } from '@/lib/utils';
import { ContractWizard } from './Wizard';
import type { ContractFormData, ContractType, WageType, WeekDay, SocialInsurance } from '../actions';

export const metadata = {
  title: '근로계약서 작성 · 리테일메이트',
};

const VALID_TYPES: ContractType[] = ['fulltime', 'parttime', 'daily'];

/** 저장된 숫자 전화번호 → 하이픈 표기 (프리필 표시용) */
function formatPhoneForDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) {
    return d.startsWith('02')
      ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
      : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return raw;
}

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; renew?: string }>;
}) {
  const { type: typeParam, renew: renewParam } = await searchParams;
  const initialType: ContractType | undefined =
    typeParam && VALID_TYPES.includes(typeParam as ContractType)
      ? (typeParam as ContractType)
      : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, detail_address')
    .eq('id', adminStore.storeId)
    .maybeSingle();
  if (!store) return null;

  const defaultAddress = [store.address, store.detail_address].filter(Boolean).join(' ');

  // ── 갱신 모드: 기존 서명 계약을 불러와 동일 내용으로 프리필 ──
  // 보안: 반드시 현재 매장(store.id) 소속 + signed + NDA 아님 조건을 서버에서 검증.
  let initialData: Partial<ContractFormData> | undefined;
  let renewOfId: string | undefined;
  let renewName: string | null = null;
  if (renewParam) {
    const { data: src } = await supabase
      .from('labor_contracts')
      .select('id, status, contract_type, invite_name, invite_phone, work_end_date, workplace_address, job_description, work_days, work_start_time, work_end_time, break_minutes, wage_type, wage_amount, weekly_holiday_allowance, social_insurance, pay_day, pay_method, annual_leave_policy, additional_terms, payroll_mode')
      .eq('id', renewParam)
      .eq('store_id', store.id)
      .maybeSingle();
    if (src && src.status === 'signed' && src.contract_type !== 'nda') {
      const today = todayInKST();
      // 새 시작일: 기존 종료일 다음 날 (이미 지났으면 오늘)
      let startDate = today;
      if (src.work_end_date) {
        const next = new Date(`${src.work_end_date}T00:00:00Z`);
        next.setUTCDate(next.getUTCDate() + 1);
        const nextStr = next.toISOString().slice(0, 10);
        if (nextStr > today) startDate = nextStr;
      }
      renewOfId = src.id as string;
      renewName = (src.invite_name as string | null) ?? null;
      initialData = {
        invite_name: (src.invite_name as string | null) ?? '',
        invite_phone: formatPhoneForDisplay((src.invite_phone as string | null) ?? ''),
        contract_type: src.contract_type as ContractType,
        work_start_date: startDate,
        work_end_date: null, // 종료일은 사장님이 새로 지정 (정규 전환이면 비워둠)
        workplace_address: (src.workplace_address as string | null) ?? defaultAddress,
        job_description: (src.job_description as string | null) ?? '',
        work_days: ((src.work_days as string[] | null) ?? []) as WeekDay[],
        work_start_time: String(src.work_start_time ?? '09:00').slice(0, 5),
        work_end_time: String(src.work_end_time ?? '18:00').slice(0, 5),
        break_minutes: (src.break_minutes as number | null) ?? 60,
        wage_type: src.wage_type as WageType,
        wage_amount: (src.wage_amount as number | null) ?? 0,
        weekly_holiday_allowance: !!src.weekly_holiday_allowance,
        pay_day: (src.pay_day as number | null) ?? 10,
        pay_method: (src.pay_method as string | null) ?? '계좌이체',
        annual_leave_policy: (src.annual_leave_policy as string | null) ?? '',
        additional_terms: (src.additional_terms as string | null) ?? '',
      };
      if (src.social_insurance) {
        initialData.social_insurance = src.social_insurance as SocialInsurance;
      }
      if (src.payroll_mode) {
        initialData.payroll_mode = src.payroll_mode as ContractFormData['payroll_mode'];
      }
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/contracts"
            className="text-sm text-slate-500 hover:text-slate-700"
            aria-label="뒤로"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">근로계약서 작성</h1>
        </div>

        {renewOfId && (
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[13px] leading-relaxed text-indigo-900">
            <b>{renewName ?? '직원'}</b>님의 <b>계약 갱신</b>을 작성하고 있어요. 기존 계약 내용이
            미리 채워져 있으니 바뀌는 항목(시급·기간 등)만 수정하세요. 직원이 새 계약서에
            서명하는 순간 이전 계약은 자동으로 종료 처리됩니다.
          </div>
        )}
        <ContractWizard
          defaultWorkplaceAddress={defaultAddress}
          initialContractType={initialType}
          initialData={initialData}
          renewOfId={renewOfId}
        />
      </div>
    </div>
  );
}
