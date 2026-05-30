// ────────────────────────────────────────────────────────────────────────────
// Supabase 데이터베이스 타입 정의 (수동 작성 — 추후 supabase gen types로 자동화)
// ────────────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'employee';
export type SaleChannel = 'card' | 'cash' | 'cash_receipt' | 'transfer' | 'delivery' | 'other';
export type ExpenseCategory =
  | 'material' | 'labor' | 'rent' | 'utility'
  | 'communication' | 'marketing' | 'tax' | 'etc';
export type ContractType = 'fulltime' | 'parttime' | 'daily' | 'nda';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'terminated' | 'cancelled';
export type WageType = 'hourly' | 'monthly' | 'daily';
export type ConsentType = 'terms' | 'privacy' | 'gps_location' | 'marketing';

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
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
  monthly_target: number;
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
  is_valid: boolean;
  work_minutes: number | null;
  memo: string | null;
  created_at: string;
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
  social_insurance: {
    national_pension: boolean;
    health_insurance: boolean;
    employment_insurance: boolean;
    industrial_accident: boolean;
  };
  annual_leave_policy: string | null;
  additional_terms: string | null;
  // NDA 전용 (contract_type='nda'일 때만 유효)
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

// ────────────────────────────────────────────────────────────────────────────
// Supabase typed client용 Database 타입
// supabase gen types로 자동 생성하기 전까지는 최소한의 타입 시그니처만 유지.
// 쿼리 응답 narrowing은 호출부에서 명시적 타입 지정으로 처리한다.
// ────────────────────────────────────────────────────────────────────────────
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles:        Table<Profile>;
      stores:          Table<Store>;
      store_members:   Table<StoreMember>;
      sales:           Table<Sale>;
      expenses:        Table<Expense>;
      attendances:     Table<Attendance>;
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
    };
    CompositeTypes: { [key: string]: Record<string, unknown> };
  };
}
