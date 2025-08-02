-- 即座撮影システムの緊急度システム更新
-- 仕様書の修正に基づく変更: normal/urgent システムと優先表示機能

-- 既存データの緊急度を新しい形式に移行
UPDATE instant_photo_requests 
SET urgency = CASE 
  WHEN urgency = 'now' THEN 'urgent'
  WHEN urgency = 'within_30min' THEN 'urgent' 
  WHEN urgency = 'within_1hour' THEN 'normal'
  ELSE 'normal'
END
WHERE urgency IN ('now', 'within_30min', 'within_1hour');

-- 既存のチェック制約を削除
ALTER TABLE instant_photo_requests 
DROP CONSTRAINT IF EXISTS instant_photo_requests_urgency_check;

-- 新しいチェック制約を追加
ALTER TABLE instant_photo_requests 
ADD CONSTRAINT instant_photo_requests_urgency_check 
CHECK (urgency IN ('normal', 'urgent'));

-- 既存のrequest_typeチェック制約を削除
ALTER TABLE instant_photo_requests 
DROP CONSTRAINT IF EXISTS instant_photo_requests_request_type_check;

-- ペット撮影を含む新しいrequest_typeチェック制約を追加
ALTER TABLE instant_photo_requests 
ADD CONSTRAINT instant_photo_requests_request_type_check 
CHECK (request_type IN ('portrait', 'couple', 'family', 'group', 'landscape', 'pet'));

-- 既存のdurationチェック制約を削除
ALTER TABLE instant_photo_requests 
DROP CONSTRAINT IF EXISTS instant_photo_requests_duration_check;

-- 45分を含む新しいdurationチェック制約を追加
ALTER TABLE instant_photo_requests 
ADD CONSTRAINT instant_photo_requests_duration_check 
CHECK (duration IN (15, 30, 45, 60));

-- カメラマン検索ストアドプロシージャを更新（緊急度による優先表示）
CREATE OR REPLACE FUNCTION find_nearby_photographers_with_urgency(
  target_lat DECIMAL(10, 8),
  target_lng DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 1000,
  request_type TEXT DEFAULT NULL,
  max_budget INTEGER DEFAULT NULL,
  urgency_level TEXT DEFAULT 'normal'
)
RETURNS TABLE(
  photographer_id UUID,
  distance_meters INTEGER,
  rating DECIMAL(3, 2),
  instant_rate INTEGER,
  response_time_avg INTEGER,
  is_available BOOLEAN,
  urgency_priority INTEGER -- 緊急度による優先度
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.photographer_id,
    CAST(
      ST_Distance(
        ST_MakePoint(pl.longitude, pl.latitude)::geography,
        ST_MakePoint(target_lng, target_lat)::geography
      ) AS INTEGER
    ) AS distance_meters,
    COALESCE(pr.average_rating, 0.0) AS rating,
    COALESCE((pl.instant_rates ->> request_type)::INTEGER, 0) AS instant_rate,
    COALESCE(pr.average_response_time, 600) AS response_time_avg,
    (pl.is_online AND pl.accepting_requests AND (pl.available_until IS NULL OR pl.available_until > NOW())) AS is_available,
    CASE WHEN urgency_level = 'urgent' THEN 1 ELSE 0 END AS urgency_priority
  FROM photographer_locations pl
  LEFT JOIN profiles pr ON pr.id = pl.photographer_id
  WHERE pl.is_online = true
    AND pl.accepting_requests = true
    AND (pl.available_until IS NULL OR pl.available_until > NOW())
    AND ST_DWithin(
      ST_MakePoint(pl.longitude, pl.latitude)::geography,
      ST_MakePoint(target_lng, target_lat)::geography,
      LEAST(radius_meters, pl.response_radius)
    )
    AND (request_type IS NULL OR (pl.instant_rates ->> request_type) IS NOT NULL)
    AND (max_budget IS NULL OR (pl.instant_rates ->> request_type)::INTEGER <= max_budget)
  ORDER BY urgency_priority DESC, distance_meters ASC, rating DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自動マッチングストアドプロシージャを更新（緊急度対応）
CREATE OR REPLACE FUNCTION auto_match_request(
  request_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  matched_photographer_id UUID
) AS $$
DECLARE
  request_record instant_photo_requests%ROWTYPE;
  photographer_record RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- リクエスト情報取得
  SELECT * INTO request_record 
  FROM instant_photo_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'リクエストが見つかりません', NULL::UUID;
    RETURN;
  END IF;
  
  -- 近くのカメラマンを検索（緊急度による優先表示、上位3名に通知）
  FOR photographer_record IN
    SELECT * FROM find_nearby_photographers_with_urgency(
      request_record.location_lat,
      request_record.location_lng,
      1000, -- 1km以内
      request_record.request_type,
      request_record.budget,
      request_record.urgency
    )
    WHERE is_available = true
    ORDER BY urgency_priority DESC, distance_meters ASC, rating DESC
    LIMIT 3
  LOOP
    -- カメラマンに応答レコードを作成（通知用）
    INSERT INTO photographer_request_responses (
      request_id,
      photographer_id,
      response_type,
      distance_meters
    ) VALUES (
      request_id,
      photographer_record.photographer_id,
      'timeout', -- 初期状態はタイムアウト、応答時に更新
      photographer_record.distance_meters
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  IF notification_count = 0 THEN
    RETURN QUERY SELECT false, '近くに利用可能なカメラマンが見つかりませんでした', NULL::UUID;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, notification_count || '名のカメラマンに通知を送信しました（緊急度: ' || request_record.urgency || '）', NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- インデックスを追加（緊急度による検索最適化）
CREATE INDEX IF NOT EXISTS idx_instant_photo_requests_urgency ON instant_photo_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_instant_photo_requests_urgency_status ON instant_photo_requests(urgency, status);

-- コメント追加
COMMENT ON COLUMN instant_photo_requests.urgency IS '緊急度: normal(通常) または urgent(重要)。urgentはカメラマンに優先表示される';
COMMENT ON COLUMN instant_photo_requests.request_type IS '撮影タイプ: portrait, couple, family, group, landscape, pet';
COMMENT ON COLUMN instant_photo_requests.duration IS '撮影時間（分）: 15, 30, 45, 60分から選択';