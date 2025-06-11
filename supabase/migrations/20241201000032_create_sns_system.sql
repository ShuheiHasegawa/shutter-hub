-- SNS機能用のテーブル作成マイグレーション

-- ENUM型の作成
DO $$ BEGIN
  CREATE TYPE sns_post_type AS ENUM ('text', 'image', 'multiple_images', 'photo_session', 'repost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sns_post_visibility AS ENUM ('public', 'followers', 'mutual_follows', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- sns_posts テーブル
CREATE TABLE IF NOT EXISTS sns_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  post_type sns_post_type NOT NULL DEFAULT 'text',
  visibility sns_post_visibility NOT NULL DEFAULT 'public',
  image_urls TEXT[] DEFAULT '{}',
  image_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  location TEXT,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE SET NULL,
  original_post_id UUID REFERENCES sns_posts(id) ON DELETE CASCADE,
  repost_comment TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sns_post_likes テーブル
CREATE TABLE IF NOT EXISTS sns_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES sns_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- sns_post_comments テーブル
CREATE TABLE IF NOT EXISTS sns_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES sns_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES sns_post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sns_comment_likes テーブル
CREATE TABLE IF NOT EXISTS sns_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES sns_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- sns_hashtags テーブル
CREATE TABLE IF NOT EXISTS sns_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  trending_score FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sns_post_hashtags テーブル
CREATE TABLE IF NOT EXISTS sns_post_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES sns_posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES sns_hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- sns_post_mentions テーブル
CREATE TABLE IF NOT EXISTS sns_post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES sns_posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, mentioned_user_id)
);

-- sns_timeline_preferences テーブル
CREATE TABLE IF NOT EXISTS sns_timeline_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  show_reposts BOOLEAN DEFAULT TRUE,
  show_replies BOOLEAN DEFAULT TRUE,
  content_filter_level TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_sns_posts_user_id ON sns_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_sns_posts_created_at ON sns_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sns_posts_visibility ON sns_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_sns_posts_type ON sns_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_sns_post_likes_post_id ON sns_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_sns_post_likes_user_id ON sns_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_sns_post_comments_post_id ON sns_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_sns_hashtags_name ON sns_hashtags(name);
CREATE INDEX IF NOT EXISTS idx_sns_post_hashtags_post_id ON sns_post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_sns_post_hashtags_hashtag_id ON sns_post_hashtags(hashtag_id);

-- 統計更新用トリガー関数
CREATE OR REPLACE FUNCTION update_sns_post_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'sns_post_likes' THEN
      UPDATE sns_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_TABLE_NAME = 'sns_post_comments' THEN
      UPDATE sns_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'sns_post_likes' THEN
      UPDATE sns_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    ELSIF TG_TABLE_NAME = 'sns_post_comments' THEN
      UPDATE sns_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS update_sns_post_likes_count ON sns_post_likes;
CREATE TRIGGER update_sns_post_likes_count
  AFTER INSERT OR DELETE ON sns_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_sns_post_stats();

DROP TRIGGER IF EXISTS update_sns_post_comments_count ON sns_post_comments;
CREATE TRIGGER update_sns_post_comments_count
  AFTER INSERT OR DELETE ON sns_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_sns_post_stats();

-- コメントのいいね数更新
CREATE OR REPLACE FUNCTION update_sns_comment_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sns_post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sns_post_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sns_comment_likes_count ON sns_comment_likes;
CREATE TRIGGER update_sns_comment_likes_count
  AFTER INSERT OR DELETE ON sns_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_sns_comment_stats();

-- ハッシュタグ統計更新
CREATE OR REPLACE FUNCTION update_sns_hashtag_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sns_hashtags SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = NEW.hashtag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sns_hashtags SET usage_count = GREATEST(0, usage_count - 1), updated_at = NOW() WHERE id = OLD.hashtag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sns_hashtag_usage_count ON sns_post_hashtags;
CREATE TRIGGER update_sns_hashtag_usage_count
  AFTER INSERT OR DELETE ON sns_post_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_sns_hashtag_stats();

-- updated_at自動更新
CREATE OR REPLACE FUNCTION update_sns_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sns_posts_updated_at ON sns_posts;
CREATE TRIGGER update_sns_posts_updated_at
  BEFORE UPDATE ON sns_posts
  FOR EACH ROW EXECUTE FUNCTION update_sns_updated_at_column();

DROP TRIGGER IF EXISTS update_sns_post_comments_updated_at ON sns_post_comments;
CREATE TRIGGER update_sns_post_comments_updated_at
  BEFORE UPDATE ON sns_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_sns_updated_at_column();

DROP TRIGGER IF EXISTS update_sns_hashtags_updated_at ON sns_hashtags;
CREATE TRIGGER update_sns_hashtags_updated_at
  BEFORE UPDATE ON sns_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_sns_updated_at_column();

-- ビューの作成（トレンドハッシュタグ用）
CREATE OR REPLACE VIEW sns_trending_hashtags AS
SELECT 
  h.id,
  h.name,
  h.usage_count,
  h.trending_score,
  COUNT(ph.id) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours') as recent_posts
FROM sns_hashtags h
LEFT JOIN sns_post_hashtags ph ON h.id = ph.hashtag_id
LEFT JOIN sns_posts p ON ph.post_id = p.id
GROUP BY h.id, h.name, h.usage_count, h.trending_score
ORDER BY h.trending_score DESC, h.usage_count DESC; 