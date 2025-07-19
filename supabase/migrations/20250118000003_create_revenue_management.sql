-- 収益管理テーブルを作成

CREATE TABLE photo_session_revenue_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  
  -- 売上情報
  total_revenue DECIMAL(10,2),
  participants_count INTEGER,
  
  -- 手数料計算
  system_fee_amount DECIMAL(10,2),
  system_fee_percentage DECIMAL(5,2),
  
  organizer_fee_amount DECIMAL(10,2),
  organizer_fee_percentage DECIMAL(5,2),
  
  model_earnings DECIMAL(10,2),
  
  -- メタ情報
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'disputed'))
);

-- インデックス追加
CREATE INDEX idx_revenue_breakdown_session_id ON photo_session_revenue_breakdown(photo_session_id);
CREATE INDEX idx_revenue_breakdown_payment_status ON photo_session_revenue_breakdown(payment_status);

-- RLS有効化
ALTER TABLE photo_session_revenue_breakdown ENABLE ROW LEVEL SECURITY;

-- コメント追加
COMMENT ON TABLE photo_session_revenue_breakdown IS '撮影会の詳細収益分析テーブル';
COMMENT ON COLUMN photo_session_revenue_breakdown.total_revenue IS '総売上（料金×参加者数）';
COMMENT ON COLUMN photo_session_revenue_breakdown.system_fee_amount IS 'システム手数料額';
COMMENT ON COLUMN photo_session_revenue_breakdown.organizer_fee_amount IS '運営手数料額';
COMMENT ON COLUMN photo_session_revenue_breakdown.model_earnings IS 'モデル収益額'; 