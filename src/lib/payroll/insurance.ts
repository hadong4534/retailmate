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
