-- Migration: Add photo_session_id to conversations table
-- Description: conversationsテーブルにphoto_session_idカラムを追加して撮影会との関連付けを強化
-- Date: 2025-08-29

-- conversationsテーブルにphoto_session_idカラムを追加
ALTER TABLE conversations 
ADD COLUMN photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE SET NULL;

-- 既存のグループチャットデータを更新（撮影会チャットのみ）
UPDATE conversations 
SET photo_session_id = (
  -- グループ名から撮影会IDを抽出（UUIDパターンのみ）
  CASE 
    WHEN group_name ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12} - 撮影会チャット$' 
    THEN substring(group_name from '^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}) - 撮影会チャット$')::UUID
    ELSE NULL
  END
)
WHERE is_group = true 
AND group_name LIKE '% - 撮影会チャット'
AND photo_session_id IS NULL;

-- パフォーマンス向上のためのインデックス追加
CREATE INDEX IF NOT EXISTS idx_conversations_photo_session_id 
ON conversations(photo_session_id) 
WHERE photo_session_id IS NOT NULL;

-- 撮影会削除時にグループチャットも適切に処理されることを確認するためのコメント
-- photo_session_id は ON DELETE SET NULL なので、撮影会が削除されても
-- グループチャットは残るが、撮影会リンクは無効になる

-- 統計用：撮影会関連グループチャット数を確認するビュー（オプション）
CREATE OR REPLACE VIEW photo_session_group_chats AS
SELECT 
  ps.id as photo_session_id,
  ps.title as session_title,
  c.id as conversation_id,
  c.group_name,
  c.created_at as chat_created_at,
  (
    SELECT COUNT(*) 
    FROM conversation_members cm 
    WHERE cm.conversation_id = c.id 
    AND cm.is_active = true
  ) as active_members_count
FROM photo_sessions ps
JOIN conversations c ON c.photo_session_id = ps.id
WHERE c.is_group = true
ORDER BY c.created_at DESC;
