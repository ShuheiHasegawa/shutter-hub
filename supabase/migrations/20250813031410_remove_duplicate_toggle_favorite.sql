-- Migration: 20250813031410_remove_duplicate_toggle_favorite
-- Description: 重複するtoggle_favorite関数を削除してオーバーロードエラーを解決
-- Date: 2025-08-13

-- ========================================================================
-- 古い関数を削除してオーバーロードエラーを解決
-- ========================================================================

-- 古いtoggle_favorite関数を削除（favorite_typeパラメータタイプが異なる場合）
DROP FUNCTION IF EXISTS toggle_favorite(UUID, public.favorite_type, UUID);
DROP FUNCTION IF EXISTS toggle_favorite(UUID, favorite_type, UUID);

-- 古いget_user_favorites関数も念のため削除
DROP FUNCTION IF EXISTS get_user_favorites(UUID, TEXT, INTEGER, INTEGER);

-- 新しい関数が正しく残っていることを確認するため、再作成
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

-- パラメータ名も修正したget_user_favorites関数を再作成
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
