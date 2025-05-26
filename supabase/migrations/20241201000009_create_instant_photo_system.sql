-- 即座撮影リクエストシステム
-- 旅行先や外出先でその場にいるカメラマンに即座撮影を依頼できるリアルタイムマッチング機能

-- 即座撮影リクエストテーブル
CREATE TABLE instant_photo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ゲスト情報（認証不要）
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  party_size INTEGER DEFAULT 1,
  
  -- 位置情報
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  location_address TEXT,
  location_landmark TEXT, -- 近くの観光地
  
  -- リクエスト内容
  request_type TEXT NOT NULL CHECK (request_type IN ('portrait', 'couple', 'family', 'group', 'landscape')),
  urgency TEXT NOT NULL CHECK (urgency IN ('now', 'within_30min', 'within_1hour')),
  duration INTEGER NOT NULL CHECK (duration IN (15, 30, 60)), -- 分
  budget INTEGER NOT NULL,
  special_requests TEXT,
  
  -- マッチング・ステータス
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'expired')),
  matched_photographer_id UUID REFERENCES auth.users(id),
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  matched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- 制約
  CHECK (party_size > 0 AND party_size <= 20),
  CHECK (budget >= 1000 AND budget <= 50000),
  CHECK (expires_at > created_at)
);

-- カメラマンリアルタイム位置情報テーブル
CREATE TABLE photographer_locations (
  photographer_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 位置情報
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(5, 2), -- GPS精度（メートル）
  
  -- オンライン状態
  is_online BOOLEAN DEFAULT false,
  available_until TIMESTAMPTZ,
  accepting_requests BOOLEAN DEFAULT true,
  response_radius INTEGER DEFAULT 1000, -- 応答範囲（メートル）
  
  -- 即座撮影料金設定
  instant_rates JSONB DEFAULT '{}', -- {"portrait": 3000, "couple": 5000, ...}
  
  -- 現在の予約状況
  current_booking_id UUID,
  
  -- 更新日時
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  CHECK (response_radius >= 500 AND response_radius <= 10000)
);

-- 即座撮影予約テーブル
CREATE TABLE instant_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 関連ID
  request_id UUID NOT NULL REFERENCES instant_photo_requests(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 撮影情報
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  actual_duration INTEGER, -- 実際の撮影時間（分）
  
  -- 成果物
  photos_delivered INTEGER DEFAULT 0,
  delivery_url TEXT, -- 写真配信URL
  
  -- 評価
  guest_rating INTEGER CHECK (guest_rating >= 1 AND guest_rating <= 5),
  photographer_rating INTEGER CHECK (photographer_rating >= 1 AND photographer_rating <= 5),
  guest_review TEXT,
  photographer_review TEXT,
  
  -- 支払い
  total_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL, -- プラットフォーム手数料
  photographer_earnings INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method TEXT,
  
  -- 特別料金
  rush_fee INTEGER DEFAULT 0, -- 緊急料金
  holiday_fee INTEGER DEFAULT 0, -- 休日料金
  night_fee INTEGER DEFAULT 0, -- 夜間料金
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  UNIQUE(request_id), -- 1リクエストにつき1予約
  CHECK (total_amount = photographer_earnings + platform_fee),
  CHECK (actual_duration >= 0 AND actual_duration <= 120)
);

-- カメラマンリクエスト応答履歴テーブル
CREATE TABLE photographer_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 関連ID
  request_id UUID NOT NULL REFERENCES instant_photo_requests(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 応答内容
  response_type TEXT NOT NULL CHECK (response_type IN ('accept', 'decline', 'timeout')),
  response_time TIMESTAMPTZ DEFAULT NOW(),
  decline_reason TEXT,
  estimated_arrival_time INTEGER, -- 到着予定時間（分）
  
  -- 計算用データ
  distance_meters INTEGER, -- リクエスト地点からの距離
  response_time_seconds INTEGER, -- 応答時間（秒）
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  UNIQUE(request_id, photographer_id), -- 1リクエストに対して1カメラマンは1回のみ応答
  CHECK (estimated_arrival_time >= 0 AND estimated_arrival_time <= 60)
);

-- ゲスト利用履歴テーブル（ゲスト制限管理用）
CREATE TABLE guest_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ゲスト識別情報
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  
  -- 利用情報
  request_id UUID NOT NULL REFERENCES instant_photo_requests(id) ON DELETE CASCADE,
  usage_month TEXT NOT NULL, -- 'YYYY-MM' 形式
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス用制約
  UNIQUE(guest_phone, request_id)
);

-- インデックス作成
CREATE INDEX idx_instant_photo_requests_status ON instant_photo_requests(status);
CREATE INDEX idx_instant_photo_requests_location ON instant_photo_requests(location_lat, location_lng);
CREATE INDEX idx_instant_photo_requests_created_at ON instant_photo_requests(created_at);
CREATE INDEX idx_instant_photo_requests_expires_at ON instant_photo_requests(expires_at);

CREATE INDEX idx_photographer_locations_online ON photographer_locations(is_online, accepting_requests);
CREATE INDEX idx_photographer_locations_location ON photographer_locations(latitude, longitude);
CREATE INDEX idx_photographer_locations_updated_at ON photographer_locations(updated_at);

CREATE INDEX idx_instant_bookings_request_id ON instant_bookings(request_id);
CREATE INDEX idx_instant_bookings_photographer_id ON instant_bookings(photographer_id);
CREATE INDEX idx_instant_bookings_created_at ON instant_bookings(created_at);

CREATE INDEX idx_photographer_request_responses_request_id ON photographer_request_responses(request_id);
CREATE INDEX idx_photographer_request_responses_photographer_id ON photographer_request_responses(photographer_id);

CREATE INDEX idx_guest_usage_history_phone_month ON guest_usage_history(guest_phone, usage_month);

-- RLS (Row Level Security) 設定
ALTER TABLE instant_photo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_usage_history ENABLE ROW LEVEL SECURITY;

-- 即座撮影リクエスト: 誰でも閲覧可能（ゲスト機能のため）
CREATE POLICY "instant_photo_requests_read_policy" ON instant_photo_requests
  FOR SELECT USING (true);

-- 即座撮影リクエスト: 誰でも作成可能（ゲスト機能のため）
CREATE POLICY "instant_photo_requests_insert_policy" ON instant_photo_requests
  FOR INSERT WITH CHECK (true);

-- 即座撮影リクエスト: 本人またはマッチしたカメラマンのみ更新可能
CREATE POLICY "instant_photo_requests_update_policy" ON instant_photo_requests
  FOR UPDATE USING (
    guest_phone = current_setting('instant.guest_phone', true) OR
    matched_photographer_id = auth.uid()
  );

-- カメラマン位置情報: カメラマン本人のみアクセス可能
CREATE POLICY "photographer_locations_policy" ON photographer_locations
  FOR ALL USING (photographer_id = auth.uid());

-- 即座撮影予約: 関係者のみアクセス可能
CREATE POLICY "instant_bookings_read_policy" ON instant_bookings
  FOR SELECT USING (
    photographer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM instant_photo_requests ipr
      WHERE ipr.id = request_id
      AND ipr.guest_phone = current_setting('instant.guest_phone', true)
    )
  );

CREATE POLICY "instant_bookings_insert_policy" ON instant_bookings
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "instant_bookings_update_policy" ON instant_bookings
  FOR UPDATE USING (
    photographer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM instant_photo_requests ipr
      WHERE ipr.id = request_id
      AND ipr.guest_phone = current_setting('instant.guest_phone', true)
    )
  );

-- カメラマン応答履歴: カメラマン本人のみアクセス可能
CREATE POLICY "photographer_request_responses_policy" ON photographer_request_responses
  FOR ALL USING (photographer_id = auth.uid());

-- ゲスト利用履歴: 管理者のみアクセス可能（将来的に管理機能で使用）
CREATE POLICY "guest_usage_history_admin_policy" ON guest_usage_history
  FOR ALL USING (false); -- 現在は無効化、管理機能実装時に更新

-- ストアドプロシージャ: 近くのオンラインカメラマンを検索
CREATE OR REPLACE FUNCTION find_nearby_photographers(
  target_lat DECIMAL(10, 8),
  target_lng DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 1000,
  request_type TEXT DEFAULT NULL,
  max_budget INTEGER DEFAULT NULL
)
RETURNS TABLE(
  photographer_id UUID,
  distance_meters INTEGER,
  rating DECIMAL(3, 2),
  instant_rate INTEGER,
  response_time_avg INTEGER,
  is_available BOOLEAN
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
    COALESCE(pr.average_response_time, 600) AS response_time_avg, -- デフォルト10分
    (pl.is_online AND pl.accepting_requests AND (pl.available_until IS NULL OR pl.available_until > NOW())) AS is_available
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
  ORDER BY distance_meters ASC, rating DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ストアドプロシージャ: リクエストを自動マッチング
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
  
  -- 近くのカメラマンを検索（上位3名に通知）
  FOR photographer_record IN
    SELECT * FROM find_nearby_photographers(
      request_record.location_lat,
      request_record.location_lng,
      1000, -- 1km以内
      request_record.request_type,
      request_record.budget
    )
    WHERE is_available = true
    ORDER BY distance_meters ASC, rating DESC
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
  
  RETURN QUERY SELECT true, notification_count || '名のカメラマンに通知を送信しました', NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ストアドプロシージャ: カメラマンの応答処理
CREATE OR REPLACE FUNCTION respond_to_request(
  request_id UUID,
  photographer_id UUID,
  response_type TEXT,
  decline_reason TEXT DEFAULT NULL,
  estimated_arrival_time INTEGER DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  is_matched BOOLEAN
) AS $$
DECLARE
  request_record instant_photo_requests%ROWTYPE;
  current_response_record photographer_request_responses%ROWTYPE;
BEGIN
  -- リクエスト情報取得
  SELECT * INTO request_record 
  FROM instant_photo_requests 
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'リクエストが見つかりません', false;
    RETURN;
  END IF;
  
  -- 既にマッチング済みの場合
  IF request_record.status != 'pending' THEN
    RETURN QUERY SELECT false, 'このリクエストは既に処理済みです', false;
    RETURN;
  END IF;
  
  -- 期限切れチェック
  IF request_record.expires_at < NOW() THEN
    -- リクエストを期限切れに更新
    UPDATE instant_photo_requests 
    SET status = 'expired' 
    WHERE id = request_id;
    
    RETURN QUERY SELECT false, 'リクエストの有効期限が切れています', false;
    RETURN;
  END IF;
  
  -- 応答レコード取得
  SELECT * INTO current_response_record
  FROM photographer_request_responses
  WHERE photographer_request_responses.request_id = respond_to_request.request_id
    AND photographer_request_responses.photographer_id = respond_to_request.photographer_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'このリクエストに応答する権限がありません', false;
    RETURN;
  END IF;
  
  -- 応答が拒否の場合
  IF response_type = 'decline' THEN
    UPDATE photographer_request_responses
    SET 
      response_type = 'decline',
      response_time = NOW(),
      decline_reason = respond_to_request.decline_reason,
      response_time_seconds = EXTRACT(EPOCH FROM (NOW() - current_response_record.created_at))::INTEGER
    WHERE photographer_request_responses.request_id = respond_to_request.request_id
      AND photographer_request_responses.photographer_id = respond_to_request.photographer_id;
    
    RETURN QUERY SELECT true, '応答を記録しました', false;
    RETURN;
  END IF;
  
  -- 受諾の場合（先着順マッチング）
  IF response_type = 'accept' THEN
    -- リクエストをマッチング状態に更新（排他制御）
    UPDATE instant_photo_requests
    SET 
      status = 'matched',
      matched_photographer_id = respond_to_request.photographer_id,
      matched_at = NOW()
    WHERE id = request_id AND status = 'pending';
    
    -- 更新が成功した場合（他のカメラマンに先を越されていない）
    IF FOUND THEN
      -- 応答レコードを更新
      UPDATE photographer_request_responses
      SET 
        response_type = 'accept',
        response_time = NOW(),
        estimated_arrival_time = respond_to_request.estimated_arrival_time,
        response_time_seconds = EXTRACT(EPOCH FROM (NOW() - current_response_record.created_at))::INTEGER
      WHERE photographer_request_responses.request_id = respond_to_request.request_id
        AND photographer_request_responses.photographer_id = respond_to_request.photographer_id;
      
      -- カメラマンの位置情報を更新（現在予約中に設定）
      UPDATE photographer_locations
      SET current_booking_id = request_id
      WHERE photographer_locations.photographer_id = respond_to_request.photographer_id;
      
      RETURN QUERY SELECT true, 'マッチングが成立しました！', true;
    ELSE
      RETURN QUERY SELECT false, '他のカメラマンが先に受諾しました', false;
    END IF;
  END IF;
  
  RETURN QUERY SELECT false, '無効な応答タイプです', false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ストアドプロシージャ: ゲスト利用回数チェック
CREATE OR REPLACE FUNCTION check_guest_usage_limit(
  guest_phone TEXT,
  current_month TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM')
)
RETURNS TABLE(
  can_use BOOLEAN,
  usage_count INTEGER,
  limit_reached BOOLEAN
) AS $$
DECLARE
  current_usage INTEGER;
  usage_limit INTEGER := 3; -- 月3回まで
BEGIN
  -- 当月の利用回数を取得
  SELECT COUNT(*) INTO current_usage
  FROM guest_usage_history
  WHERE guest_usage_history.guest_phone = check_guest_usage_limit.guest_phone
    AND usage_month = current_month;
  
  RETURN QUERY SELECT 
    current_usage < usage_limit AS can_use,
    current_usage AS usage_count,
    current_usage >= usage_limit AS limit_reached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自動期限切れ処理用のストアドプロシージャ
CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE instant_photo_requests
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
    
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_photographer_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photographer_locations_updated_at
  BEFORE UPDATE ON photographer_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_photographer_locations_updated_at();

-- 空間インデックス（PostGIS使用時）
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- CREATE INDEX idx_photographer_locations_geom ON photographer_locations USING GIST(ST_MakePoint(longitude, latitude));
-- CREATE INDEX idx_instant_photo_requests_geom ON instant_photo_requests USING GIST(ST_MakePoint(location_lng, location_lat)); 