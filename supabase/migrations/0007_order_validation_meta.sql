-- 주문 전 검증(Pre-Order Validation) 결과 및 검수 메모 저장 컬럼

alter table orders add column if not exists review_note text;

alter table order_items add column if not exists order_verdict text;
alter table order_items add column if not exists checklist_confirmations jsonb not null default '[]'::jsonb;
