-- 020_contract_cancelled.sql
-- 계약서 발송 후 서명 전 "취소" 상태 추가.
-- 멱등 — 재실행 안전.
--
-- 의미 구분:
--   sent      — 발송됨, 서명 대기 중
--   signed    — 양측 서명 완료
--   cancelled — 사업주가 서명 전 발송을 취소함 (잘못 보낸 경우)
--   terminated — 서명 완료된 계약을 사후 종료 (계약 해지)

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'cancelled'
      and enumtypid = (select oid from pg_type where typname = 'contract_status')
  ) then
    alter type contract_status add value 'cancelled';
  end if;
end $$;
