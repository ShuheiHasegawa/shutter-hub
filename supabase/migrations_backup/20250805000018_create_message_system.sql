-- SNS型メッセージシステム
-- Phase 2: 1対1メッセージシステム

-- 会話（Conversation）テーブル
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT FALSE,
  group_name TEXT,
  group_description TEXT,
  group_image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 1対1の場合は重複を防ぐ
  UNIQUE(participant1_id, participant2_id),
  CHECK (participant1_id != participant2_id),
  -- グループの場合はparticipant2_idはNULL
  CHECK (
    (is_group = FALSE AND participant1_id IS NOT NULL AND participant2_id IS NOT NULL AND group_name IS NULL) OR
    (is_group = TRUE AND participant2_id IS NULL AND group_name IS NOT NULL)
  )
);

-- メッセージテーブル
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- メッセージ既読状態テーブル
CREATE TABLE IF NOT EXISTS message_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

-- グループメンバーテーブル（将来のPhase 3用）
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(conversation_id, user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user ON message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);

-- 会話統計ビュー
CREATE OR REPLACE VIEW conversation_stats AS
SELECT 
  c.id AS conversation_id,
  c.participant1_id,
  c.participant2_id,
  c.is_group,
  c.group_name,
  c.last_message_at,
  COALESCE(message_counts.total_messages, 0) AS total_messages,
  COALESCE(unread_counts.unread_count, 0) AS unread_count,
  last_message.content AS last_message_content,
  last_message.message_type AS last_message_type,
  last_message.sender_id AS last_message_sender_id
FROM 
  conversations c
LEFT JOIN (
  SELECT conversation_id, COUNT(*) as total_messages 
  FROM messages 
  GROUP BY conversation_id
) message_counts ON c.id = message_counts.conversation_id
LEFT JOIN (
  SELECT 
    m.conversation_id,
    COUNT(*) as unread_count
  FROM messages m
  LEFT JOIN message_read_status mrs ON m.id = mrs.message_id
  WHERE mrs.message_id IS NULL
  GROUP BY m.conversation_id
) unread_counts ON c.id = unread_counts.conversation_id
LEFT JOIN messages last_message ON c.last_message_id = last_message.id;

-- 1対1会話作成/取得関数
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  normalized_user1_id UUID;
  normalized_user2_id UUID;
BEGIN
  -- ユーザーIDを正規化（小さい方をparticipant1に）
  IF user1_id < user2_id THEN
    normalized_user1_id := user1_id;
    normalized_user2_id := user2_id;
  ELSE
    normalized_user1_id := user2_id;
    normalized_user2_id := user1_id;
  END IF;

  -- 既存の会話を検索
  SELECT id INTO conversation_id
  FROM conversations
  WHERE participant1_id = normalized_user1_id 
    AND participant2_id = normalized_user2_id 
    AND is_group = FALSE;

  -- 存在しない場合は新規作成
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (participant1_id, participant2_id, is_group)
    VALUES (normalized_user1_id, normalized_user2_id, FALSE)
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- 未読メッセージ数取得関数
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id_param UUID, conversation_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM messages m
  LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = user_id_param
  WHERE m.conversation_id = conversation_id_param
    AND m.sender_id != user_id_param  -- 自分のメッセージは除外
    AND mrs.message_id IS NULL;       -- 未読

  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- メッセージ既読処理関数
CREATE OR REPLACE FUNCTION mark_messages_as_read(user_id_param UUID, conversation_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  marked_count INTEGER;
BEGIN
  WITH unread_messages AS (
    SELECT m.id
    FROM messages m
    LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = user_id_param
    WHERE m.conversation_id = conversation_id_param
      AND m.sender_id != user_id_param  -- 自分のメッセージは除外
      AND mrs.message_id IS NULL        -- 未読
  ),
  inserted_reads AS (
    INSERT INTO message_read_status (message_id, user_id)
    SELECT id, user_id_param
    FROM unread_messages
    RETURNING 1
  )
  SELECT COUNT(*) INTO marked_count
  FROM inserted_reads;

  RETURN marked_count;
END;
$$ LANGUAGE plpgsql;

-- RLSポリシー設定
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- 会話のRLSポリシー
CREATE POLICY "Users can view their own conversations" ON conversations FOR SELECT USING (
  auth.uid() = participant1_id OR 
  auth.uid() = participant2_id OR 
  (is_group = TRUE AND EXISTS (
    SELECT 1 FROM conversation_members cm 
    WHERE cm.conversation_id = id 
    AND cm.user_id = auth.uid() 
    AND cm.is_active = TRUE
  ))
);

CREATE POLICY "Users can insert conversations they participate in" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = participant1_id OR auth.uid() = participant2_id OR auth.uid() = created_by
);

CREATE POLICY "Users can update their own conversations" ON conversations FOR UPDATE USING (
  auth.uid() = participant1_id OR 
  auth.uid() = participant2_id OR 
  (is_group = TRUE AND EXISTS (
    SELECT 1 FROM conversation_members cm 
    WHERE cm.conversation_id = id 
    AND cm.user_id = auth.uid() 
    AND cm.role IN ('admin', 'moderator')
  ))
);

-- メッセージのRLSポリシー
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.participant1_id = auth.uid() OR 
      c.participant2_id = auth.uid() OR
      (c.is_group = TRUE AND EXISTS (
        SELECT 1 FROM conversation_members cm 
        WHERE cm.conversation_id = c.id 
        AND cm.user_id = auth.uid() 
        AND cm.is_active = TRUE
      ))
    )
  )
);

CREATE POLICY "Users can insert messages in their conversations" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.participant1_id = auth.uid() OR 
      c.participant2_id = auth.uid() OR
      (c.is_group = TRUE AND EXISTS (
        SELECT 1 FROM conversation_members cm 
        WHERE cm.conversation_id = c.id 
        AND cm.user_id = auth.uid() 
        AND cm.is_active = TRUE
      ))
    )
  )
);

CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE USING (
  auth.uid() = sender_id
);

CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE USING (
  auth.uid() = sender_id
);

-- メッセージ既読状態のRLSポリシー
CREATE POLICY "Users can view their own read status" ON message_read_status FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can insert their own read status" ON message_read_status FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own read status" ON message_read_status FOR UPDATE USING (
  auth.uid() = user_id
);

-- 会話メンバーのRLSポリシー
CREATE POLICY "Users can view conversation members they're part of" ON conversation_members FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM conversation_members cm 
    WHERE cm.conversation_id = conversation_id 
    AND cm.user_id = auth.uid() 
    AND cm.is_active = TRUE
  )
);

-- 最終メッセージ更新トリガー関数
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 最終メッセージ更新トリガー
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- updated_atトリガー
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 