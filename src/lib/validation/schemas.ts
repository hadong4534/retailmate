// ────────────────────────────────────────────────────────────────────────────
// 공유 검증 스키마 (zod) — 서버 액션·API·폼이 동일한 규칙을 공유한다.
// 기존에 액션마다 손으로 작성하던 검증을 이 모듈로 통일한다.
// ────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

/** safeParse 결과에서 첫 에러 메시지를 반환(통과 시 null). 기존 액션의 반환 형식과 동일. */
export function validateWith<T>(schema: z.ZodType<T>, data: unknown): string | null {
  const r = schema.safeParse(data);
  if (r.success) return null;
  return r.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.';
}

// ── 공통 필드 ────────────────────────────────────────────────────────────────
export const phoneSchema = z
  .string()
  .trim()
  .min(1, '휴대폰 번호를 입력해주세요.')
  .regex(/^[0-9-]+$/, '휴대폰 번호 형식이 올바르지 않습니다.');

export const weekDaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

// ── 근로계약서 ───────────────────────────────────────────────────────────────
export const contractFormSchema = z.object({
  invite_name: z.string().trim().min(1, '직원 이름을 입력해주세요.'),
  invite_phone: z
    .string()
    .trim()
    .min(1, '직원 휴대폰 번호를 입력해주세요.')
    .regex(/^[0-9-]+$/, '휴대폰 번호 형식이 올바르지 않습니다.'),
  contract_type: z.enum(['fulltime', 'parttime', 'daily']),
  work_start_date: z.string().min(1, '근로 시작일을 선택해주세요.'),
  work_end_date: z.string().nullable(),
  workplace_address: z.string().trim().min(1, '근무 장소를 입력해주세요.'),
  job_description: z.string().trim().min(1, '담당 업무를 입력해주세요.'),
  work_days: z.array(weekDaySchema).min(1, '근무 요일을 1개 이상 선택해주세요.'),
  work_start_time: z.string().min(1, '근무 시간을 입력해주세요.'),
  work_end_time: z.string().min(1, '근무 시간을 입력해주세요.'),
  break_minutes: z.number().min(0, '휴게 시간이 올바르지 않습니다.'),
  wage_type: z.enum(['hourly', 'monthly', 'daily']),
  wage_amount: z.number().positive('임금 금액을 입력해주세요.'),
  weekly_holiday_allowance: z.boolean(),
  social_insurance: z.object({
    national_pension: z.boolean(),
    health_insurance: z.boolean(),
    employment_insurance: z.boolean(),
    industrial_accident: z.boolean(),
  }),
  payroll_mode: z.enum(['four_major', 'freelance_3_3', 'daily', 'none']).optional(),
  pay_day: z
    .number()
    .int()
    .min(1, '임금 지급일은 1~31일 사이여야 합니다.')
    .max(31, '임금 지급일은 1~31일 사이여야 합니다.'),
  pay_method: z.string(),
  annual_leave_policy: z.string(),
  additional_terms: z.string(),
});

// ── NDA(비밀유지 서약서) ─────────────────────────────────────────────────────
export const ndaFormSchema = z.object({
  invite_name: z.string().trim().min(1, '직원 이름을 입력해주세요.'),
  invite_phone: z
    .string()
    .trim()
    .min(1, '직원 휴대폰 번호를 입력해주세요.')
    .regex(/^[0-9-]+$/, '휴대폰 번호 형식이 올바르지 않습니다.'),
  effective_date: z.string().min(1, '시행일을 선택해주세요.'),
  retention_years: z
    .number()
    .min(1, '비밀유지 기간은 1~10년 사이여야 합니다.')
    .max(10, '비밀유지 기간은 1~10년 사이여야 합니다.'),
  extra_scope: z.string(),
});

// ── 매출 ─────────────────────────────────────────────────────────────────────
export const saleChannelSchema = z.enum([
  'cash', 'card', 'delivery', 'other', 'cash_receipt', 'transfer',
]);

// ── 비용 ─────────────────────────────────────────────────────────────────────
export const expenseCategorySchema = z.enum([
  'material', 'labor', 'rent', 'utility', 'communication', 'marketing', 'tax', 'etc',
]);

export const expenseFormSchema = z.object({
  category: expenseCategorySchema,
  amount: z.number().positive('금액을 입력해주세요.'),
  expense_date: z.string().min(1, '날짜를 선택해주세요.'),
  vendor: z.string().nullable().optional(),
  item_name: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});

// ── 공지 ─────────────────────────────────────────────────────────────────────
export const noticeFormSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요.').max(100, '제목은 100자 이내로 입력해주세요.'),
  body: z.string().trim().min(1, '내용을 입력해주세요.').max(2000, '내용은 2000자 이내로 입력해주세요.'),
  target: z.enum(['all', 'employees']),
  is_pinned: z.boolean(),
  expires_at: z.string().nullable().optional(),
});

// ── 매장 정보 ────────────────────────────────────────────────────────────────
export const storeInfoSchema = z.object({
  name: z.string().trim().min(1, '매장 이름을 입력해주세요.'),
  address: z.string().trim().min(1, '매장 주소를 입력해주세요.'),
});

// ── 직원 급여/프로필 ─────────────────────────────────────────────────────────
export const memberWageSchema = z.object({
  wage: z.number().int().min(0, '시급이 올바르지 않습니다.').max(1_000_000, '시급이 올바르지 않습니다.'),
});

export const memberProfileSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.').max(30, '이름은 30자 이내로 입력해주세요.'),
  phone: phoneSchema,
});
