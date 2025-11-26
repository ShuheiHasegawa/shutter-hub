-- Migration: 20251124175255_add_session_type
-- Description: 撮影会タイプ（個別撮影会/合同撮影会）を追加
-- Date: 2025-11-24

-- photo_sessionsテーブルにsession_type列を追加
ALTER TABLE photo_sessions 
ADD COLUMN session_type VARCHAR(20) DEFAULT 'individual' 
CHECK (session_type IN ('individual', 'joint'));

-- 既存データは以下の2つのみ'joint'、その他は'individual'
UPDATE photo_sessions 
SET session_type = 'joint' 
WHERE id IN (
  'e22cd8e4-24bb-42f7-931d-d0d50b27b338',
  '272d6c06-bf0c-421b-80fd-cb3fadb78a5f'
);

-- その他の既存データは'individual'として設定
UPDATE photo_sessions 
SET session_type = 'individual' 
WHERE session_type IS NULL;

-- コメント追加
COMMENT ON COLUMN photo_sessions.session_type IS '撮影会タイプ: individual=個別撮影会（モデルごとに別撮影会）, joint=合同撮影会（複数モデルが1つの撮影会）';

