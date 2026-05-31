// ────────────────────────────────────────────────────────────────────────────
// Supabase 데이터베이스 타입 (라이브 스키마 mdvywgzjxfxlrnjbqmbu 기준, 2026-05-31)
// 마이그레이션 019(NDA)/020(cancelled) 적용 반영. 21개 테이블 중 코드에서
// 사용하는 엔티티 + enum을 정확히 정의한다.
// 전체 자동생성본이 필요하면: supabase gen types typescript --project-id <id>
// ────────────────────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums (DB enum과 1:1) ────────────────────────────────────────────────────
export type UserRole = 'owner' | 'employee' | 'manager';
export type SaleChannel = 'cash' | 'card' | 'delivery' | 'other' | 'cash_receipt' | 'transfer';
export type ExpenseCategory =
  | 'material' | 'labor' | 'rent' | 'utility'
  | 'communication' | 'marketing' | 'tax' | 'etc';
export type ContractType = 'fulltime' | 'parttime' | 'daily' | 'nda';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'terminated' | 'cancelled';
export type WageType = 'hourly' | 'monthly' | 'daily';
export type ConsentType = 'terms' | 'privacy' | 'gps_location' | 'marketing';
export type NoticeTarget = 'all' | 'employees';

// ── Row 인터페이스 ───────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  avatar_path: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  business_no: string | null;
  industry: string | null;
  address: string;
  detail_address: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  open_time: string | null;
  close_time: string | null;
  monthly_target: number | null;
  postcode: string | null;
  wage_calc_mode: string | null;
  weekly_holiday_default: boolean | null;
  pay_day_default: number | null;
  tax_filing_mode: string | null;
  business_name: string | null;
  logo_path: string | null;
  brand_color: string | null;
  brand_slogan: string | null;
  brand_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: UserRole;
  hourly_wage: number | null;
  monthly_wage: number | null;
  daily_wage: number | null;
  hire_date: string | null;
  resign_date: string | null;
  is_active: boolean;
  gps_consent_at: string | null;
  privacy_consent_at: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  store_id: string;
  sale_date: string;
  channel: SaleChannel;
  amount: number;
  memo: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  store_id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string | null;
  receipt_url: string | null;
  memo: string | null;
  item_name: string | null;
  payment_method: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  store_id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  lat_in: number | null;
  lng_in: number | null;
  distance_in_m: number | null;
  lat_out: number | null;
  lng_out: number | null;
  distance_out_m: number | null;
  is_valid: boolean | null;
  work_minutes: number | null;
  memo: string | null;
  created_at: string;
}

export interface Payroll {
  id: string;
  store_id: string;
  user_id: string;
  year_month: string;
  work_minutes: number;
  base_pay: number;
  weekly_bonus: number;
  overtime_pay: number;
  night_pay: number;
  holiday_pay: number;
  deduction: number;
  total: number;
  paid_at: string | null;
  created_at: string;
}

export interface Notice {
  id: string;
  store_id: string;
  author_id: string;
  title: string;
  body: string;
  target: NoticeTarget;
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 근로계약서 사회보험 가입 항목 (labor_contracts.social_insurance jsonb) */
export interface SocialInsurance {
  national_pension: boolean;
  health_insurance: boolean;
  employment_insurance: boolean;
  industrial_accident: boolean;
}

export interface LaborContract {
  id: string;
  store_id: string;
  employee_id: string | null;
  invite_name: string | null;
  invite_phone: string | null;
  contract_type: ContractType;
  work_start_date: string;
  work_end_date: string | null;
  workplace_address: string;
  job_description: string;
  work_days: string[];
  work_start_time: string;
  work_end_time: string;
  break_minutes: number;
  wage_type: WageType;
  wage_amount: number;
  weekly_holiday_allowance: boolean;
  pay_day: number;
  pay_method: string | null;
  social_insurance: SocialInsurance;
  annual_leave_policy: string | null;
  additional_terms: string | null;
  nda_retention_years: number | null;
  nda_info_scope: string | null;
  pdf_url: string | null;
  status: ContractStatus;
  sign_token: string | null;
  sign_token_expires_at: string | null;
  owner_signed_at: string | null;
  owner_signature_image: string | null;
  owner_signed_ip: string | null;
  owner_signed_user_agent: string | null;
  employee_signed_at: string | null;
  employee_signature_image: string | null;
  employee_signed_ip: string | null;
  employee_signed_user_agent: string | null;
  created_at: string;
  updated_at: string;
}

// ── Supabase typed client용 Database (필요 테이블만; 점진 확장) ───────────────
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      stores: Table<Store>;
      store_members: Table<StoreMember>;
      sales: Table<Sale>;
      expenses: Table<Expense>;
      attendances: Table<Attendance>;
      payrolls: Table<Payroll>;
      notices: Table<Notice>;
      labor_contracts: Table<LaborContract>;
    };
    Views: { [key: string]: { Row: Record<string, unknown>; Relationships: [] } };
    Functions: { [key: string]: { Args: Record<string, unknown>; Returns: unknown } };
    Enums: {
      user_role: UserRole;
      sale_channel: SaleChannel;
      expense_category: ExpenseCategory;
      contract_type: ContractType;
      contract_status: ContractStatus;
      wage_type: WageType;
      consent_type: ConsentType;
      notice_target: NoticeTarget;
    };
    CompositeTypes: { [key: string]: Record<string, unknown> };
  };
}
