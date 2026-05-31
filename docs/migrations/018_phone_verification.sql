-- 018_phone_verification.sql
-- 회원가입 SMS 인증을 위한 테이블 + profiles.phone_verified 컬럼
-- 멱등 — 재실행 안전.

-- ── 1. profiles.phone_verified ────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- ── 2. phone_verifications 테이블 ─────────────────────────────────
-- 발급된 인증코드를 보관. 만료시간·시도횟수·검증여부 기록.
CREATE TABLE IF NOT EXISTS phone_verifications (
  id           bigserial PRIMARY KEY,
  phone        varchar(20) NOT NULL,
  code_hash    varchar(128) NOT NULL,         -- 평문 저장 금지, SHA-256 hex
  expires_at   timestamptz NOT NULL,
  attempts     int NOT NULL DEFAULT 0,
  verified_at  timestamptz,
  consumed_at  timestamptz,                   -- 검증된 코드가 가입에 사용된 시점
  client_ip    inet,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 이미 테이블이 있는 경우에도 consumed_at 컬럼 추가
ALTER TABLE phone_verifications ADD COLUMN IF NOT EXISTS consumed_at timestamptz;

CREATE INDEX IF NOT EXISTS phone_verifications_phone_created_idx
  ON phone_verifications (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS phone_verifications_expires_idx
  ON phone_verifications (expires_at);

-- RLS: 익명 사용자가 직접 select·insert·update할 일이 없다 (Service Role만 사용).
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_verifications_no_access" ON phone_verifications;
CREATE POLICY "phone_verifications_no_access"
  ON phone_verifications FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
