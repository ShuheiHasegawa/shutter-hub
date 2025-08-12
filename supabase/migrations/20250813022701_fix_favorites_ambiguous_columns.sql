-- Migration: 20250813022701_fix_favorites_ambiguous_columns
-- Description: お気に入り機能のカラム参照曖昧性エラー修正
-- Date: 2025-08-13

-- ========================================================================
-- toggle_favorite関数の修正（カラム参照を明確化）
-- ========================================================================

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
  -- 現在のお気に入り状態を確認
  SELECT EXISTS (
    SELECT 1 FROM user_favorites uf
    WHERE uf.user_id = target_user_id 
    AND uf.favorite_type = target_type 
    AND uf.favorite_id = target_id
  ) INTO favorite_exists;

  IF favorite_exists THEN
    -- お気に入りを削除
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
  SELECT get_favorite_count(target_type, target_id) INTO favorite_count;
  result := result || jsonb_build_object(
    'total_favorites', favorite_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- get_user_favorites関数の修正（カラム参照を明確化）
-- ========================================================================

CREATE OR REPLACE FUNCTION get_user_favorites(
  target_user_id UUID,
  filter_type TEXT DEFAULT NULL,
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
  AND (filter_type IS NULL OR uf.favorite_type = filter_type)
  ORDER BY uf.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- ビューの修正（カラム参照を明確化）
-- ========================================================================

-- スタジオお気に入り詳細ビューを再作成
DROP VIEW IF EXISTS studio_favorites_detail;
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
  COALESCE(fs.total_favorites, 0) as total_favorites,
  COALESCE(se.overall_rating, 0) as avg_rating
FROM user_favorites uf
JOIN studios s ON s.id = uf.favorite_id
LEFT JOIN favorite_statistics fs ON fs.target_type = 'studio' AND fs.target_id = uf.favorite_id
LEFT JOIN (
  SELECT 
    studio_id, 
    AVG(overall_rating) as overall_rating
  FROM studio_evaluations 
  GROUP BY studio_id
) se ON se.studio_id = uf.favorite_id
WHERE uf.favorite_type = 'studio';

-- 撮影会お気に入り詳細ビューを再作成
DROP VIEW IF EXISTS photo_session_favorites_detail;
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
  ps.location,
  ps.price_per_person,
  ps.max_participants,
  ps.booking_type,
  COALESCE(fs.total_favorites, 0) as total_favorites,
  (
    SELECT COUNT(*) 
    FROM bookings b 
    WHERE b.photo_session_id = uf.favorite_id AND b.status = 'confirmed'
  ) as current_participants
FROM user_favorites uf
JOIN photo_sessions ps ON ps.id = uf.favorite_id
LEFT JOIN favorite_statistics fs ON fs.target_type = 'photo_session' AND fs.target_id = uf.favorite_id
WHERE uf.favorite_type = 'photo_session';

-- ========================================================================
-- 一括お気に入り状態取得関数の追加
-- ========================================================================

CREATE OR REPLACE FUNCTION get_bulk_favorite_status(
  target_user_id UUID,
  target_items JSONB -- [{"type": "studio", "id": "uuid"}, ...]
)
RETURNS TABLE (
  item_key TEXT,
  is_favorited BOOLEAN,
  favorite_count INTEGER
) AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN 
    SELECT 
      (value->>'type')::TEXT as item_type,
      (value->>'id')::UUID as item_id
    FROM jsonb_array_elements(target_items)
  LOOP
    RETURN QUERY
    SELECT 
      CONCAT(item.item_type, '_', item.item_id) as item_key,
      EXISTS (
        SELECT 1 FROM user_favorites uf
        WHERE uf.user_id = target_user_id 
        AND uf.favorite_type = item.item_type
        AND uf.favorite_id = item.item_id
      ) as is_favorited,
      get_favorite_count(item.item_type, item.item_id) as favorite_count;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
