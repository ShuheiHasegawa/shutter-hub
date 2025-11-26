-- Migration: 20251126110000_fix_priority_ticket_design
-- Description: 優先チケット設計修正 - 主催者に紐づくチケットに変更
-- Date: 2025-11-26

-- 1. UNIQUE制約を削除（photo_session_idベースの制約は不要）
ALTER TABLE priority_tickets
DROP CONSTRAINT IF EXISTS priority_tickets_user_id_photo_session_id_key;

-- 2. photo_session_idをNULL許可に変更（配布時はNULL、使用時に設定）
ALTER TABLE priority_tickets
ALTER COLUMN photo_session_id DROP NOT NULL;

-- 3. issued_byにインデックスを追加（主催者ごとのチケット検索用）
CREATE INDEX IF NOT EXISTS idx_priority_tickets_issued_by 
ON priority_tickets(issued_by) 
WHERE is_active = true;

-- 4. ユーザーごとの有効チケット検索用インデックス
CREATE INDEX IF NOT EXISTS idx_priority_tickets_user_active 
ON priority_tickets(user_id, is_active, expires_at) 
WHERE is_active = true AND used_at IS NULL;

-- 5. コメント更新
COMMENT ON COLUMN priority_tickets.photo_session_id IS '使用された撮影会ID（使用時に設定、配布時はNULL）';
COMMENT ON COLUMN priority_tickets.issued_by IS 'チケットを配布した主催者ID（この主催者の撮影会で使用可能）';
COMMENT ON COLUMN priority_tickets.used_at IS 'チケット使用日時（使用時に設定）';




