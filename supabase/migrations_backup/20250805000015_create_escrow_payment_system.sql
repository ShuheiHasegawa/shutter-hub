-- エスクロー決済システム
-- メルカリのような安全な取引システム

-- エスクロー決済テーブル
CREATE TABLE escrow_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES instant_bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  
  -- 金額情報
  total_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  photographer_earnings INTEGER NOT NULL,
  
  -- ステータス
  escrow_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    escrow_status IN ('pending', 'escrowed', 'delivered', 'confirmed', 'completed', 'disputed', 'cancelled', 'refunded')
  ),
  delivery_status TEXT NOT NULL DEFAULT 'waiting' CHECK (
    delivery_status IN ('waiting', 'in_progress', 'processing', 'delivered', 'confirmed')
  ),
  
  -- タイムスタンプ
  payment_created_at TIMESTAMPTZ DEFAULT NOW(),
  escrowed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- 自動確認設定
  auto_confirm_enabled BOOLEAN DEFAULT true,
  auto_confirm_hours INTEGER DEFAULT 72,
  auto_confirm_at TIMESTAMPTZ,
  
  -- 争議・サポート
  dispute_reason TEXT,
  dispute_created_at TIMESTAMPTZ,
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(booking_id)
);

-- 写真配信テーブル
CREATE TABLE photo_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES instant_bookings(id) ON DELETE CASCADE,
  
  -- 配信方法
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('direct_upload', 'external_url', 'cloud_storage')),
  
  -- 直接アップロード用
  delivery_url TEXT,
  photo_count INTEGER NOT NULL,
  total_size_mb NUMERIC(10,2) DEFAULT 0,
  thumbnail_url TEXT,
  
  -- 外部URL用（ギガファイル便等）
  external_url TEXT,
  external_service TEXT, -- gigafile, firestorage, wetransfer, googledrive, dropbox, other
  external_password TEXT,
  external_expires_at TIMESTAMPTZ,
  
  -- ダウンロード情報
  download_expires_at TIMESTAMPTZ NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 10,
  
  -- 品質情報
  resolution TEXT NOT NULL CHECK (resolution IN ('high', 'medium', 'web')),
  formats TEXT[] NOT NULL,
  
  -- カメラマンからのメッセージ
  photographer_message TEXT,
  
  -- タイムスタンプ
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  
  UNIQUE(booking_id)
);

-- 即座撮影レビューテーブル（詳細レビュー用）
CREATE TABLE instant_photo_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES instant_bookings(id) ON DELETE CASCADE,
  
  -- カメラマン評価
  photographer_rating INTEGER NOT NULL CHECK (photographer_rating >= 1 AND photographer_rating <= 5),
  photographer_review TEXT,
  
  -- 写真品質評価
  photo_quality_rating INTEGER NOT NULL CHECK (photo_quality_rating >= 1 AND photo_quality_rating <= 5),
  photo_quality_comment TEXT,
  
  -- サービス評価
  service_rating INTEGER NOT NULL CHECK (service_rating >= 1 AND service_rating <= 5),
  service_comment TEXT,
  
  -- 推奨度
  would_recommend BOOLEAN NOT NULL,
  recommend_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(booking_id)
);

-- 争議テーブル
CREATE TABLE instant_photo_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES instant_bookings(id) ON DELETE CASCADE,
  
  -- 争議内容
  reason TEXT NOT NULL CHECK (reason IN ('quality_issue', 'quantity_issue', 'no_delivery', 'late_delivery', 'service_issue', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  
  -- 希望解決方法
  requested_resolution TEXT NOT NULL CHECK (requested_resolution IN ('refund', 'partial_refund', 'redelivery', 'other')),
  resolution_detail TEXT,
  
  -- 争議ステータス
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'escalated')),
  
  -- 管理者対応
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT CHECK (resolution_type IN ('full_refund', 'partial_refund', 'redelivery', 'no_action')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(booking_id)
);

-- インデックス作成
CREATE INDEX idx_escrow_payments_booking_id ON escrow_payments(booking_id);
CREATE INDEX idx_escrow_payments_stripe_payment_intent_id ON escrow_payments(stripe_payment_intent_id);
CREATE INDEX idx_escrow_payments_escrow_status ON escrow_payments(escrow_status);
CREATE INDEX idx_escrow_payments_delivery_status ON escrow_payments(delivery_status);
CREATE INDEX idx_escrow_payments_auto_confirm_at ON escrow_payments(auto_confirm_at);

CREATE INDEX idx_photo_deliveries_booking_id ON photo_deliveries(booking_id);
CREATE INDEX idx_photo_deliveries_delivery_method ON photo_deliveries(delivery_method);
CREATE INDEX idx_photo_deliveries_download_expires_at ON photo_deliveries(download_expires_at);

CREATE INDEX idx_instant_photo_reviews_booking_id ON instant_photo_reviews(booking_id);
CREATE INDEX idx_instant_photo_reviews_photographer_rating ON instant_photo_reviews(photographer_rating);
CREATE INDEX idx_instant_photo_reviews_would_recommend ON instant_photo_reviews(would_recommend);

CREATE INDEX idx_instant_photo_disputes_booking_id ON instant_photo_disputes(booking_id);
CREATE INDEX idx_instant_photo_disputes_status ON instant_photo_disputes(status);
CREATE INDEX idx_instant_photo_disputes_reason ON instant_photo_disputes(reason);

-- RLS設定
ALTER TABLE escrow_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_photo_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_photo_disputes ENABLE ROW LEVEL SECURITY;

-- エスクロー決済: 関連するゲストまたはカメラマンのみ閲覧可能
CREATE POLICY "escrow_payments_select_policy" ON escrow_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instant_bookings ib
      JOIN instant_photo_requests ipr ON ib.request_id = ipr.id
      WHERE ib.id = escrow_payments.booking_id
      AND (ib.photographer_id = auth.uid() OR ipr.guest_phone IS NOT NULL)
    )
  );

-- 写真配信: 関連するゲストまたはカメラマンのみ閲覧可能
CREATE POLICY "photo_deliveries_select_policy" ON photo_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instant_bookings ib
      JOIN instant_photo_requests ipr ON ib.request_id = ipr.id
      WHERE ib.id = photo_deliveries.booking_id
      AND (ib.photographer_id = auth.uid() OR ipr.guest_phone IS NOT NULL)
    )
  );

-- カメラマンのみ写真配信を挿入・更新可能
CREATE POLICY "photo_deliveries_insert_policy" ON photo_deliveries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM instant_bookings ib
      WHERE ib.id = photo_deliveries.booking_id
      AND ib.photographer_id = auth.uid()
    )
  );

CREATE POLICY "photo_deliveries_update_policy" ON photo_deliveries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM instant_bookings ib
      WHERE ib.id = photo_deliveries.booking_id
      AND ib.photographer_id = auth.uid()
    )
  );

-- レビュー: 関連するゲストまたはカメラマンのみ閲覧可能
CREATE POLICY "instant_photo_reviews_select_policy" ON instant_photo_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instant_bookings ib
      JOIN instant_photo_requests ipr ON ib.request_id = ipr.id
      WHERE ib.id = instant_photo_reviews.booking_id
      AND (ib.photographer_id = auth.uid() OR ipr.guest_phone IS NOT NULL)
    )
  );

-- 争議: 関連するゲストまたはカメラマン、管理者のみ閲覧可能
CREATE POLICY "instant_photo_disputes_select_policy" ON instant_photo_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instant_bookings ib
      JOIN instant_photo_requests ipr ON ib.request_id = ipr.id
      WHERE ib.id = instant_photo_disputes.booking_id
      AND (ib.photographer_id = auth.uid() OR ipr.guest_phone IS NOT NULL)
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 自動確認処理用のストアドプロシージャ
CREATE OR REPLACE FUNCTION process_auto_confirmations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_count INTEGER := 0;
  payment_record RECORD;
BEGIN
  -- 自動確認対象のエスクロー決済を取得
  FOR payment_record IN
    SELECT *
    FROM escrow_payments
    WHERE escrow_status = 'escrowed'
    AND delivery_status = 'delivered'
    AND auto_confirm_enabled = true
    AND auto_confirm_at <= NOW()
  LOOP
    BEGIN
      -- エスクロー決済を完了状態に更新
      UPDATE escrow_payments
      SET 
        escrow_status = 'completed',
        delivery_status = 'confirmed',
        confirmed_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = payment_record.id;
      
      -- 関連する予約を更新
      UPDATE instant_bookings
      SET 
        payment_status = 'paid',
        updated_at = NOW()
      WHERE id = payment_record.booking_id;
      
      -- リクエストを完了状態に更新
      UPDATE instant_photo_requests
      SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = payment_record.booking_id;
      
      processed_count := processed_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- エラーをログに記録して次に進む
        RAISE NOTICE 'Error processing auto confirmation for payment %: %', payment_record.id, SQLERRM;
        CONTINUE;
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

-- カメラマンのレビュー統計を取得するビュー
CREATE VIEW photographer_review_stats AS
SELECT 
  ib.photographer_id,
  COUNT(*) as total_reviews,
  AVG(ipr.photographer_rating)::NUMERIC(3,2) as avg_photographer_rating,
  AVG(ipr.photo_quality_rating)::NUMERIC(3,2) as avg_photo_quality_rating,
  AVG(ipr.service_rating)::NUMERIC(3,2) as avg_service_rating,
  COUNT(*) FILTER (WHERE ipr.would_recommend = true)::FLOAT / COUNT(*) * 100 as recommendation_rate,
  
  -- 評価分布
  COUNT(*) FILTER (WHERE ipr.photographer_rating = 5) as rating_5_count,
  COUNT(*) FILTER (WHERE ipr.photographer_rating = 4) as rating_4_count,
  COUNT(*) FILTER (WHERE ipr.photographer_rating = 3) as rating_3_count,
  COUNT(*) FILTER (WHERE ipr.photographer_rating = 2) as rating_2_count,
  COUNT(*) FILTER (WHERE ipr.photographer_rating = 1) as rating_1_count
FROM instant_bookings ib
JOIN instant_photo_reviews ipr ON ib.id = ipr.booking_id
GROUP BY ib.photographer_id;

-- 配信統計ビュー
CREATE VIEW delivery_method_stats AS
SELECT 
  delivery_method,
  COUNT(*) as total_deliveries,
  AVG(photo_count) as avg_photo_count,
  AVG(total_size_mb) as avg_size_mb,
  COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::FLOAT / COUNT(*) * 100 as confirmation_rate
FROM photo_deliveries
GROUP BY delivery_method;

-- トリガー関数：updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガーを作成
CREATE TRIGGER update_escrow_payments_updated_at
  BEFORE UPDATE ON escrow_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instant_photo_disputes_updated_at
  BEFORE UPDATE ON instant_photo_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 