-- Migration: 005_add_booking_type_to_photo_sessions
-- Description: photo_sessionsテーブルにbooking_typeフィールドを追加
-- Date: 2024-12-01

-- booking_type列を追加
ALTER TABLE photo_sessions ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'first_come';

-- CHECK制約を追加
ALTER TABLE photo_sessions ADD CONSTRAINT photo_sessions_booking_type_check 
CHECK (booking_type IN ('first_come', 'lottery', 'admin_lottery', 'priority'));

-- NOT NULL制約を追加
ALTER TABLE photo_sessions ALTER COLUMN booking_type SET NOT NULL;

-- インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_photo_sessions_booking_type ON photo_sessions(booking_type);

-- コメント追加
COMMENT ON COLUMN photo_sessions.booking_type IS '予約方式: first_come(先着順), lottery(抽選), admin_lottery(管理抽選), priority(優先予約)';

-- 既存データのデフォルト値設定（必要に応じて）
UPDATE photo_sessions SET booking_type = 'first_come' WHERE booking_type IS NULL; 