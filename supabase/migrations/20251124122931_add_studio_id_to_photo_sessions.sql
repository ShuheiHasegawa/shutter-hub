-- Migration: 20251124122931_add_studio_id_to_photo_sessions
-- Description: photo_sessionsテーブルにstudio_idカラムを追加
-- Date: 2025-11-24

-- studio_idカラムを追加
ALTER TABLE photo_sessions
ADD COLUMN studio_id UUID REFERENCES studios(id) ON DELETE SET NULL;

-- インデックス作成
CREATE INDEX idx_photo_sessions_studio_id ON photo_sessions(studio_id);

-- コメント追加
COMMENT ON COLUMN photo_sessions.studio_id IS 'スタジオID（任意）';



