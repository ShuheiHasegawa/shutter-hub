-- フォロー・フォロワーシステム
-- Phase 1: フォローシステム基盤実装

-- フォロー関係テーブル
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- 自分をフォローできない
);

-- ユーザーブロック機能
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id) -- 自分をブロックできない
);

-- ユーザー設定テーブル
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- フォロー関連設定
  follow_approval_required BOOLEAN DEFAULT false, -- フォロー承認制
  allow_messages_from_followers BOOLEAN DEFAULT true,
  allow_messages_from_following BOOLEAN DEFAULT true,
  allow_messages_from_strangers BOOLEAN DEFAULT false,
  
  -- 既読表示設定
  show_read_status BOOLEAN DEFAULT true,
  show_online_status BOOLEAN DEFAULT true,
  
  -- 通知設定
  notify_new_follower BOOLEAN DEFAULT true,
  notify_follow_request BOOLEAN DEFAULT true,
  notify_new_message BOOLEAN DEFAULT true,
  notify_group_message BOOLEAN DEFAULT true,
  notify_system_message BOOLEAN DEFAULT true,
  
  -- プライバシー設定
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'followers_only', 'private')),
  activity_visibility TEXT DEFAULT 'public' CHECK (activity_visibility IN ('public', 'followers_only', 'private')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- フォロー統計テーブル（パフォーマンス最適化用）
CREATE TABLE user_follow_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  mutual_follows_count INTEGER DEFAULT 0, -- 相互フォロー数
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_status ON follows(status);
CREATE INDEX idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- RLS ポリシー設定
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follow_stats ENABLE ROW LEVEL SECURITY;

-- フォロー関係のRLSポリシー
CREATE POLICY "Users can view their own follows" ON follows
  FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can create follow relationships" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can update their own follow requests" ON follows
  FOR UPDATE USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can delete their own follows" ON follows
  FOR DELETE USING (follower_id = auth.uid());

-- ブロック機能のRLSポリシー
CREATE POLICY "Users can view their own blocks" ON user_blocks
  FOR SELECT USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks" ON user_blocks
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their own blocks" ON user_blocks
  FOR DELETE USING (blocker_id = auth.uid());

-- 設定のRLSポリシー
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR ALL USING (user_id = auth.uid());

-- 統計のRLSポリシー
CREATE POLICY "Users can view follow stats" ON user_follow_stats
  FOR SELECT USING (true); -- 統計は公開

CREATE POLICY "Only authenticated users can update stats" ON user_follow_stats
  FOR ALL USING (user_id = auth.uid());

-- フォロー統計更新関数
CREATE OR REPLACE FUNCTION update_follow_stats(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_follow_stats (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  UPDATE user_follow_stats
  SET
    followers_count = (
      SELECT COUNT(*) FROM follows 
      WHERE following_id = target_user_id AND status = 'accepted'
    ),
    following_count = (
      SELECT COUNT(*) FROM follows 
      WHERE follower_id = target_user_id AND status = 'accepted'
    ),
    mutual_follows_count = (
      SELECT COUNT(*) FROM follows f1
      WHERE f1.follower_id = target_user_id 
      AND f1.status = 'accepted'
      AND EXISTS (
        SELECT 1 FROM follows f2 
        WHERE f2.follower_id = f1.following_id 
        AND f2.following_id = target_user_id 
        AND f2.status = 'accepted'
      )
    ),
    updated_at = NOW()
  WHERE user_id = target_user_id;
END;
$$;

-- フォロー関係変更時のトリガー関数
CREATE OR REPLACE FUNCTION trigger_update_follow_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_follow_stats(NEW.follower_id);
    PERFORM update_follow_stats(NEW.following_id);
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM update_follow_stats(OLD.follower_id);
    PERFORM update_follow_stats(OLD.following_id);
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- トリガー作成
CREATE TRIGGER follows_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION trigger_update_follow_stats();

-- ユーザー設定の初期化関数
CREATE OR REPLACE FUNCTION initialize_user_preferences(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_follow_stats (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- 新規ユーザー登録時の設定初期化トリガー
CREATE OR REPLACE FUNCTION trigger_initialize_user_social_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM initialize_user_preferences(NEW.id);
  RETURN NEW;
END;
$$;

-- プロフィール作成時にソーシャル機能を初期化
CREATE TRIGGER profiles_social_init_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_initialize_user_social_data();

-- ブロック状態チェック関数
CREATE OR REPLACE FUNCTION is_user_blocked(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE (blocker_id = user1_id AND blocked_id = user2_id)
    OR (blocker_id = user2_id AND blocked_id = user1_id)
  );
END;
$$;

-- 相互フォロー状態チェック関数
CREATE OR REPLACE FUNCTION are_users_mutual_followers(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows f1
    WHERE f1.follower_id = user1_id 
    AND f1.following_id = user2_id 
    AND f1.status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM follows f2 
      WHERE f2.follower_id = user2_id 
      AND f2.following_id = user1_id 
      AND f2.status = 'accepted'
    )
  );
END;
$$;

-- フォロー関係ビュー（便利なクエリ用）
CREATE VIEW user_follow_relationships AS
SELECT 
  f.follower_id,
  f.following_id,
  f.status,
  f.created_at,
  fp.display_name as follower_name,
  fp.avatar_url as follower_avatar,
  fp.user_type as follower_type,
  fwp.display_name as following_name,
  fwp.avatar_url as following_avatar,
  fwp.user_type as following_type,
  are_users_mutual_followers(f.follower_id, f.following_id) as is_mutual
FROM follows f
JOIN profiles fp ON fp.id = f.follower_id
JOIN profiles fwp ON fwp.id = f.following_id;

COMMENT ON TABLE follows IS 'フォロー関係管理テーブル';
COMMENT ON TABLE user_blocks IS 'ユーザーブロック機能テーブル';
COMMENT ON TABLE user_preferences IS 'ユーザー設定テーブル';
COMMENT ON TABLE user_follow_stats IS 'フォロー統計テーブル（パフォーマンス最適化用）'; 