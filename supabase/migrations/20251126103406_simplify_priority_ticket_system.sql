-- Migration: 20251126103406_simplify_priority_ticket_system
-- Description: VIP/プラチナ/ゴールド枠数設定を廃止し、チケットタイプを1つに統一
-- Date: 2025-11-26

-- 1. 優先チケットテーブルのticket_typeを'general'のみに統一
-- 既存データは全て'general'に更新
UPDATE priority_tickets 
SET ticket_type = 'general' 
WHERE ticket_type IS NOT NULL;

-- CHECK制約を更新（'general'のみ許可）
ALTER TABLE priority_tickets 
DROP CONSTRAINT IF EXISTS priority_tickets_ticket_type_check;

ALTER TABLE priority_tickets 
ADD CONSTRAINT priority_tickets_ticket_type_check 
CHECK (ticket_type = 'general');

-- デフォルト値を'general'に設定（既に設定済みの場合はスキップ）
ALTER TABLE priority_tickets 
ALTER COLUMN ticket_type SET DEFAULT 'general';

-- コメント更新
COMMENT ON COLUMN priority_tickets.ticket_type IS 'チケットタイプ（現在はgeneralのみ）';




