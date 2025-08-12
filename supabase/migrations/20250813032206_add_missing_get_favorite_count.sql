-- Migration: 20250813032206_add_missing_get_favorite_count
-- Description: 欠落しているget_favorite_count関数を追加してtoggle_favorite関数を完全修復
-- Date: 2025-08-13

-- ========================================================================
-- 欠落していたget_favorite_count関数の追加
-- ========================================================================

-- 1. get_favorite_count関数を作成
CREATE OR REPLACE FUNCTION get_favorite_count(
  target_type_param TEXT,
  target_id_param UUID
)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  -- favorite_statisticsテーブルから総お気に入り数を取得
  SELECT COALESCE(fs.total_favorites, 0)
  INTO count_result
  FROM favorite_statistics fs
  WHERE fs.target_type = target_type_param
  AND fs.target_id = target_id_param;
  
  -- レコードが存在しない場合は0を返す
  IF count_result IS NULL THEN
    count_result := 0;
  END IF;
  
  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. is_favorited_by_user関数も追加（必要に応じて）
CREATE OR REPLACE FUNCTION is_favorited_by_user(
  target_user_id UUID,
  target_type_param TEXT,
  target_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_favorited BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_favorites uf
    WHERE uf.user_id = target_user_id
    AND uf.favorite_type = target_type_param
    AND uf.favorite_id = target_id_param
  ) INTO is_favorited;
  
  RETURN COALESCE(is_favorited, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. update_favorites_updated_at関数（トリガー用）
CREATE OR REPLACE FUNCTION update_favorites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. トリガーを作成（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_favorites_updated_at') THEN
    CREATE TRIGGER update_user_favorites_updated_at
      BEFORE UPDATE ON user_favorites
      FOR EACH ROW
      EXECUTE FUNCTION update_favorites_updated_at();
  END IF;
END $$;
