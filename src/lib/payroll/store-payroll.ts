/**
 * 매장 전체 급여 집계 — 사장님 측 `/employees/payroll` 페이지에서 사용.
 *
 * 출퇴근 기록 + 계약서 wage를 결합해 직원별 월 급여를 계산한다.
 * 4대보험 본인부담은 정규직만 차감 (insurance.ts 정책 일치).
 *
 * RLS: 호출자가 owner/manager가 아니면 결과가 빈 배열. 미들웨어/페이지에서 추가 인증 검증.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateNetPay,
  ZERO_BREAKDOWN,
  type InsuranceBreakdown,
  type SocialInsuranceFlags,
} from './insurance';

interface ContractDetail {
  id: string;
  contract_type: 'fulltime' | 'parttime' | 'daily';
  status: 'draft' | 'sent' | 'signed' | 'terminated' | 'cancelled';
  wage_type: 'hourly' | 'monthly' | 'daily';
  wage_amount: number;
  weekly_holiday_allowance: boolean;
  social_insurance: SocialInsuranceFlags;
}

export interface MemberPayrollRow {
  memberId: string;
  userId: string;
  name: string;
  phone: string | null;
  role: 'owner' | 'manager' | 'employee';
  isActive: boolean;
  contract: ContractDetail | null;
  workMinutes: number;
  workDays: number;
  grossPay: number;
  insurance: InsuranceBreakdown;
  netPay: number;
}

export interface StorePayrollSummary {
  month: string; // 'YYYY-MM'
  rows: MemberPayrollRow[];
  totals: {
    employees: number;
    fulltime: number;
    parttime: number;
    workMinutes: number;
    grossPay: number;
    insurance: number;
    netPay: number;
  };
}

/** 'YYYY-MM' → [startISO, endISO) — Asia/Seoul 기준이 아닌 UTC ISO 사용
 *  (attendances.check_in_at도 UTC timestamptz로 저장됨). */
function monthRangeIso(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return { start, end };
}

/** 'YYYY-MM-DD' → 그 주 월요일 'YYYY-MM-DD' (주휴수당 주 단위 집계 키). */
function weekStartKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();              // 0=일 ~ 6=토
  const diff = day === 0 ? -6 : 1 - day;  // 월요일로 이동
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** 매장 전체 급여 집계. 매장의 모든 멤버(owner 제외)를 행으로 반환. */
export async function getStorePayroll(
  supabase: SupabaseClient,
  storeId: string,
  month: string,
): Promise<StorePayrollSummary> {
  const { start, end } = monthRangeIso(month);

  // 1) 매장 멤버 (사장 제외) — 퇴사자도 표시하되 비활성 플래그로 구분
  const { data: members } = await supabase
    .from('store_members')
    .select('id, user_id, role, is_active, hire_date, resign_date')
    .eq('store_id', storeId)
    .neq('role', 'owner')
    .order('is_active', { ascending: false })
    .order('hire_date', { ascending: true });

  const memberRows = members ?? [];
  const userIds = Array.from(new Set(memberRows.map((m) => m.user_id)));

  if (userIds.length === 0) {
    return {
      month,
      rows: [],
      totals: { employees: 0, fulltime: 0, parttime: 0, workMinutes: 0, grossPay: 0, insurance: 0, netPay: 0 },
    };
  }

  // 2) 직원별 프로필 (이름·연락처)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, phone')
    .in('id', userIds);
  const profileMap = new Map<string, { name: string | null; phone: string | null }>();
  (profiles ?? []).forEach((p) => profileMap.set(p.id, { name: p.name, phone: p.phone }));

  // 3) 최신 서명/발송 계약서 (직원당 1개)
  const { data: contracts } = await supabase
    .from('labor_contracts')
    .select('id, employee_id, contract_type, status, wage_type, wage_amount, weekly_holiday_allowance, social_insurance, created_at')
    .eq('store_id', storeId)
    .in('employee_id', userIds)
    .in('status', ['signed', 'sent'])
    .order('created_at', { ascending: false });

  const contractByUser = new Map<string, ContractDetail>();
  (contracts ?? []).forEach((raw) => {
    const c = raw as unknown as ContractDetail & { employee_id: string };
    if (!contractByUser.has(c.employee_id) || (contractByUser.get(c.employee_id)!.status !== 'signed' && c.status === 'signed')) {
      contractByUser.set(c.employee_id, c);
    }
  });

  // 4) 월 출퇴근 기록
  const { data: atts } = await supabase
    .from('attendances')
    .select('user_id, check_in_at, work_minutes')
    .eq('store_id', storeId)
    .in('user_id', userIds)
    .gte('check_in_at', start)
    .lt('check_in_at', end);

  const workByUser = new Map<string, { minutes: number; days: Set<string>; weekMinutes: Map<string, number> }>();
  (atts ?? []).forEach((a) => {
    if (!workByUser.has(a.user_id)) workByUser.set(a.user_id, { minutes: 0, days: new Set(), weekMinutes: new Map() });
    const agg = workByUser.get(a.user_id)!;
    const mins = Number(a.work_minutes ?? 0);
    agg.minutes += mins;
    const dayStr = String(a.check_in_at).slice(0, 10);
    agg.days.add(dayStr);
    const wk = weekStartKey(dayStr);
    agg.weekMinutes.set(wk, (agg.weekMinutes.get(wk) ?? 0) + mins);
  });

  // 5) 행 조립
  const rows: MemberPayrollRow[] = memberRows.map((m) => {
    const profile = profileMap.get(m.user_id);
    const contract = contractByUser.get(m.user_id) ?? null;
    const work = workByUser.get(m.user_id);
    const workMinutes = work?.minutes ?? 0;
    const workDays = work?.days.size ?? 0;

    let grossPay = 0;
    let insurance: InsuranceBreakdown = ZERO_BREAKDOWN;
    let netPay = 0;

    if (contract) {
      const hours = workMinutes / 60;
      if (contract.wage_type === 'hourly') {
        const base = Math.round(hours * contract.wage_amount);
        // 주휴수당: 계약서에 '지급'이고 시급제일 때, 주 15시간 이상 근무한 주마다
        // (주 근로시간/40)×8×시급 만큼 추가 (8시간분 상한). 4대보험 산정 기준에도 포함됨.
        let weeklyHoliday = 0;
        if (contract.weekly_holiday_allowance && work) {
          for (const wkMin of work.weekMinutes.values()) {
            const wkHours = wkMin / 60;
            if (wkHours >= 15) {
              const paidHours = Math.min(wkHours, 40) / 40 * 8;
              weeklyHoliday += Math.round(paidHours * contract.wage_amount);
            }
          }
        }
        grossPay = base + weeklyHoliday;
      } else if (contract.wage_type === 'monthly') {
        // 월급제는 근무 여부와 무관하게 wage_amount.
        // 단 퇴사자의 그 다음 달은 0으로 (resign_date 이후 월).
        const isResigned = m.resign_date && m.resign_date < `${month}-01`;
        grossPay = isResigned ? 0 : contract.wage_amount;
      } else if (contract.wage_type === 'daily') {
        grossPay = workDays * contract.wage_amount;
      }
      const calc = calculateNetPay(grossPay, contract.contract_type, contract.social_insurance);
      insurance = calc.insurance;
      netPay = calc.net;
    }

    return {
      memberId: m.id,
      userId: m.user_id,
      name: profile?.name ?? '이름 미등록',
      phone: profile?.phone ?? null,
      role: m.role,
      isActive: m.is_active && !m.resign_date,
      contract,
      workMinutes,
      workDays,
      grossPay,
      insurance,
      netPay,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      if (r.isActive) acc.employees += 1;
      if (r.contract?.contract_type === 'fulltime' && r.isActive) acc.fulltime += 1;
      if (r.contract?.contract_type === 'parttime' && r.isActive) acc.parttime += 1;
      acc.workMinutes += r.workMinutes;
      acc.grossPay += r.grossPay;
      acc.insurance += r.insurance.total;
      acc.netPay += r.netPay;
      return acc;
    },
    { employees: 0, fulltime: 0, parttime: 0, workMinutes: 0, grossPay: 0, insurance: 0, netPay: 0 },
  );

  return { month, rows, totals };
}

export function formatHM(minutes: number): string {
  if (!minutes || minutes < 0) return '0시간';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}
