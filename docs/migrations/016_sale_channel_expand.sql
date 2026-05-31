-- 016_sale_channel_expand.sql
-- 매출 채널 enum 확장: 현금영수증(cash_receipt), 계좌이체(transfer) 추가
--
-- 기존 enum: cash | card | delivery | other
-- 확장 후:    cash | card | delivery | other | cash_receipt | transfer
--
-- 주의:
-- 1) `ALTER TYPE ... ADD VALUE` 는 트랜잭션 블록 내부에서 새 값을 사용하면 실패.
--    이 마이그레이션은 ADD VALUE 만 수행하므로 단독 실행 안전.
-- 2) IF NOT EXISTS 사용으로 재실행 안전 (멱등).
-- 3) 기존 'delivery' row는 그대로 유지. UI 입력 폼은 6채널 모두 노출.

ALTER TYPE sale_channel ADD VALUE IF NOT EXISTS 'cash_receipt';
ALTER TYPE sale_channel ADD VALUE IF NOT EXISTS 'transfer';
