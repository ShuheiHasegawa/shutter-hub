-- 優先予約設定テーブル
CREATE TABLE priority_booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  
  -- 機能ON/OFF設定
  ticket_priority_enabled BOOLEAN DEFAULT false,
  rank_priority_enabled BOOLEAN DEFAULT false,
  
  -- 優先チケット設定
  ticket_priority_start TIMESTAMPTZ,
  ticket_priority_end TIMESTAMPTZ,
  
  -- ランク優先設定
  vip_priority_start TIMESTAMPTZ,
  vip_priority_end TIMESTAMPTZ,
  platinum_priority_start TIMESTAMPTZ,
  platinum_priority_end TIMESTAMPTZ,
  gold_priority_start TIMESTAMPTZ,
  gold_priority_end TIMESTAMPTZ,
  silver_priority_start TIMESTAMPTZ,
  silver_priority_end TIMESTAMPTZ,
  
  -- 一般予約開始
  general_booking_start TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(photo_session_id) -- 1撮影会につき1設定
);

-- 優先チケットテーブル
CREATE TABLE priority_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type TEXT DEFAULT 'general' CHECK (ticket_type IN ('general', 'vip', 'special')),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_session_id, user_id) -- 1撮影会につき1チケット
);

-- ユーザーランクテーブル
CREATE TABLE user_ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  rank TEXT DEFAULT 'bronze' CHECK (rank IN ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  participation_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  points INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  manually_set BOOLEAN DEFAULT false,
  manually_set_by UUID REFERENCES auth.users(id),
  manually_set_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ランク履歴テーブル
CREATE TABLE user_rank_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_rank TEXT,
  new_rank TEXT NOT NULL,
  reason TEXT, -- 'auto_promotion', 'manual_adjustment', 'participation_milestone'
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 優先予約ログテーブル
CREATE TABLE priority_booking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL, -- 'ticket_priority', 'rank_priority', 'general'
  user_rank TEXT,
  ticket_id UUID REFERENCES priority_tickets(id),
  booking_time TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_reason TEXT
);

-- インデックス作成
CREATE INDEX idx_priority_booking_settings_photo_session ON priority_booking_settings(photo_session_id);
CREATE INDEX idx_priority_tickets_photo_session ON priority_tickets(photo_session_id);
CREATE INDEX idx_priority_tickets_user ON priority_tickets(user_id);
CREATE INDEX idx_priority_tickets_expires ON priority_tickets(expires_at);
CREATE INDEX idx_user_ranks_user_id ON user_ranks(user_id);
CREATE INDEX idx_user_ranks_rank ON user_ranks(rank);
CREATE INDEX idx_user_rank_history_user_id ON user_rank_history(user_id);
CREATE INDEX idx_priority_booking_logs_photo_session ON priority_booking_logs(photo_session_id);
CREATE INDEX idx_priority_booking_logs_user ON priority_booking_logs(user_id);

-- RLS (Row Level Security) 設定
ALTER TABLE priority_booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_booking_logs ENABLE ROW LEVEL SECURITY;

-- 優先予約設定のRLSポリシー
CREATE POLICY "優先予約設定は誰でも閲覧可能" ON priority_booking_settings
  FOR SELECT USING (true);

CREATE POLICY "優先予約設定は開催者のみ作成・更新可能" ON priority_booking_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = priority_booking_settings.photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 優先チケットのRLSポリシー
CREATE POLICY "優先チケットは誰でも閲覧可能" ON priority_tickets
  FOR SELECT USING (true);

CREATE POLICY "優先チケットは開催者のみ作成・更新可能" ON priority_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = priority_tickets.photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- ユーザーランクのRLSポリシー
CREATE POLICY "ユーザーランクは誰でも閲覧可能" ON user_ranks
  FOR SELECT USING (true);

CREATE POLICY "ユーザーランクは本人のみ更新可能（自動計算）" ON user_ranks
  FOR UPDATE USING (auth.uid() = user_id AND NOT manually_set);

CREATE POLICY "ユーザーランクは管理者のみ手動設定可能" ON user_ranks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.user_type = 'organizer'
    )
  );

-- ランク履歴のRLSポリシー
CREATE POLICY "ランク履歴は誰でも閲覧可能" ON user_rank_history
  FOR SELECT USING (true);

CREATE POLICY "ランク履歴は自動システムまたは管理者のみ作成可能" ON user_rank_history
  FOR INSERT WITH CHECK (
    changed_by IS NULL OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.user_type = 'organizer'
    )
  );

-- 優先予約ログのRLSポリシー
CREATE POLICY "優先予約ログは誰でも閲覧可能" ON priority_booking_logs
  FOR SELECT USING (true);

CREATE POLICY "優先予約ログは自動システムのみ作成可能" ON priority_booking_logs
  FOR INSERT WITH CHECK (true);

-- ユーザーランク自動計算用のストアドプロシージャ
CREATE OR REPLACE FUNCTION calculate_user_rank(target_user_id UUID)
RETURNS TABLE (
  new_rank TEXT,
  points_earned INTEGER,
  rank_changed BOOLEAN
) AS $$
DECLARE
  current_rank_record user_ranks%ROWTYPE;
  calculated_points INTEGER := 0;
  calculated_rank TEXT := 'bronze';
  participation_count INTEGER := 0;
  avg_rating DECIMAL(3,2) := 0.00;
  total_bookings INTEGER := 0;
  rank_changed BOOLEAN := false;
BEGIN
  -- 現在のランク情報を取得
  SELECT * INTO current_rank_record 
  FROM user_ranks 
  WHERE user_id = target_user_id;
  
  -- ユーザーランクレコードが存在しない場合は作成
  IF NOT FOUND THEN
    INSERT INTO user_ranks (user_id, rank, points, participation_count, total_bookings, average_rating)
    VALUES (target_user_id, 'bronze', 0, 0, 0, 0.00);
    
    SELECT * INTO current_rank_record 
    FROM user_ranks 
    WHERE user_id = target_user_id;
  END IF;
  
  -- 手動設定されている場合は計算をスキップ
  IF current_rank_record.manually_set THEN
    RETURN QUERY SELECT current_rank_record.rank, current_rank_record.points, false;
    RETURN;
  END IF;
  
  -- 参加回数を計算（確定した予約のみ）
  SELECT COUNT(*) INTO total_bookings
  FROM bookings b
  WHERE b.user_id = target_user_id 
  AND b.status = 'confirmed';
  
  -- 実際に参加した撮影会数を計算（過去の撮影会のみ）
  SELECT COUNT(*) INTO participation_count
  FROM bookings b
  JOIN photo_sessions ps ON ps.id = b.photo_session_id
  WHERE b.user_id = target_user_id 
  AND b.status = 'confirmed'
  AND ps.end_time < NOW();
  
  -- 平均評価を計算（今後実装予定）
  avg_rating := 0.00;
  
  -- ポイント計算
  calculated_points := participation_count * 10; -- 参加1回につき10ポイント
  
  -- ランク判定
  IF calculated_points >= 300 AND participation_count >= 30 THEN
    calculated_rank := 'platinum';
  ELSIF calculated_points >= 150 AND participation_count >= 15 THEN
    calculated_rank := 'gold';
  ELSIF calculated_points >= 50 AND participation_count >= 5 THEN
    calculated_rank := 'silver';
  ELSE
    calculated_rank := 'bronze';
  END IF;
  
  -- ランクが変更されたかチェック
  IF current_rank_record.rank != calculated_rank THEN
    rank_changed := true;
    
    -- ランク履歴を記録
    INSERT INTO user_rank_history (user_id, old_rank, new_rank, reason)
    VALUES (target_user_id, current_rank_record.rank, calculated_rank, 'auto_promotion');
  END IF;
  
  -- ユーザーランクを更新
  UPDATE user_ranks 
  SET 
    rank = calculated_rank,
    points = calculated_points,
    participation_count = participation_count,
    total_bookings = total_bookings,
    average_rating = avg_rating,
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN QUERY SELECT calculated_rank, calculated_points, rank_changed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 優先予約可能性チェック用のストアドプロシージャ
CREATE OR REPLACE FUNCTION check_priority_booking_eligibility(
  target_photo_session_id UUID,
  target_user_id UUID
) RETURNS TABLE (
  can_book BOOLEAN,
  booking_type TEXT,
  reason TEXT,
  available_from TIMESTAMPTZ
) AS $$
DECLARE
  settings_record priority_booking_settings%ROWTYPE;
  user_rank_record user_ranks%ROWTYPE;
  user_ticket_record priority_tickets%ROWTYPE;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- 優先予約設定を取得
  SELECT * INTO settings_record 
  FROM priority_booking_settings 
  WHERE photo_session_id = target_photo_session_id;
  
  -- 設定が存在しない場合は一般予約のみ
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 'general', '一般予約が可能です', current_time;
    RETURN;
  END IF;
  
  -- ユーザーランクを取得
  SELECT * INTO user_rank_record 
  FROM user_ranks 
  WHERE user_id = target_user_id;
  
  -- ユーザーランクが存在しない場合はbronzeとして扱う
  IF NOT FOUND THEN
    user_rank_record.rank := 'bronze';
  END IF;
  
  -- 優先チケットをチェック
  IF settings_record.ticket_priority_enabled THEN
    SELECT * INTO user_ticket_record 
    FROM priority_tickets 
    WHERE photo_session_id = target_photo_session_id 
    AND user_id = target_user_id
    AND NOT is_used
    AND expires_at > current_time;
    
    IF FOUND THEN
      -- チケット優先期間中かチェック
      IF current_time >= settings_record.ticket_priority_start 
         AND current_time <= settings_record.ticket_priority_end THEN
        RETURN QUERY SELECT true, 'ticket_priority', '優先チケットで予約可能です', current_time;
        RETURN;
      END IF;
      
      -- チケット優先期間前
      IF current_time < settings_record.ticket_priority_start THEN
        RETURN QUERY SELECT false, 'ticket_priority', '優先チケット期間開始前です', settings_record.ticket_priority_start;
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- ランク優先をチェック
  IF settings_record.rank_priority_enabled THEN
    -- VIPランクチェック
    IF user_rank_record.rank = 'vip' 
       AND settings_record.vip_priority_start IS NOT NULL 
       AND settings_record.vip_priority_end IS NOT NULL THEN
      IF current_time >= settings_record.vip_priority_start 
         AND current_time <= settings_record.vip_priority_end THEN
        RETURN QUERY SELECT true, 'rank_priority', 'VIPランクで予約可能です', current_time;
        RETURN;
      ELSIF current_time < settings_record.vip_priority_start THEN
        RETURN QUERY SELECT false, 'rank_priority', 'VIP優先期間開始前です', settings_record.vip_priority_start;
        RETURN;
      END IF;
    END IF;
    
    -- Platinumランクチェック
    IF user_rank_record.rank IN ('vip', 'platinum') 
       AND settings_record.platinum_priority_start IS NOT NULL 
       AND settings_record.platinum_priority_end IS NOT NULL THEN
      IF current_time >= settings_record.platinum_priority_start 
         AND current_time <= settings_record.platinum_priority_end THEN
        RETURN QUERY SELECT true, 'rank_priority', 'Platinumランクで予約可能です', current_time;
        RETURN;
      ELSIF current_time < settings_record.platinum_priority_start THEN
        RETURN QUERY SELECT false, 'rank_priority', 'Platinum優先期間開始前です', settings_record.platinum_priority_start;
        RETURN;
      END IF;
    END IF;
    
    -- Goldランクチェック
    IF user_rank_record.rank IN ('vip', 'platinum', 'gold') 
       AND settings_record.gold_priority_start IS NOT NULL 
       AND settings_record.gold_priority_end IS NOT NULL THEN
      IF current_time >= settings_record.gold_priority_start 
         AND current_time <= settings_record.gold_priority_end THEN
        RETURN QUERY SELECT true, 'rank_priority', 'Goldランクで予約可能です', current_time;
        RETURN;
      ELSIF current_time < settings_record.gold_priority_start THEN
        RETURN QUERY SELECT false, 'rank_priority', 'Gold優先期間開始前です', settings_record.gold_priority_start;
        RETURN;
      END IF;
    END IF;
    
    -- Silverランクチェック
    IF user_rank_record.rank IN ('vip', 'platinum', 'gold', 'silver') 
       AND settings_record.silver_priority_start IS NOT NULL 
       AND settings_record.silver_priority_end IS NOT NULL THEN
      IF current_time >= settings_record.silver_priority_start 
         AND current_time <= settings_record.silver_priority_end THEN
        RETURN QUERY SELECT true, 'rank_priority', 'Silverランクで予約可能です', current_time;
        RETURN;
      ELSIF current_time < settings_record.silver_priority_start THEN
        RETURN QUERY SELECT false, 'rank_priority', 'Silver優先期間開始前です', settings_record.silver_priority_start;
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- 一般予約チェック
  IF current_time >= settings_record.general_booking_start THEN
    RETURN QUERY SELECT true, 'general', '一般予約が可能です', current_time;
    RETURN;
  ELSE
    RETURN QUERY SELECT false, 'general', '一般予約開始前です', settings_record.general_booking_start;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 優先チケット使用処理用のストアドプロシージャ
CREATE OR REPLACE FUNCTION use_priority_ticket(
  target_photo_session_id UUID,
  target_user_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  ticket_id UUID
) AS $$
DECLARE
  ticket_record priority_tickets%ROWTYPE;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- 有効な優先チケットを取得
  SELECT * INTO ticket_record 
  FROM priority_tickets 
  WHERE photo_session_id = target_photo_session_id 
  AND user_id = target_user_id
  AND NOT is_used
  AND expires_at > current_time;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '有効な優先チケットが見つかりません', NULL::UUID;
    RETURN;
  END IF;
  
  -- チケットを使用済みに更新
  UPDATE priority_tickets 
  SET 
    is_used = true,
    used_at = current_time
  WHERE id = ticket_record.id;
  
  RETURN QUERY SELECT true, '優先チケットを使用しました', ticket_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 