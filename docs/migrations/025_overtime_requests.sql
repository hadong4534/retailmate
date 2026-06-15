-- 025_overtime_requests.sql  (운영 DB 적용 완료)
-- 연장근무 신청 → 사장/매니저 승인. 승인된 분(minutes)만 급여에 가산.
-- RLS 활성 + 정책 없음 → service_role(admin client)만 접근.
--   모든 접근은 서버 액션(submitOvertime/decideOvertime)의 authorize 검증 후 admin client로.
CREATE TABLE IF NOT EXISTS public.overtime_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date  date NOT NULL,
  minutes    integer NOT NULL CHECK (minutes > 0 AND minutes <= 1440),
  reason     text,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_overtime_store_date ON public.overtime_requests(store_id, work_date);
CREATE INDEX IF NOT EXISTS idx_overtime_user ON public.overtime_requests(user_id);
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
