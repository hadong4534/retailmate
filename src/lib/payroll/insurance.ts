/**
 * 한국 4대보험 본인부담 계산 (2026 기준).
 *
 * ⚠ 참고용 추정. 실제 산출은 노무사·세무사를 통해 검증해야 한다.
 *
 * 출처 (각각 매년 1월 고시 갱신, 변경 시 본 상수만 업데이트):
 * - 국민연금: 국민연금공단 — 본인 4.5% / 회사 4.5%
 * - 건강보험: 국민건강보험공단 — 본인 3.545% / 회사 3.545%
 * - 장기요양: 건강보험료 × 12.95% (본인부담분에 추가 부과)
 * - 고용보험: 고용노동부 — 본인 0.9% / 회사 0.9% + 고용안정·직업능력개발(0.25~0.85%, 회사만)
 * - 산재보험: 회사 전액 (업종별 0.7~18.6%, 본인 0%)
 *
 * 본 모듈은 매장이 부담하는 회사 분담분은 계산하지 않는다 — 직원 실수령액 표시 용도.
 */

import type { ContractType } from '@/types/database';

export interface SocialInsuranceFlags {
  national_pension: boolean;
  health_insurance: boolean;
  employment_insurance: boolean;
  industrial_accident: boolean;
}

export interface InsuranceBreakdown {
  nationalPension: number;     // 국민연금
  healthInsurance: number;     // 건강보험
  longTermCare: number;        // 장기요양보험
  employmentInsurance: number; // 고용보험
  total: number;               // 본인부담 총액
}

export const RATES_2026 = {
  nationalPension: 0.045,                 // 4.5%
  healthInsurance: 0.03545,               // 3.545%
  longTermCareOfHealth: 0.1295,           // 건강보험료의 12.95%
  employmentInsurance: 0.009,             // 0.9%
} as const;

export const ZERO_BREAKDOWN: InsuranceBreakdown = {
  nationalPension: 0,
  healthInsurance: 0,
  longTermCare: 0,
  employmentInsurance: 0,
  total: 0,
};

/**
 * 정규직만 본인부담 적용. 시급(parttime) / 일용(daily)은 0.
 * 사용자 정책: "시급제는 4대보험 미적용".
 */
export function calculateEmployeeInsurance(
  grossPay: number,
  contractType: ContractType,
  flags: SocialInsuranceFlags,
): InsuranceBreakdown {
  if (contractType !== 'fulltime') return ZERO_BREAKDOWN;
  if (grossPay <= 0) return ZERO_BREAKDOWN;

  const np = flags.national_pension ? Math.floor(grossPay * RATES_2026.nationalPension) : 0;
  const hi = flags.health_insurance ? Math.floor(grossPay * RATES_2026.healthInsurance) : 0;
  const ltc = hi > 0 ? Math.floor(hi * RATES_2026.longTermCareOfHealth) : 0;
  const ei = flags.employment_insurance ? Math.floor(grossPay * RATES_2026.employmentInsurance) : 0;

  return {
    nationalPension: np,
    healthInsurance: hi,
    longTermCare: ltc,
    employmentInsurance: ei,
    total: np + hi + ltc + ei,
  };
}

/**
 * 실수령액 = 세전 - 본인부담 4대보험.
 * (소득세·지방세는 미적용 — Phase 2 간이세액표에서 추가 예정)
 */
export function calculateNetPay(
  grossPay: number,
  contractType: ContractType,
  flags: SocialInsuranceFlags,
): { gross: number; insurance: InsuranceBreakdown; net: number } {
  const insurance = calculateEmployeeInsurance(grossPay, contractType, flags);
  return {
    gross: grossPay,
    insurance,
    net: grossPay - insurance.total,
  };
}


/* ════════════════════════════════════════════════════════════════════
 * 급여 처리방식(payroll_mode) 기반 공제 엔진 — 계약형태와 분리해 직원별로 선택.
 *   • four_major   : 4대보험 본인부담 (국민연금·건강·장기요양·고용)
 *   • freelance_3_3: 3.3% 사업소득 원천징수 (소득세 3% + 지방소득세 0.3%)
 *   • daily        : 일용직 원천징수 (일 15만원 비과세, 6%×(1-55%) + 지방세 10%)
 *   • none         : 공제 없음 (세전 = 실지급)
 * ⚠ 모두 참고용 추정. 실제 신고·납부는 노무사·세무사 검토.
 * ════════════════════════════════════════════════════════════════════ */

export type PayrollMode = 'four_major' | 'freelance_3_3' | 'daily' | 'none';

export const PAYROLL_MODE_LABEL: Record<PayrollMode, string> = {
  four_major: '4대보험',
  freelance_3_3: '3.3% 사업소득',
  daily: '일용직',
  none: '미적용',
};

/** 공제 항목별 표시용. */
export interface DeductionItem { label: string; amount: number }

export interface PayrollResult {
  gross: number;
  deductionTotal: number;
  net: number;
  /** 화면 라벨 — '4대보험 본인부담' / '원천징수 3.3%' / '일용 소득세' / '공제 없음' */
  deductionLabel: string;
  mode: PayrollMode;
  items: DeductionItem[];
}

const DAILY_TAX_FREE = 150_000;        // 일용직 1일 비과세 한도
const FREELANCE_INCOME = 0.03;          // 사업소득 원천 3%
const FREELANCE_LOCAL = 0.003;          // 지방소득세 0.3%

/**
 * 급여 처리방식 기반 공제·실수령 계산.
 * @param grossPay  월 세전 급여(집계된 값)
 * @param mode      직원 처리방식
 * @param opts      일용직 계산용 dailyWage·workDays, 4대보험 세부 flags
 */
export function calculatePayroll(
  grossPay: number,
  mode: PayrollMode,
  opts?: { dailyWage?: number; workDays?: number; flags?: SocialInsuranceFlags },
): PayrollResult {
  const g = Math.max(0, Math.round(grossPay));
  if (g === 0 || mode === 'none') {
    return { gross: g, deductionTotal: 0, net: g, deductionLabel: '공제 없음', mode, items: [] };
  }

  if (mode === 'four_major') {
    const flags = opts?.flags ?? {
      national_pension: true, health_insurance: true,
      employment_insurance: true, industrial_accident: true,
    };
    const np = flags.national_pension ? Math.floor(g * RATES_2026.nationalPension) : 0;
    const hi = flags.health_insurance ? Math.floor(g * RATES_2026.healthInsurance) : 0;
    const ltc = hi > 0 ? Math.floor(hi * RATES_2026.longTermCareOfHealth) : 0;
    const ei = flags.employment_insurance ? Math.floor(g * RATES_2026.employmentInsurance) : 0;
    const items: DeductionItem[] = [];
    if (np) items.push({ label: '국민연금', amount: np });
    if (hi) items.push({ label: '건강보험', amount: hi });
    if (ltc) items.push({ label: '장기요양', amount: ltc });
    if (ei) items.push({ label: '고용보험', amount: ei });
    const total = np + hi + ltc + ei;
    return { gross: g, deductionTotal: total, net: g - total, deductionLabel: '4대보험 본인부담', mode, items };
  }

  if (mode === 'freelance_3_3') {
    const incomeTax = Math.floor(g * FREELANCE_INCOME);
    const localTax = Math.floor(g * FREELANCE_LOCAL);
    const total = incomeTax + localTax;
    return {
      gross: g, deductionTotal: total, net: g - total, deductionLabel: '원천징수 3.3%', mode,
      items: [{ label: '소득세 3%', amount: incomeTax }, { label: '지방소득세 0.3%', amount: localTax }],
    };
  }

  // daily — 1일 단위 원천징수 후 근무일수만큼 합산
  const dailyWage = opts?.dailyWage ?? 0;
  const workDays = opts?.workDays ?? 0;
  if (dailyWage <= 0 || workDays <= 0) {
    return { gross: g, deductionTotal: 0, net: g, deductionLabel: '일용 소득세', mode, items: [] };
  }
  const taxablePerDay = Math.max(0, dailyWage - DAILY_TAX_FREE);
  const incomePerDay = Math.floor(taxablePerDay * 0.06 * (1 - 0.55)); // 6% × (1-근로세액공제55%)
  const localPerDay = Math.floor(incomePerDay * 0.1);
  const incomeTax = incomePerDay * workDays;
  const localTax = localPerDay * workDays;
  const total = incomeTax + localTax;
  return {
    gross: g, deductionTotal: total, net: g - total, deductionLabel: '일용 소득세', mode,
    items: total > 0
      ? [{ label: '소득세', amount: incomeTax }, { label: '지방소득세', amount: localTax }]
      : [],
  };
}
