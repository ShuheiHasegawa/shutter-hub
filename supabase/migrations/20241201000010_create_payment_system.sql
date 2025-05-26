-- 決済システム
-- Stripe決済統合とプラットフォーム手数料管理

-- 決済テーブル
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- 円単位
  platform_fee INTEGER NOT NULL DEFAULT 0,
  stripe_fee INTEGER NOT NULL DEFAULT 0,
  organizer_payout INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'jpy',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'apple_pay', 'google_pay', 'cash_on_site')),
  payment_timing TEXT NOT NULL CHECK (payment_timing IN ('prepaid', 'cash_on_site', 'split_payment')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded')),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount INTEGER,
  refund_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 売上管理テーブル（主催者向け）
CREATE TABLE revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  net_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  payout_date TIMESTAMPTZ,
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 決済統計テーブル（集計用）
CREATE TABLE payment_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  total_revenue INTEGER DEFAULT 0,
  platform_fees INTEGER DEFAULT 0,
  stripe_fees INTEGER DEFAULT 0,
  organizer_payouts INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  refunded_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- インデックス作成
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

CREATE INDEX idx_revenues_organizer_id ON revenues(organizer_id);
CREATE INDEX idx_revenues_payment_id ON revenues(payment_id);
CREATE INDEX idx_revenues_status ON revenues(status);
CREATE INDEX idx_revenues_payout_date ON revenues(payout_date);

CREATE INDEX idx_payment_stats_date ON payment_stats(date);

-- RLS (Row Level Security) 設定
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_stats ENABLE ROW LEVEL SECURITY;

-- 決済: 関連する予約の所有者のみ閲覧可能
CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = payments.booking_id 
      AND bookings.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM bookings 
      JOIN photo_sessions ON bookings.photo_session_id = photo_sessions.id
      WHERE bookings.id = payments.booking_id 
      AND photo_sessions.organizer_id = auth.uid()
    )
  );

-- 売上: 主催者のみ閲覧可能
CREATE POLICY "revenues_select_policy" ON revenues
  FOR SELECT USING (organizer_id = auth.uid());

-- 決済統計: 管理者のみ閲覧可能
CREATE POLICY "payment_stats_select_policy" ON payment_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 決済統計更新用ストアドプロシージャ
CREATE OR REPLACE FUNCTION update_payment_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  stats_record RECORD;
BEGIN
  -- 今日の統計を計算
  SELECT 
    COALESCE(SUM(amount), 0) as total_revenue,
    COALESCE(SUM(platform_fee), 0) as platform_fees,
    COALESCE(SUM(stripe_fee), 0) as stripe_fees,
    COALESCE(SUM(organizer_payout), 0) as organizer_payouts,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'succeeded') as successful_transactions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
    COUNT(*) FILTER (WHERE status IN ('refunded', 'partially_refunded')) as refunded_transactions
  INTO stats_record
  FROM payments
  WHERE DATE(created_at) = today;

  -- 統計テーブルを更新（UPSERT）
  INSERT INTO payment_stats (
    date,
    total_revenue,
    platform_fees,
    stripe_fees,
    organizer_payouts,
    total_transactions,
    successful_transactions,
    failed_transactions,
    refunded_transactions,
    updated_at
  ) VALUES (
    today,
    stats_record.total_revenue,
    stats_record.platform_fees,
    stats_record.stripe_fees,
    stats_record.organizer_payouts,
    stats_record.total_transactions,
    stats_record.successful_transactions,
    stats_record.failed_transactions,
    stats_record.refunded_transactions,
    NOW()
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    platform_fees = EXCLUDED.platform_fees,
    stripe_fees = EXCLUDED.stripe_fees,
    organizer_payouts = EXCLUDED.organizer_payouts,
    total_transactions = EXCLUDED.total_transactions,
    successful_transactions = EXCLUDED.successful_transactions,
    failed_transactions = EXCLUDED.failed_transactions,
    refunded_transactions = EXCLUDED.refunded_transactions,
    updated_at = NOW();
END;
$$;

-- 主催者の売上統計取得用ストアドプロシージャ
CREATE OR REPLACE FUNCTION get_organizer_payment_stats(organizer_id UUID)
RETURNS TABLE (
  total_revenue BIGINT,
  platform_fees BIGINT,
  stripe_fees BIGINT,
  organizer_payouts BIGINT,
  total_transactions BIGINT,
  successful_transactions BIGINT,
  failed_transactions BIGINT,
  refunded_transactions BIGINT,
  average_transaction_amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(p.amount), 0)::BIGINT as total_revenue,
    COALESCE(SUM(p.platform_fee), 0)::BIGINT as platform_fees,
    COALESCE(SUM(p.stripe_fee), 0)::BIGINT as stripe_fees,
    COALESCE(SUM(p.organizer_payout), 0)::BIGINT as organizer_payouts,
    COUNT(*)::BIGINT as total_transactions,
    COUNT(*) FILTER (WHERE p.status = 'succeeded')::BIGINT as successful_transactions,
    COUNT(*) FILTER (WHERE p.status = 'failed')::BIGINT as failed_transactions,
    COUNT(*) FILTER (WHERE p.status IN ('refunded', 'partially_refunded'))::BIGINT as refunded_transactions,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(AVG(p.amount), 2)
      ELSE 0
    END as average_transaction_amount
  FROM payments p
  JOIN bookings b ON p.booking_id = b.id
  JOIN photo_sessions ps ON b.photo_session_id = ps.id
  WHERE ps.organizer_id = get_organizer_payment_stats.organizer_id;
END;
$$;

-- 決済完了時の売上レコード作成トリガー
CREATE OR REPLACE FUNCTION create_revenue_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  organizer_user_id UUID;
BEGIN
  -- 決済が成功した場合のみ処理
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    -- 主催者IDを取得
    SELECT ps.organizer_id INTO organizer_user_id
    FROM bookings b
    JOIN photo_sessions ps ON b.photo_session_id = ps.id
    WHERE b.id = NEW.booking_id;

    -- 売上レコードを作成
    INSERT INTO revenues (
      organizer_id,
      payment_id,
      amount,
      platform_fee,
      net_amount,
      status
    ) VALUES (
      organizer_user_id,
      NEW.id,
      NEW.amount,
      NEW.platform_fee,
      NEW.organizer_payout,
      'pending'
    );

    -- 統計を更新
    PERFORM update_payment_stats();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_revenue_record
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION create_revenue_record(); 