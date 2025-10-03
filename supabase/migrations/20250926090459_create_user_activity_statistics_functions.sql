-- Migration: 019_create_user_activity_statistics_functions
-- Description: ユーザー活動統計取得のためのPostgreSQL関数群を作成
-- Date: 2025-09-26

-- 月別活動統計取得関数
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
    FROM photo_session_bookings psb
    JOIN photo_sessions ps ON psb.photo_session_id = ps.id
    WHERE psb.user_id = target_user_id
      AND psb.status = 'confirmed'
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

-- 撮影会タイプ分布取得関数
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
    SELECT 
      CASE 
        WHEN ps.location_type = 'studio' THEN 'スタジオ撮影'
        WHEN ps.location_type = 'outdoor' THEN '屋外撮影'
        WHEN ps.location_type = 'event' THEN 'イベント撮影'
        ELSE 'その他'
      END as type_name,
      COUNT(*)::INTEGER as count
    FROM photo_session_bookings psb
    JOIN photo_sessions ps ON psb.photo_session_id = ps.id
    WHERE psb.user_id = target_user_id
      AND psb.status = 'confirmed'
      AND ps.start_time >= NOW() - INTERVAL '12 months'
    GROUP BY ps.location_type
    
    UNION ALL
    
    SELECT 
      CASE 
        WHEN ps.location_type = 'studio' THEN 'スタジオ撮影'
        WHEN ps.location_type = 'outdoor' THEN '屋外撮影'
        WHEN ps.location_type = 'event' THEN 'イベント撮影'
        ELSE 'その他'
      END as type_name,
      COUNT(*)::INTEGER as count
    FROM photo_sessions ps
    WHERE ps.organizer_id = target_user_id
      AND ps.start_time >= NOW() - INTERVAL '12 months'
    GROUP BY ps.location_type
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

-- 評価推移取得関数
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
    -- 参加者としての評価（受信レビュー）
    SELECT 
      to_char(r.created_at, 'YYYY-MM') as period,
      AVG(r.rating) as avg_rating,
      COUNT(*)::INTEGER as count
    FROM reviews r
    WHERE r.reviewed_user_id = target_user_id
      AND r.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY to_char(r.created_at, 'YYYY-MM')
    
    UNION ALL
    
    -- 主催者としての評価（撮影会の評価）
    SELECT 
      to_char(r.created_at, 'YYYY-MM') as period,
      AVG(r.rating) as avg_rating,
      COUNT(*)::INTEGER as count
    FROM reviews r
    JOIN photo_sessions ps ON r.photo_session_id = ps.id
    WHERE ps.organizer_id = target_user_id
      AND r.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY to_char(r.created_at, 'YYYY-MM')
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

-- RLS設定（関数のセキュリティは SECURITY DEFINER で制御）
-- これらの関数は認証されたユーザーが自分自身または他人の統計を閲覧可能

-- 統計表示権限の確認用関数
CREATE OR REPLACE FUNCTION can_view_user_statistics(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 自分自身の統計は常に表示可能
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- 他人の統計も表示可能（プロフィールは公開前提）
  -- 将来的にプライバシー設定を追加する場合はここで制御
  RETURN TRUE;
END;
$$;

