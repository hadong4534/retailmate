-- =====================================================================
-- ⚠️ 전체 데이터 초기화 SQL
-- 이 스크립트는 모든 매장·계약·근태·매출·비용·계정을 삭제한다.
-- 되돌릴 수 없다. 정말 처음부터 다시 시작할 때만 실행.
--
-- 보존 항목:
--   - contract_templates (시스템 글로벌 템플릿 4종) — store_id=null인 것
--   - 마이그레이션 스키마·enum·함수
--
-- 실행 방법:
--   Supabase Dashboard → SQL Editor → 전체 복사 → Run
--   (Storage avatars/contracts 버킷의 파일은 별도로 Storage 페이지에서 삭제)
-- =====================================================================

-- 1) 운영 데이터 (FK 역순으로)
truncate table public.attendances           cascade;
truncate table public.payrolls              cascade;
truncate table public.sales                 cascade;
truncate table public.expenses              cascade;
truncate table public.consent_logs          cascade;
truncate table public.phone_verifications   cascade;

-- 알림·공지 (있으면)
do $$ begin
  if to_regclass('public.notice_reads') is not null then
    execute 'truncate table public.notice_reads cascade';
  end if;
  if to_regclass('public.notices') is not null then
    execute 'truncate table public.notices cascade';
  end if;
end $$;

-- AI 사용량 로그 (있으면)
do $$ begin
  if to_regclass('public.ai_usage') is not null then
    execute 'truncate table public.ai_usage cascade';
  end if;
  if to_regclass('public.ai_images') is not null then
    execute 'truncate table public.ai_images cascade';
  end if;
end $$;

-- 2) 계약서 (시스템 템플릿은 보존)
truncate table public.labor_contracts cascade;
delete from public.contract_templates where store_id is not null;
--  ↑ store_id is null인 시스템 글로벌 템플릿(정규/파트타임/계약직/NDA)은 보존

-- 3) 매장 멤버 → 매장
truncate table public.store_members cascade;
truncate table public.stores         cascade;

-- 4) 프로필 (auth.users 삭제 시 CASCADE되지만 명시적으로 비움)
truncate table public.profiles cascade;

-- 5) auth.users — 모든 사용자 계정 삭제
delete from auth.users;
-- ↑ Supabase는 auth.users 삭제 시 관련 identities/sessions도 자동 정리

-- 완료 확인용
select 'profiles' as table_name, count(*) as rows from public.profiles
union all select 'stores',          count(*) from public.stores
union all select 'store_members',   count(*) from public.store_members
union all select 'labor_contracts', count(*) from public.labor_contracts
union all select 'auth.users',      count(*) from auth.users
union all select 'templates(system)', count(*) from public.contract_templates;
-- 모두 0이어야 함 (templates(system)만 4)
