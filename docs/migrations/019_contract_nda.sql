-- 019_contract_nda.sql
-- NDA(비밀유지서약서)를 labor_contracts 테이블에 추가 지원.
-- 멱등 — 재실행 안전.

-- ── 1. contract_type enum에 'nda' 추가 ───────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'nda'
      and enumtypid = (select oid from pg_type where typname = 'contract_type')
  ) then
    alter type contract_type add value 'nda';
  end if;
end $$;

-- ── 2. NDA 전용 컬럼 추가 (모두 nullable, 일반 근로계약엔 NULL) ──────
alter table public.labor_contracts
  add column if not exists nda_retention_years integer,         -- 퇴직 후 비밀유지 유지기간(년)
  add column if not exists nda_info_scope      text;            -- 사용자 추가 정의 비밀정보 범위
