-- Migration: 20250813031947_fix_favorite_type_corrected
-- Description: ビューを削除してfavorite_typeカラムをTEXT型に変更後、正しいカラム名でビューを再作成
-- Date: 2025-08-13

-- ========================================================================
-- ビュー削除 → カラム型変更 → 正しいビューの再作成
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

-- 5. スタジオお気に入り詳細ビューを再作成（正しいカラム名で）
CREATE VIEW studio_favorites_detail AS
SELECT 
  uf.id,
  uf.user_id,
  uf.favorite_id as studio_id,
  uf.created_at as favorited_at,
  s.name as studio_name,
  s.description as studio_description,
  s.address as studio_address,  -- location → address に修正
  s.prefecture,
  s.city,
  s.hourly_rate_min,
  s.hourly_rate_max,
  COALESCE(fs.total_favorites, 0) as total_favorites
FROM user_favorites uf
JOIN studios s ON s.id = uf.favorite_id
LEFT JOIN favorite_statistics fs 
  ON fs.target_type = 'studio' 
  AND fs.target_id = uf.favorite_id
WHERE uf.favorite_type = 'studio';

-- 6. 撮影会お気に入り詳細ビューを再作成（正しいカラム名で）
CREATE VIEW photo_session_favorites_detail AS
SELECT 
  uf.id,
  uf.user_id,
  uf.favorite_id as photo_session_id,
  uf.created_at as favorited_at,
  ps.title as session_title,
  ps.description as session_description,
  ps.location as session_location,  -- 正しいカラム名を確認済み
  ps.start_time,
  ps.end_time,
  ps.price_per_person,
  ps.max_participants,
  ps.current_participants,
  COALESCE(fs.total_favorites, 0) as total_favorites
FROM user_favorites uf
JOIN photo_sessions ps ON ps.id = uf.favorite_id
LEFT JOIN favorite_statistics fs 
  ON fs.target_type = 'photo_session' 
  AND fs.target_id = uf.favorite_id
WHERE uf.favorite_type = 'photo_session';

-- 7. 既存のtoggle_favorite関数を再作成（TEXT型で動作確認）
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
  favorite_count INTEGER;
BEGIN
  -- 現在のお気に入り状態を確認（エイリアスで曖昧性解消）
  SELECT EXISTS (
    SELECT 1 FROM user_favorites uf
    WHERE uf.user_id = target_user_id
    AND uf.favorite_type = target_type
    AND uf.favorite_id = target_id
  ) INTO favorite_exists;

  IF favorite_exists THEN
    -- お気に入りから削除
    DELETE FROM user_favorites uf
    WHERE uf.user_id = target_user_id
    AND uf.favorite_type = target_type
    AND uf.favorite_id = target_id;
    
    result := jsonb_build_object(
      'success', true,
      'action', 'removed',
      'is_favorited', false,
      'message', 'お気に入りから削除しました'
    );
  ELSE
    -- お気に入りに追加
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

  -- 総お気に入り数を取得
  SELECT get_favorite_count(target_type, target_id) INTO favorite_count;
  
  result := result || jsonb_build_object(
    'total_favorites', favorite_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
