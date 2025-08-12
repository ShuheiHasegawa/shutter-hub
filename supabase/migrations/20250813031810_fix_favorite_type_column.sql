-- Migration: 20250813031810_fix_favorite_type_column
-- Description: favorite_typeカラムをENUM型からTEXT型に変更してオペレーターエラーを解決
-- Date: 2025-08-13

-- ========================================================================
-- favorite_typeカラムの型変更でオペレーターエラーを解決
-- ========================================================================

-- 1. favorite_typeカラムをTEXT型に変更
ALTER TABLE user_favorites 
ALTER COLUMN favorite_type TYPE TEXT;

-- 2. favorite_typeカラムにCHECK制約を追加（ENUMの代替）
ALTER TABLE user_favorites 
DROP CONSTRAINT IF EXISTS user_favorites_favorite_type_check;

ALTER TABLE user_favorites 
ADD CONSTRAINT user_favorites_favorite_type_check 
CHECK (favorite_type IN ('studio', 'photo_session'));

-- 3. favorite_statisticsテーブルも同様に修正
ALTER TABLE favorite_statistics 
ALTER COLUMN target_type TYPE TEXT;

ALTER TABLE favorite_statistics 
DROP CONSTRAINT IF EXISTS favorite_statistics_target_type_check;

ALTER TABLE favorite_statistics 
ADD CONSTRAINT favorite_statistics_target_type_check 
CHECK (target_type IN ('studio', 'photo_session'));

-- 4. ENUMが残っていれば削除（エラーを無視）
DROP TYPE IF EXISTS favorite_type CASCADE;

-- 5. 関数が正しく動作することを確認するため、トリガーを再作成
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
