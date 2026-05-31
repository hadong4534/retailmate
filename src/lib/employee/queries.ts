import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateNetPay,
  ZERO_BREAKDOWN,
  type InsuranceBreakdown,
  type SocialInsuranceFlags,
} from '@/lib/payroll/insurance';

interface ContractDetail {
  id: string;
  contract_type: 'fulltime' | 'parttime' | 'daily';
  status: 'draft' | 'sent' | 'signed' | 'terminated';
  work_start_date: string;
  work_end_date: string | null;
  wage_type: 'hourly' | 'monthly' | 'daily';
  wage_amount: number;
  work_start_time: string;
  work_end_time: string;
  work_days: string[];
  pay_day: number;
  pay_method: string | null;
  weekly_holiday_allowance: boolean;
  social_insurance: SocialInsuranceFlags;
}

export interface EmployeeStoreSummary {
  storeId: string;
  storeName: string;
  contract: ContractDetail | null;
  monthly: {
    workMinutes: number;
    workDays: number;
    grossPay: number;
    insurance: InsuranceBreakdown;
    netPay: number;
  };
}

export interface EmployeeOverview {
  storeSummaries: EmployeeStoreSummary[];
  totalGrossPay: number;
  totalInsurance: number;
  totalNetPay: number;
  totalWorkMinutes: number;
}

function startOfThisMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function endOfThisMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

/**
 * 직원 본인이 소속된 모든 매장의 이번 달 요약 (계약·근무·예상 급여).
 * - signed 계약 우선, 없으면 sent 가장 최근
 * - work_minutes 합산 (attendances)
 * - 시급: 시간 × 단가
 * - 월급: 그대로
 * - 일급: 출근일수 × 단가
 */
export async function getEmployeeOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<EmployeeOverview> {
  // 1) 본인 멤버 매장
  const { data: members } = await supabase
    .from('store_members')
    .select('store_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  const storeIds = (members ?? []).map((m) => m.store_id);

  if (storeIds.length === 0) {
    return {
      storeSummaries: [],
      totalGrossPay: 0,
      totalInsurance: 0,
      totalNetPay: 0,
      totalWorkMinutes: 0,
    };
  }

  // 2) 매장 이름
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .in('id', storeIds);
  const storeNameMap = new Map(
    (stores ?? []).map((s) => [s.id as string, s.name as string]),
  );

  // 3) 본인 계약서 (RLS로 자동 필터)
  const { data: contracts } = await supabase
    .from('labor_contracts')
    .select(
      'id, store_id, contract_type, status, work_start_date, work_end_date, wage_type, wage_amount, work_start_time, work_end_time, work_days, pay_day, pay_method, weekly_holiday_allowance, social_insurance',
    )
    .eq('employee_id', userId)
    .in('status', ['sent', 'signed', 'terminated'])
    .order('created_at', { ascending: false });

  const contractByStore = new Map<string, ContractDetail>();
  (contracts ?? []).forEach((raw) => {
    const c = raw as unknown as ContractDetail & { store_id: string };
    const existing = contractByStore.get(c.store_id);
    if (!existing || (existing.status !== 'signed' && c.status === 'signed')) {
      contractByStore.set(c.store_id, c);
    }
  });

  // 4) 이번 달 attendances (RLS로 자동 필터)
  const monthStart = startOfThisMonthIso();
  const monthEnd = endOfThisMonthIso();
  const { data: atts } = await supabase
    .from('attendances')
    .select('store_id, check_in_at, work_minutes')
    .eq('user_id', userId)
    .gte('check_in_at', monthStart)
    .lt('check_in_at', monthEnd);

  const monthlyByStore = new Map<string, { minutes: number; days: Set<string> }>();
  (atts ?? []).forEach((a) => {
    if (!monthlyByStore.has(a.store_id)) {
      monthlyByStore.set(a.store_id, { minutes: 0, days: new Set() });
    }
    const agg = monthlyByStore.get(a.store_id)!;
    agg.minutes += Number(a.work_minutes ?? 0);
    agg.days.add(String(a.check_in_at).slice(0, 10));
  });

  // 5) 매장별 요약 조립
  const summaries: EmployeeStoreSummary[] = storeIds.map((storeId) => {
    const contract = contractByStore.get(storeId) ?? null;
    const agg = monthlyByStore.get(storeId);
    const workMinutes = agg?.minutes ?? 0;
    const workDays = agg?.days.size ?? 0;

    let grossPay = 0;
    let insurance: InsuranceBreakdown = ZERO_BREAKDOWN;
    let netPay = 0;

    if (contract) {
      const hours = workMinutes / 60;
      if (contract.wage_type === 'hourly') {
        grossPay = Math.round(hours * contract.wage_amount);
      } else if (contract.wage_type === 'monthly') {
        grossPay = contract.wage_amount;
      } else if (contract.wage_type === 'daily') {
        grossPay = workDays * contract.wage_amount;
      }
      const calc = calculateNetPay(grossPay, contract.contract_type, contract.social_insurance);
      insurance = calc.insurance;
      netPay = calc.net;
    }

    return {
      storeId,
      storeName: storeNameMap.get(storeId) ?? '(매장)',
      contract,
      monthly: { workMinutes, workDays, grossPay, insurance, netPay },
    };
  });

  const totalGrossPay = summaries.reduce((acc, s) => acc + s.monthly.grossPay, 0);
  const totalInsurance = summaries.reduce((acc, s) => acc + s.monthly.insurance.total, 0);
  const totalNetPay = summaries.reduce((acc, s) => acc + s.monthly.netPay, 0);
  const totalWorkMinutes = summaries.reduce((acc, s) => acc + s.monthly.workMinutes, 0);

  return {
    storeSummaries: summaries,
    totalGrossPay,
    totalInsurance,
    totalNetPay,
    totalWorkMinutes,
  };
}

export function formatHM(minutes: number): string {
  if (minutes <= 0) return '0시간';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}
