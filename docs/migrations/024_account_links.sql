-- 024_account_links.sql  (운영 DB 적용 완료)
-- 카카오 id → 주(主) 계정 매핑. 이메일로 가입한 계정에 카카오 로그인을 추가 수단으로 연결.
-- service_role(admin client)에서만 접근. RLS 활성 + 정책 없음 → anon/authenticated 직접 접근 차단.
CREATE TABLE IF NOT EXISTS public.account_links (
  kakao_id   text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_links_user ON public.account_links(user_id);
ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;
-- 정책 없음(의도): RLS 활성 상태에서 정책이 없으면 service_role만 접근 가능.
