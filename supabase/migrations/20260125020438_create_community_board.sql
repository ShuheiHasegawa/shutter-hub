-- Migration: 20260125020438_create_community_board
-- Description: コミュニティボード機能のテーブルとRLSポリシーを作成
-- Date: 2026-01-25

-- 1. community_board_postsテーブルの作成
CREATE TABLE IF NOT EXISTS community_board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_session_id UUID NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'other' 
    CHECK (category IN ('announcement', 'question', 'introduction', 'impression', 'other')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2. community_board_reactionsテーブルの作成
CREATE TABLE IF NOT EXISTS community_board_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_board_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('👍', '❤️', '😂', '😮', '😢', '😡')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_community_posts_session ON community_board_posts(photo_session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_board_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_board_posts(photo_session_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON community_board_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_user ON community_board_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_type ON community_board_reactions(reaction_type);

-- 4. 参加者確認のヘルパー関数
CREATE OR REPLACE FUNCTION is_photo_session_participant(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings 
    WHERE photo_session_id = p_session_id 
    AND user_id = p_user_id 
    AND status = 'confirmed'
  ) OR EXISTS (
    SELECT 1 FROM photo_sessions 
    WHERE id = p_session_id 
    AND organizer_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. updated_at自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_community_board_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_board_posts_updated_at_trigger
  BEFORE UPDATE ON community_board_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_community_board_posts_updated_at();

-- 6. RLSポリシーの設定（community_board_posts）
ALTER TABLE community_board_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: 参加者 + 主催者のみ閲覧可
CREATE POLICY community_board_posts_select_policy ON community_board_posts
  FOR SELECT
  USING (
    is_photo_session_participant(photo_session_id, auth.uid())
  );

-- INSERT: 参加者 + 主催者のみ投稿可
CREATE POLICY community_board_posts_insert_policy ON community_board_posts
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid() 
    AND is_photo_session_participant(photo_session_id, auth.uid())
  );

-- UPDATE: 投稿者本人のみ編集可
CREATE POLICY community_board_posts_update_policy ON community_board_posts
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE: 投稿者本人 + 主催者が削除可
CREATE POLICY community_board_posts_delete_policy ON community_board_posts
  FOR DELETE
  USING (
    author_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM photo_sessions 
      WHERE id = photo_session_id 
      AND organizer_id = auth.uid()
    )
  );

-- 7. RLSポリシーの設定（community_board_reactions）
ALTER TABLE community_board_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: 全員がリアクション数を読み取り可能（集計情報）
CREATE POLICY community_board_reactions_select_policy ON community_board_reactions
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: 自分のリアクションのみ操作可能
CREATE POLICY community_board_reactions_modify_policy ON community_board_reactions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. コメントの追加
COMMENT ON TABLE community_board_posts IS 'コミュニティボードの投稿';
COMMENT ON COLUMN community_board_posts.photo_session_id IS '撮影会ID';
COMMENT ON COLUMN community_board_posts.author_id IS '投稿者ID';
COMMENT ON COLUMN community_board_posts.content IS '投稿内容';
COMMENT ON COLUMN community_board_posts.category IS 'カテゴリー（announcement, question, introduction, impression, other）';
COMMENT ON COLUMN community_board_posts.is_pinned IS 'ピン留めフラグ（主催者のみ設定可能）';

COMMENT ON TABLE community_board_reactions IS 'コミュニティボード投稿への絵文字リアクション';
COMMENT ON COLUMN community_board_reactions.post_id IS '投稿ID';
COMMENT ON COLUMN community_board_reactions.user_id IS 'リアクションを送信したユーザーID';
COMMENT ON COLUMN community_board_reactions.reaction_type IS 'リアクションタイプ（👍 ❤️ 😂 😮 😢 😡）';

COMMENT ON FUNCTION is_photo_session_participant IS '撮影会の参加者または主催者かどうかを確認する関数';
