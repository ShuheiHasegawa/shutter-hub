-- Migration: 20250813031847_fix_favorite_type_with_views
-- Description: ビューを削除してfavorite_typeカラムをTEXT型に変更後、ビューを再作成
-- Date: 2025-08-13

-- ========================================================================
-- ビュー削除 → カラム型変更 → ビュー再作成
-- ========================================================================

-- 1. 依存するビューを削除
DROP VIEW IF EXISTS studio_favorites_detail CASCADE;
DROP VIEW IF EXISTS photo_session_favorites_detail CASCADE;

-- 2. favorite_typeカラムをTEXT型に変更
ALTER TABLE user_favorites 
ALTER COLUMN favorite_type TYPE TEXT;

-- 3. favorite_typeカラムにCHECK制約を追加（ENUMの代替）
ALTER TABLE user_favorites 
DROP CONSTRAINT IF EXISTS user_favorites_favorite_type_check;

ALTER TABLE user_favorites 
ADD CONSTRAINT user_favorites_favorite_type_check 
CHECK (favorite_type IN ('studio', 'photo_session'));

-- 4. favorite_statisticsテーブルも同様に修正
ALTER TABLE favorite_statistics 
ALTER COLUMN target_type TYPE TEXT;

ALTER TABLE favorite_statistics 
DROP CONSTRAINT IF EXISTS favorite_statistics_target_type_check;

ALTER TABLE favorite_statistics 
ADD CONSTRAINT favorite_statistics_target_type_check 
CHECK (target_type IN ('studio', 'photo_session'));

-- 5. ENUMが残っていれば削除
DROP TYPE IF EXISTS favorite_type CASCADE;

-- 6. ビューを再作成（修正版）
CREATE VIEW studio_favorites_detail AS
SELECT 
  uf.id as favorite_id,
  uf.user_id,
  uf.favorite_id as studio_id,
  uf.created_at as favorited_at,
  s.name as studio_name,
  s.description as studio_description,
  s.location as studio_location,
  s.created_at as studio_created_at,
  COALESCE(fs.total_favorites, 0) as total_favorites
FROM user_favorites uf
JOIN studios s ON s.id = uf.favorite_id
LEFT JOIN favorite_statistics fs ON fs.target_type = 'studio' AND fs.target_id = uf.favorite_id
WHERE uf.favorite_type = 'studio';

CREATE VIEW photo_session_favorites_detail AS
SELECT 
  uf.id as favorite_id,
  uf.user_id,
  uf.favorite_id as session_id,
  uf.created_at as favorited_at,
  ps.title as session_title,
  ps.description as session_description,
  ps.location as session_location,
  ps.start_time as session_start_time,
  ps.created_at as session_created_at,
  COALESCE(fs.total_favorites, 0) as total_favorites
FROM user_favorites uf
JOIN photo_sessions ps ON ps.id = uf.favorite_id
LEFT JOIN favorite_statistics fs ON fs.target_type = 'photo_session' AND fs.target_id = uf.favorite_id
WHERE uf.favorite_type = 'photo_session';

-- 7. トリガーを再作成
DROP TRIGGER IF EXISTS update_favorite_statistics_trigger ON user_favorites;
DROP TRIGGER IF EXISTS update_favorites_updated_at_trigger ON user_favorites;

-- 統計更新トリガー
CREATE TRIGGER update_favorite_statistics_trigger
  AFTER INSERT OR DELETE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_favorite_statistics();

-- 更新日時トリガー  
CREATE TRIGGER update_favorites_updated_at_trigger
  BEFORE UPDATE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_favorites_updated_at();
