-- Migration: 20251105023950_fix_user_activity_statistics_functions
-- Description: ユーザー活動統計関数のテーブル参照を修正（photo_session_bookings→bookings, reviews→user_reviews/photo_session_reviews）
-- Date: 2025-11-05

-- ========================================================================
-- 1. 月別活動統計取得関数の修正
-- ========================================================================
CREATE OR REPLACE FUNCTION get_monthly_activity_stats(target_user_id UUID)
RETURNS TABLE (
  month TEXT,
  participated INTEGER,
  organized INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      to_char(
        date_trunc('month', NOW() - INTERVAL '11 months') + 
        INTERVAL '1 month' * generate_series(0, 11), 
        'YYYY-MM'
      ) as month
  ),
  participated_sessions AS (
    SELECT 
      to_char(ps.start_time, 'YYYY-MM') as month,
      COUNT(*)::INTEGER as count
    FROM bookings b
    JOIN photo_sessions ps ON b.photo_session_id = ps.id
    WHERE b.user_id = target_user_id
      AND b.status = 'confirmed'
      AND ps.start_time >= NOW() - INTERVAL '12 months'
      AND ps.start_time < NOW()
    GROUP BY to_char(ps.start_time, 'YYYY-MM')
  ),
  organized_sessions AS (
    SELECT 
      to_char(start_time, 'YYYY-MM') as month,
      COUNT(*)::INTEGER as count
    FROM photo_sessions
    WHERE organizer_id = target_user_id
      AND start_time >= NOW() - INTERVAL '12 months'
      AND start_time < NOW()
    GROUP BY to_char(start_time, 'YYYY-MM')
  )
  SELECT 
    m.month,
    COALESCE(p.count, 0) as participated,
    COALESCE(o.count, 0) as organized
  FROM months m
  LEFT JOIN participated_sessions p ON m.month = p.month
  LEFT JOIN organized_sessions o ON m.month = o.month
  ORDER BY m.month;
END;
$$;

-- ========================================================================
-- 2. 撮影会タイプ分布取得関数の修正
-- ========================================================================
-- 注意: location_typeカラムが存在しないため、locationフィールドから判定
-- または、スタジオとの関連から判定（将来的に改善可能）
CREATE OR REPLACE FUNCTION get_session_type_distribution(target_user_id UUID)
RETURNS TABLE (
  name TEXT,
  value INTEGER,
  color TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH session_types AS (
    -- 参加した撮影会のタイプ判定
    SELECT 
      CASE 
        WHEN ps.location ILIKE '%スタジオ%' OR EXISTS (
          SELECT 1 FROM photo_session_studios pss 
          WHERE pss.photo_session_id = ps.id
        ) THEN 'スタジオ撮影'
        WHEN ps.location ILIKE '%屋外%' OR ps.location ILIKE '%公園%' OR ps.location ILIKE '%野外%' THEN '屋外撮影'
        WHEN ps.location ILIKE '%イベント%' OR ps.location ILIKE '%会場%' THEN 'イベント撮影'
        ELSE 'その他'
      END as type_name,
      COUNT(*)::INTEGER as count
    FROM bookings b
    JOIN photo_sessions ps ON b.photo_session_id = ps.id
    WHERE b.user_id = target_user_id
      AND b.status = 'confirmed'
      AND ps.start_time >= NOW() - INTERVAL '12 months'
    GROUP BY type_name
    
    UNION ALL
    
    -- 主催した撮影会のタイプ判定
    SELECT 
      CASE 
        WHEN ps.location ILIKE '%スタジオ%' OR EXISTS (
          SELECT 1 FROM photo_session_studios pss 
          WHERE pss.photo_session_id = ps.id
        ) THEN 'スタジオ撮影'
        WHEN ps.location ILIKE '%屋外%' OR ps.location ILIKE '%公園%' OR ps.location ILIKE '%野外%' THEN '屋外撮影'
        WHEN ps.location ILIKE '%イベント%' OR ps.location ILIKE '%会場%' THEN 'イベント撮影'
        ELSE 'その他'
      END as type_name,
      COUNT(*)::INTEGER as count
    FROM photo_sessions ps
    WHERE ps.organizer_id = target_user_id
      AND ps.start_time >= NOW() - INTERVAL '12 months'
    GROUP BY type_name
  ),
  aggregated_types AS (
    SELECT 
      type_name,
      SUM(count)::INTEGER as total_count
    FROM session_types
    GROUP BY type_name
    HAVING SUM(count) > 0
  )
  SELECT 
    at.type_name as name,
    at.total_count as value,
    CASE at.type_name
      WHEN 'スタジオ撮影' THEN 'hsl(var(--chart-1))'
      WHEN '屋外撮影' THEN 'hsl(var(--chart-2))'
      WHEN 'イベント撮影' THEN 'hsl(var(--chart-3))'
      ELSE 'hsl(var(--chart-4))'
    END as color
  FROM aggregated_types at
  ORDER BY at.total_count DESC;
END;
$$;

-- ========================================================================
-- 3. 評価推移取得関数の修正
-- ========================================================================
-- user_reviewsとphoto_session_reviewsを使用し、overall_rating（1,3,5のみ）を参照
CREATE OR REPLACE FUNCTION get_rating_trend(target_user_id UUID)
RETURNS TABLE (
  date TEXT,
  rating NUMERIC,
  session_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_ratings AS (
    -- 参加者としての評価（user_reviewsから受信レビュー）
    SELECT 
      to_char(ur.created_at, 'YYYY-MM') as period,
      AVG(ur.overall_rating::NUMERIC) as avg_rating,
      COUNT(*)::INTEGER as count
    FROM user_reviews ur
    WHERE ur.reviewee_id = target_user_id
      AND ur.status = 'published'
      AND ur.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY to_char(ur.created_at, 'YYYY-MM')
    
    UNION ALL
    
    -- 主催者としての評価（photo_session_reviewsから撮影会の評価）
    SELECT 
      to_char(psr.created_at, 'YYYY-MM') as period,
      AVG(psr.overall_rating::NUMERIC) as avg_rating,
      COUNT(*)::INTEGER as count
    FROM photo_session_reviews psr
    JOIN photo_sessions ps ON psr.photo_session_id = ps.id
    WHERE ps.organizer_id = target_user_id
      AND psr.status = 'published'
      AND psr.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY to_char(psr.created_at, 'YYYY-MM')
  ),
  aggregated_ratings AS (
    SELECT 
      period,
      AVG(avg_rating) as final_rating,
      SUM(count)::INTEGER as total_sessions
    FROM monthly_ratings
    GROUP BY period
    HAVING AVG(avg_rating) IS NOT NULL
  )
  SELECT 
    ar.period as date,
    ROUND(ar.final_rating, 2) as rating,
    ar.total_sessions as session_count
  FROM aggregated_ratings ar
  ORDER BY ar.period;
END;
$$;

