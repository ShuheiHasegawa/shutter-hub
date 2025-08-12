-- Migration: 20250805000004_create_favorites_system
-- Description: ユーザーお気に入り機能実装 - スタジオ・撮影会のお気に入り登録システム
-- Features: ポリモーフィックお気に入り、統合管理、パフォーマンス最適化
-- Created: 2025-08-05

-- ========================================================================
-- 1. ユーザーお気に入りテーブル (ポリモーフィックデザイン)
-- ========================================================================

CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- ポリモーフィック参照（スタジオ・撮影会両対応）
  favorite_type TEXT NOT NULL CHECK (favorite_type IN ('studio', 'photo_session')),
  favorite_id UUID NOT NULL,
  
  -- メタ情報
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 同じユーザーが同じ対象を重複お気に入り登録できない
  UNIQUE(user_id, favorite_type, favorite_id)
);

-- ========================================================================
-- 2. お気に入り統計テーブル（パフォーマンス最適化用）
-- ========================================================================

CREATE TABLE favorite_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- ポリモーフィック参照
  target_type TEXT NOT NULL CHECK (target_type IN ('studio', 'photo_session')),
  target_id UUID NOT NULL,
  
  -- 統計情報
  total_favorites INTEGER DEFAULT 0,
  favorites_today INTEGER DEFAULT 0,
  favorites_this_week INTEGER DEFAULT 0,
  favorites_this_month INTEGER DEFAULT 0,
  
  -- 更新情報
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 同じ対象は1つの統計レコードのみ
  UNIQUE(target_type, target_id)
);

-- ========================================================================
-- インデックス作成
-- ========================================================================

-- ユーザーお気に入り
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_favorite_type ON user_favorites(favorite_type);
CREATE INDEX idx_user_favorites_favorite_id ON user_favorites(favorite_id);
CREATE INDEX idx_user_favorites_type_id ON user_favorites(favorite_type, favorite_id);
CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at);

-- お気に入り統計
CREATE INDEX idx_favorite_statistics_target_type ON favorite_statistics(target_type);
CREATE INDEX idx_favorite_statistics_target_id ON favorite_statistics(target_id);
CREATE INDEX idx_favorite_statistics_total ON favorite_statistics(total_favorites);

-- ========================================================================
-- RLS (Row Level Security) 設定
-- ========================================================================

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_statistics ENABLE ROW LEVEL SECURITY;

-- ユーザーお気に入りのRLSポリシー
CREATE POLICY "Users can view their own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- お気に入り統計のRLSポリシー（読み取り専用）
CREATE POLICY "Anyone can view favorite statistics" ON favorite_statistics
  FOR SELECT USING (true);

-- ========================================================================
-- トリガー関数とトリガー
-- ========================================================================

-- お気に入り統計更新関数
CREATE OR REPLACE FUNCTION update_favorite_statistics()
RETURNS TRIGGER AS $$
DECLARE
  target_type_val TEXT;
  target_id_val UUID;
  operation_type TEXT;
BEGIN
  -- トリガー操作タイプの決定
  IF TG_OP = 'INSERT' THEN
    target_type_val := NEW.favorite_type;
    target_id_val := NEW.favorite_id;
    operation_type := 'increment';
  ELSIF TG_OP = 'DELETE' THEN
    target_type_val := OLD.favorite_type;
    target_id_val := OLD.favorite_id;
    operation_type := 'decrement';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 統計レコードの更新または作成
  INSERT INTO favorite_statistics (target_type, target_id, total_favorites, last_updated)
  VALUES (
    target_type_val, 
    target_id_val, 
    CASE WHEN operation_type = 'increment' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (target_type, target_id) 
  DO UPDATE SET
    total_favorites = CASE 
      WHEN operation_type = 'increment' THEN favorite_statistics.total_favorites + 1
      WHEN operation_type = 'decrement' THEN GREATEST(favorite_statistics.total_favorites - 1, 0)
      ELSE favorite_statistics.total_favorites
    END,
    last_updated = NOW();

  -- 今日・今週・今月の統計も更新（簡易版 - 新規お気に入りのみカウント）
  IF operation_type = 'increment' THEN
    UPDATE favorite_statistics 
    SET 
      favorites_today = favorites_today + 1,
      favorites_this_week = favorites_this_week + 1,
      favorites_this_month = favorites_this_month + 1
    WHERE target_type = target_type_val AND target_id = target_id_val;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 更新時間自動更新関数
CREATE OR REPLACE FUNCTION update_favorites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER update_user_favorites_statistics
  AFTER INSERT OR DELETE ON user_favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorite_statistics();

CREATE TRIGGER update_user_favorites_updated_at
  BEFORE UPDATE ON user_favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorites_updated_at();

-- ========================================================================
-- 便利関数
-- ========================================================================

-- ユーザーのお気に入り確認関数
CREATE OR REPLACE FUNCTION is_favorited_by_user(
  check_user_id UUID,
  check_type TEXT,
  check_target_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_favorites 
    WHERE user_id = check_user_id 
    AND favorite_type = check_type 
    AND favorite_id = check_target_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- お気に入り数取得関数
CREATE OR REPLACE FUNCTION get_favorite_count(
  check_type TEXT,
  check_target_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT total_favorites INTO count_result
  FROM favorite_statistics
  WHERE target_type = check_type AND target_id = check_target_id;
  
  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- お気に入り追加/削除関数（楽観的更新用）
CREATE OR REPLACE FUNCTION toggle_favorite(
  target_user_id UUID,
  target_type TEXT,
  target_id UUID
)
RETURNS JSONB AS $$
DECLARE
  favorite_exists BOOLEAN;
  new_favorite_id UUID;
  result JSONB;
BEGIN
  -- 現在のお気に入り状態を確認
  SELECT EXISTS (
    SELECT 1 FROM user_favorites 
    WHERE user_id = target_user_id 
    AND favorite_type = target_type 
    AND favorite_id = target_id
  ) INTO favorite_exists;

  IF favorite_exists THEN
    -- お気に入りを削除
    DELETE FROM user_favorites 
    WHERE user_id = target_user_id 
    AND favorite_type = target_type 
    AND favorite_id = target_id;
    
    result := jsonb_build_object(
      'success', true,
      'action', 'removed',
      'is_favorited', false,
      'message', 'お気に入りから削除しました'
    );
  ELSE
    -- お気に入りを追加
    INSERT INTO user_favorites (user_id, favorite_type, favorite_id)
    VALUES (target_user_id, target_type, target_id)
    RETURNING id INTO new_favorite_id;
    
    result := jsonb_build_object(
      'success', true,
      'action', 'added',
      'is_favorited', true,
      'favorite_id', new_favorite_id,
      'message', 'お気に入りに追加しました'
    );
  END IF;

  -- 最新のお気に入り数を取得して結果に追加
  result := result || jsonb_build_object(
    'total_favorites', get_favorite_count(target_type, target_id)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーのお気に入り一覧取得関数（ページネーション対応）
CREATE OR REPLACE FUNCTION get_user_favorites(
  target_user_id UUID,
  target_type TEXT DEFAULT NULL,
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  favorite_id UUID,
  favorite_type TEXT,
  target_id UUID,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uf.id as favorite_id,
    uf.favorite_type,
    uf.favorite_id as target_id,
    uf.created_at,
    COUNT(*) OVER() as total_count
  FROM user_favorites uf
  WHERE uf.user_id = target_user_id
  AND (target_type IS NULL OR uf.favorite_type = target_type)
  ORDER BY uf.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- ビュー作成（便利なクエリ用）
-- ========================================================================

-- スタジオお気に入り詳細ビュー
CREATE VIEW studio_favorites_detail AS
SELECT 
  uf.id as favorite_id,
  uf.user_id,
  uf.created_at as favorited_at,
  s.id as studio_id,
  s.name as studio_name,
  s.address,
  s.prefecture,
  s.city,
  s.hourly_rate_min,
  s.hourly_rate_max,
  fs.total_favorites,
  COALESCE(se.overall_rating, 0) as avg_rating
FROM user_favorites uf
JOIN studios s ON s.id = uf.favorite_id
LEFT JOIN favorite_statistics fs ON fs.target_type = 'studio' AND fs.target_id = s.id
LEFT JOIN (
  SELECT 
    studio_id, 
    AVG(overall_rating) as overall_rating
  FROM studio_evaluations 
  GROUP BY studio_id
) se ON se.studio_id = s.id
WHERE uf.favorite_type = 'studio';

-- 撮影会お気に入り詳細ビュー
CREATE VIEW photo_session_favorites_detail AS
SELECT 
  uf.id as favorite_id,
  uf.user_id,
  uf.created_at as favorited_at,
  ps.id as photo_session_id,
  ps.title,
  ps.description,
  ps.start_time,
  ps.end_time,
  ps.location_name,
  ps.price_per_person,
  ps.max_participants,
  ps.booking_type,
  fs.total_favorites,
  (
    SELECT COUNT(*) 
    FROM bookings b 
    WHERE b.photo_session_id = ps.id AND b.status = 'confirmed'
  ) as current_participants
FROM user_favorites uf
JOIN photo_sessions ps ON ps.id = uf.favorite_id
LEFT JOIN favorite_statistics fs ON fs.target_type = 'photo_session' AND fs.target_id = ps.id
WHERE uf.favorite_type = 'photo_session';

-- ========================================================================
-- コメント追加
-- ========================================================================

COMMENT ON TABLE user_favorites IS 'ユーザーお気に入り - スタジオ・撮影会のお気に入り登録';
COMMENT ON TABLE favorite_statistics IS 'お気に入り統計 - パフォーマンス最適化用統計データ';

COMMENT ON FUNCTION is_favorited_by_user(UUID, TEXT, UUID) IS 'ユーザーお気に入り確認関数';
COMMENT ON FUNCTION get_favorite_count(TEXT, UUID) IS 'お気に入り数取得関数';
COMMENT ON FUNCTION toggle_favorite(UUID, TEXT, UUID) IS 'お気に入り追加/削除関数（楽観的更新用）';
COMMENT ON FUNCTION get_user_favorites(UUID, TEXT, INTEGER, INTEGER) IS 'ユーザーお気に入り一覧取得関数（ページネーション対応）';

COMMENT ON VIEW studio_favorites_detail IS 'スタジオお気に入り詳細ビュー - お気に入り一覧表示用';
COMMENT ON VIEW photo_session_favorites_detail IS '撮影会お気に入り詳細ビュー - お気に入り一覧表示用';
