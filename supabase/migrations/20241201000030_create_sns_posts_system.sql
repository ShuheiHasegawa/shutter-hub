-- Phase 6: SNS拡張機能（投稿・タイムライン・いいね・コメント・ハッシュタグ）
-- Instagram/Twitter風のSNS機能実装

-- 投稿タイプのENUM型
CREATE TYPE post_type AS ENUM ('text', 'image', 'multiple_images', 'photo_session', 'repost');

-- 投稿の可視性のENUM型
CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'mutual_follows', 'private');

-- 投稿テーブル（つぶやき・写真投稿）
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type post_type DEFAULT 'text',
  visibility post_visibility DEFAULT 'public',
  
  -- 画像関連
  image_urls TEXT[], -- 複数画像対応
  image_count INTEGER DEFAULT 0,
  
  -- 撮影会関連投稿の場合
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE SET NULL,
  
  -- リポスト関連
  original_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  repost_comment TEXT,
  
  -- 統計（パフォーマンス向上のため非正規化）
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- 位置情報
  location TEXT,
  
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  CHECK (content != '' OR image_count > 0), -- テキストまたは画像が必要
  CHECK (image_count >= 0 AND image_count <= 10), -- 最大10枚まで
  CHECK (
    CASE 
      WHEN post_type = 'repost' THEN original_post_id IS NOT NULL
      ELSE original_post_id IS NULL
    END
  )
);

-- 投稿へのいいね
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

-- 投稿のコメント
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- 返信機能
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (content != ''),
  CHECK (parent_comment_id IS NULL OR parent_comment_id != id) -- 自己参照防止
);

-- コメントへのいいね
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id)
);

-- ハッシュタグマスター
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- #を除いた名前
  usage_count INTEGER DEFAULT 0,
  trending_score FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (name != '' AND name NOT LIKE '#%'), -- #記号は含まない
  CHECK (usage_count >= 0),
  CHECK (trending_score >= 0)
);

-- 投稿とハッシュタグの関連
CREATE TABLE post_hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, hashtag_id)
);

-- 投稿でのメンション
CREATE TABLE post_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, mentioned_user_id)
);

-- タイムライン設定
CREATE TABLE timeline_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_reposts BOOLEAN DEFAULT TRUE,
  show_likes_from_following BOOLEAN DEFAULT TRUE,
  show_comments_from_following BOOLEAN DEFAULT TRUE,
  show_suggested_posts BOOLEAN DEFAULT TRUE,
  chronological_order BOOLEAN DEFAULT FALSE, -- false: アルゴリズム順
  content_filters TEXT[] DEFAULT '{}', -- フィルタリングするハッシュタグ
  muted_users UUID[] DEFAULT '{}', -- ミュートするユーザー
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_photo_session_id ON posts(photo_session_id);
CREATE INDEX idx_posts_original_post_id ON posts(original_post_id);
CREATE INDEX idx_posts_type_visibility_created ON posts(post_type, visibility, created_at DESC);

CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_created_at ON post_likes(created_at DESC);

CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX idx_post_comments_parent_id ON post_comments(parent_comment_id);
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at DESC);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

CREATE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_hashtags_trending_score ON hashtags(trending_score DESC);
CREATE INDEX idx_hashtags_usage_count ON hashtags(usage_count DESC);

CREATE INDEX idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

CREATE INDEX idx_post_mentions_post_id ON post_mentions(post_id);
CREATE INDEX idx_post_mentions_user_id ON post_mentions(mentioned_user_id);

-- 統計更新用のトリガー関数

-- 投稿の統計を更新する関数
CREATE OR REPLACE FUNCTION update_post_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- いいね数を更新
  IF TG_TABLE_NAME = 'post_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    END IF;
  
  -- コメント数を更新
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
      -- 親コメントの返信数も更新
      IF NEW.parent_comment_id IS NOT NULL THEN
        UPDATE post_comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_comment_id;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
      -- 親コメントの返信数も更新
      IF OLD.parent_comment_id IS NOT NULL THEN
        UPDATE post_comments SET replies_count = GREATEST(0, replies_count - 1) WHERE id = OLD.parent_comment_id;
      END IF;
    END IF;
  
  -- リポスト数を更新
  ELSIF TG_TABLE_NAME = 'posts' AND NEW.post_type = 'repost' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.original_post_id;
    ELSIF TG_OP = 'DELETE' AND OLD.post_type = 'repost' THEN
      UPDATE posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.original_post_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- コメントの統計を更新する関数
CREATE OR REPLACE FUNCTION update_comment_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_TABLE_NAME = 'comment_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE post_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ハッシュタグ使用数を更新する関数
CREATE OR REPLACE FUNCTION update_hashtag_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET usage_count = usage_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.hashtag_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- トリガー作成
CREATE TRIGGER posts_stats_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_stats();

CREATE TRIGGER comments_stats_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_stats();

CREATE TRIGGER reposts_stats_trigger
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_stats();

CREATE TRIGGER comment_likes_stats_trigger
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_stats();

CREATE TRIGGER hashtag_usage_trigger
  AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage();

-- タイムライン設定初期化関数
CREATE OR REPLACE FUNCTION initialize_timeline_preferences(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO timeline_preferences (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- ユーザー作成時にタイムライン設定を初期化するトリガー
CREATE OR REPLACE FUNCTION trigger_initialize_timeline_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM initialize_timeline_preferences(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_timeline_init_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_initialize_timeline_preferences();

-- トレンドハッシュタグ計算関数（バッチ処理用）
CREATE OR REPLACE FUNCTION calculate_trending_hashtags()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hashtag_record RECORD;
  trend_score FLOAT;
BEGIN
  -- 過去24時間のハッシュタグ使用数を計算してスコアを更新
  FOR hashtag_record IN 
    SELECT h.id, h.name, h.usage_count,
           COUNT(ph.id) as recent_usage
    FROM hashtags h
    LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
    LEFT JOIN posts p ON ph.post_id = p.id 
    WHERE p.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY h.id, h.name, h.usage_count
  LOOP
    -- トレンドスコア = (過去24時間の使用数 * 2) + (総使用数 * 0.1)
    trend_score := (hashtag_record.recent_usage * 2.0) + (hashtag_record.usage_count * 0.1);
    
    UPDATE hashtags 
    SET trending_score = trend_score, updated_at = NOW() 
    WHERE id = hashtag_record.id;
  END LOOP;
END;
$$;

-- ユーザーの投稿統計を取得するビュー
CREATE VIEW user_post_stats AS
SELECT 
  p.user_id,
  COUNT(*) as total_posts,
  SUM(p.likes_count) as total_likes,
  SUM(p.comments_count) as total_comments,
  SUM(p.reposts_count) as total_reposts,
  ROUND(AVG(p.likes_count + p.comments_count + p.reposts_count), 2) as average_engagement,
  MAX(p.created_at) as last_post_at
FROM posts p
WHERE p.post_type != 'repost' -- リポストは除外
GROUP BY p.user_id;

-- トレンドハッシュタグビュー（過去24時間）
CREATE VIEW trending_hashtags AS
SELECT 
  h.name,
  h.usage_count,
  h.trending_score,
  COUNT(ph.id) as recent_posts
FROM hashtags h
LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
LEFT JOIN posts p ON ph.post_id = p.id 
WHERE p.created_at > NOW() - INTERVAL '24 hours'
GROUP BY h.id, h.name, h.usage_count, h.trending_score
ORDER BY h.trending_score DESC
LIMIT 20;

-- 投稿の詳細情報を取得するビュー
CREATE VIEW posts_with_user_info AS
SELECT 
  p.*,
  pr.display_name as user_name,
  pr.avatar_url as user_avatar,
  pr.user_type,
  pr.is_verified,
  -- 撮影会情報
  ps.title as photo_session_title,
  ps.date as photo_session_date,
  ps.location as photo_session_location,
  -- 元投稿情報（リポストの場合）
  op.content as original_content,
  op.user_id as original_user_id,
  opr.display_name as original_user_name,
  opr.avatar_url as original_user_avatar
FROM posts p
JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN photo_sessions ps ON p.photo_session_id = ps.id
LEFT JOIN posts op ON p.original_post_id = op.id
LEFT JOIN profiles opr ON op.user_id = opr.id;

COMMENT ON TABLE posts IS 'SNS投稿（つぶやき・写真投稿）';
COMMENT ON TABLE post_likes IS '投稿へのいいね';
COMMENT ON TABLE post_comments IS '投稿のコメント';
COMMENT ON TABLE comment_likes IS 'コメントへのいいね';
COMMENT ON TABLE hashtags IS 'ハッシュタグマスター';
COMMENT ON TABLE post_hashtags IS '投稿とハッシュタグの関連';
COMMENT ON TABLE post_mentions IS '投稿でのメンション';
COMMENT ON TABLE timeline_preferences IS 'タイムライン設定'; 