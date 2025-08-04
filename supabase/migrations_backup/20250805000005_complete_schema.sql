-- Migration: 002_complete_schema
-- Description: Complete database schema for ShutterHub (統合版)
-- Created: 2024-12-01
-- Includes: 抽選システム、管理抽選システム、優先予約システム、キャンセル待ちシステム

-- =============================================================================
-- 抽選システム (Lottery System)
-- =============================================================================

-- 抽選撮影会テーブル
CREATE TABLE lottery_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  entry_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  lottery_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_winners INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'accepting', 'closed', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 抽選エントリーテーブル
CREATE TABLE lottery_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_session_id UUID REFERENCES lottery_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'entered' CHECK (status IN ('entered', 'won', 'lost')),
  won_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lottery_session_id, user_id)
);

-- =============================================================================
-- 管理抽選システム (Admin Lottery System)
-- =============================================================================

-- 管理抽選撮影会テーブル
CREATE TABLE admin_lottery_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  entry_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  selection_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_selections INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'accepting', 'selecting', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理抽選エントリーテーブル
CREATE TABLE admin_lottery_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_lottery_session_id UUID REFERENCES admin_lottery_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'selected', 'rejected')),
  selected_at TIMESTAMP WITH TIME ZONE,
  selection_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_lottery_session_id, user_id)
);

-- =============================================================================
-- 優先予約システム (Priority Booking System)
-- =============================================================================

-- ユーザーランクテーブル
CREATE TABLE user_ranks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  rank_level TEXT DEFAULT 'bronze' CHECK (rank_level IN ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  points INTEGER DEFAULT 0,
  participation_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  manual_adjustment BOOLEAN DEFAULT FALSE,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 優先チケットテーブル
CREATE TABLE priority_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  ticket_type TEXT DEFAULT 'general' CHECK (ticket_type IN ('general', 'vip', 'early_bird', 'special')),
  issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, photo_session_id)
);

-- 優先予約設定テーブル
CREATE TABLE priority_booking_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- 一般予約開始時間
  general_booking_start TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- 優先チケット設定
  ticket_priority_enabled BOOLEAN DEFAULT FALSE,
  ticket_priority_start TIMESTAMP WITH TIME ZONE,
  ticket_priority_end TIMESTAMP WITH TIME ZONE,
  
  -- ランク優先設定
  rank_priority_enabled BOOLEAN DEFAULT FALSE,
  vip_start_time TIMESTAMP WITH TIME ZONE,
  vip_end_time TIMESTAMP WITH TIME ZONE,
  platinum_start_time TIMESTAMP WITH TIME ZONE,
  platinum_end_time TIMESTAMP WITH TIME ZONE,
  gold_start_time TIMESTAMP WITH TIME ZONE,
  gold_end_time TIMESTAMP WITH TIME ZONE,
  silver_start_time TIMESTAMP WITH TIME ZONE,
  silver_end_time TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- キャンセル待ちシステム (Waitlist System)
-- =============================================================================

-- キャンセル待ちテーブル
CREATE TABLE waitlist_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  queue_position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'expired', 'cancelled')),
  
  -- 自動繰り上げ設定
  auto_promote BOOLEAN DEFAULT TRUE,
  notification_sent BOOLEAN DEFAULT FALSE,
  promotion_deadline TIMESTAMP WITH TIME ZONE,
  
  -- メッセージ・理由
  message TEXT,
  promotion_reason TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  promoted_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(photo_session_id, user_id)
);

-- キャンセル待ち設定テーブル
CREATE TABLE waitlist_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  
  -- 機能ON/OFF
  enabled BOOLEAN DEFAULT TRUE,
  max_waitlist_size INTEGER DEFAULT 50,
  
  -- 自動繰り上げ設定
  auto_promote_enabled BOOLEAN DEFAULT TRUE,
  promotion_deadline_hours INTEGER DEFAULT 24,
  
  -- 通知設定
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(photo_session_id)
);

-- キャンセル待ち履歴テーブル
CREATE TABLE waitlist_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  waitlist_entry_id UUID REFERENCES waitlist_entries(id) ON DELETE CASCADE,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'joined', 'promoted', 'expired', 'cancelled', 'position_changed'
  old_queue_position INTEGER,
  new_queue_position INTEGER,
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- キャンセル待ち通知テーブル
CREATE TABLE waitlist_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  waitlist_entry_id UUID REFERENCES waitlist_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL, -- 'promotion_available', 'position_changed', 'deadline_reminder'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- 送信状態
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- 送信方法
  email_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- インデックス作成
-- =============================================================================

-- 抽選システム
CREATE INDEX idx_lottery_sessions_photo_session ON lottery_sessions(photo_session_id);
CREATE INDEX idx_lottery_sessions_status ON lottery_sessions(status);
CREATE INDEX idx_lottery_entries_lottery_session ON lottery_entries(lottery_session_id);
CREATE INDEX idx_lottery_entries_user ON lottery_entries(user_id);
CREATE INDEX idx_lottery_entries_status ON lottery_entries(status);

-- 管理抽選システム
CREATE INDEX idx_admin_lottery_sessions_photo_session ON admin_lottery_sessions(photo_session_id);
CREATE INDEX idx_admin_lottery_sessions_status ON admin_lottery_sessions(status);
CREATE INDEX idx_admin_lottery_entries_session ON admin_lottery_entries(admin_lottery_session_id);
CREATE INDEX idx_admin_lottery_entries_user ON admin_lottery_entries(user_id);
CREATE INDEX idx_admin_lottery_entries_status ON admin_lottery_entries(status);

-- 優先予約システム
CREATE INDEX idx_user_ranks_user_id ON user_ranks(user_id);
CREATE INDEX idx_user_ranks_rank_level ON user_ranks(rank_level);
CREATE INDEX idx_user_ranks_points ON user_ranks(points);
CREATE INDEX idx_priority_tickets_user_id ON priority_tickets(user_id);
CREATE INDEX idx_priority_tickets_photo_session_id ON priority_tickets(photo_session_id);
CREATE INDEX idx_priority_tickets_is_active ON priority_tickets(is_active);
CREATE INDEX idx_priority_booking_settings_photo_session ON priority_booking_settings(photo_session_id);

-- キャンセル待ちシステム
CREATE INDEX idx_waitlist_entries_photo_session ON waitlist_entries(photo_session_id);
CREATE INDEX idx_waitlist_entries_user ON waitlist_entries(user_id);
CREATE INDEX idx_waitlist_entries_status ON waitlist_entries(status);
CREATE INDEX idx_waitlist_entries_position ON waitlist_entries(photo_session_id, queue_position);
CREATE INDEX idx_waitlist_settings_photo_session ON waitlist_settings(photo_session_id);
CREATE INDEX idx_waitlist_history_entry ON waitlist_history(waitlist_entry_id);
CREATE INDEX idx_waitlist_history_photo_session ON waitlist_history(photo_session_id);
CREATE INDEX idx_waitlist_notifications_user ON waitlist_notifications(user_id);
CREATE INDEX idx_waitlist_notifications_sent ON waitlist_notifications(sent);

-- =============================================================================
-- RLS (Row Level Security) 設定
-- =============================================================================

-- 抽選システム
ALTER TABLE lottery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "抽選撮影会は誰でも閲覧可能" ON lottery_sessions FOR SELECT USING (true);
CREATE POLICY "抽選撮影会は主催者のみ作成・更新可能" ON lottery_sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM photo_sessions ps 
    WHERE ps.id = lottery_sessions.photo_session_id 
    AND ps.organizer_id = auth.uid()
  )
);

CREATE POLICY "抽選エントリーは誰でも閲覧可能" ON lottery_entries FOR SELECT USING (true);
CREATE POLICY "抽選エントリーは本人のみ作成・更新可能" ON lottery_entries FOR ALL USING (auth.uid() = user_id);

-- 管理抽選システム
ALTER TABLE admin_lottery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_lottery_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理抽選撮影会は誰でも閲覧可能" ON admin_lottery_sessions FOR SELECT USING (true);
CREATE POLICY "管理抽選撮影会は主催者のみ作成・更新可能" ON admin_lottery_sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM photo_sessions ps 
    WHERE ps.id = admin_lottery_sessions.photo_session_id 
    AND ps.organizer_id = auth.uid()
  )
);

CREATE POLICY "管理抽選エントリーは誰でも閲覧可能" ON admin_lottery_entries FOR SELECT USING (true);
CREATE POLICY "管理抽選エントリーは本人のみ作成可能" ON admin_lottery_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "管理抽選エントリーは主催者が更新可能" ON admin_lottery_entries FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM admin_lottery_sessions als
    JOIN photo_sessions ps ON ps.id = als.photo_session_id
    WHERE als.id = admin_lottery_entries.admin_lottery_session_id 
    AND ps.organizer_id = auth.uid()
  )
);

-- 優先予約システム
ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーランクは誰でも閲覧可能" ON user_ranks FOR SELECT USING (true);
CREATE POLICY "ユーザーランクは本人のみ更新可能" ON user_ranks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "優先チケットは本人のみ閲覧可能" ON priority_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "優先チケットは発行者のみ作成・更新可能" ON priority_tickets FOR ALL USING (auth.uid() = issued_by);

CREATE POLICY "優先予約設定は誰でも閲覧可能" ON priority_booking_settings FOR SELECT USING (true);
CREATE POLICY "優先予約設定は主催者のみ作成・更新可能" ON priority_booking_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM photo_sessions ps 
    WHERE ps.id = priority_booking_settings.photo_session_id 
    AND ps.organizer_id = auth.uid()
  )
);

-- キャンセル待ちシステム
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "キャンセル待ちエントリーは誰でも閲覧可能" ON waitlist_entries FOR SELECT USING (true);
CREATE POLICY "キャンセル待ちエントリーは本人のみ作成・更新可能" ON waitlist_entries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "キャンセル待ち設定は誰でも閲覧可能" ON waitlist_settings FOR SELECT USING (true);
CREATE POLICY "キャンセル待ち設定は開催者のみ作成・更新可能" ON waitlist_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM photo_sessions ps 
    WHERE ps.id = waitlist_settings.photo_session_id 
    AND ps.organizer_id = auth.uid()
  )
);

CREATE POLICY "キャンセル待ち履歴は誰でも閲覧可能" ON waitlist_history FOR SELECT USING (true);
CREATE POLICY "キャンセル待ち履歴は自動システムのみ作成可能" ON waitlist_history FOR INSERT WITH CHECK (true);

CREATE POLICY "キャンセル待ち通知は本人のみ閲覧可能" ON waitlist_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "キャンセル待ち通知は本人のみ更新可能" ON waitlist_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "キャンセル待ち通知は自動システムのみ作成可能" ON waitlist_notifications FOR INSERT WITH CHECK (true);

-- =============================================================================
-- ストアドプロシージャ
-- =============================================================================

-- 抽選実行用のストアドプロシージャ
CREATE OR REPLACE FUNCTION conduct_lottery(lottery_session_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  winners_count INTEGER,
  total_entries INTEGER
) AS $$
DECLARE
  session_record lottery_sessions%ROWTYPE;
  max_winners_count INTEGER;
  total_entries_count INTEGER;
  winners_selected INTEGER := 0;
  entry_record lottery_entries%ROWTYPE;
BEGIN
  -- 抽選セッション情報を取得
  SELECT * INTO session_record FROM lottery_sessions WHERE id = lottery_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '抽選セッションが見つかりません', 0, 0;
    RETURN;
  END IF;
  
  -- 既に抽選が完了している場合
  IF session_record.status = 'completed' THEN
    RETURN QUERY SELECT false, '抽選は既に完了しています', 0, 0;
    RETURN;
  END IF;
  
  -- エントリー数を取得
  SELECT COUNT(*) INTO total_entries_count
  FROM lottery_entries 
  WHERE lottery_session_id = session_record.id AND status = 'entered';
  
  max_winners_count := LEAST(session_record.max_winners, total_entries_count);
  
  -- ランダムに当選者を選出
  FOR entry_record IN 
    SELECT * FROM lottery_entries 
    WHERE lottery_session_id = session_record.id AND status = 'entered'
    ORDER BY RANDOM()
    LIMIT max_winners_count
  LOOP
    UPDATE lottery_entries 
    SET status = 'won', won_at = NOW()
    WHERE id = entry_record.id;
    
    winners_selected := winners_selected + 1;
  END LOOP;
  
  -- 落選者を更新
  UPDATE lottery_entries 
  SET status = 'lost'
  WHERE lottery_session_id = session_record.id AND status = 'entered';
  
  -- 抽選セッションのステータスを更新
  UPDATE lottery_sessions 
  SET status = 'completed', updated_at = NOW()
  WHERE id = lottery_session_id;
  
  RETURN QUERY SELECT true, '抽選が正常に完了しました', winners_selected, total_entries_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーランク自動更新用のストアドプロシージャ
CREATE OR REPLACE FUNCTION update_user_rank(target_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  old_rank TEXT,
  new_rank TEXT,
  points INTEGER
) AS $$
DECLARE
  current_rank user_ranks%ROWTYPE;
  booking_count INTEGER := 0;
  participation_count INTEGER := 0;
  calculated_points INTEGER := 0;
  new_rank_level TEXT;
  old_rank_level TEXT;
BEGIN
  -- 現在のランク情報を取得
  SELECT * INTO current_rank FROM user_ranks WHERE user_id = target_user_id;
  
  -- ランク情報が存在しない場合は作成
  IF NOT FOUND THEN
    INSERT INTO user_ranks (user_id) VALUES (target_user_id);
    SELECT * INTO current_rank FROM user_ranks WHERE user_id = target_user_id;
  END IF;
  
  old_rank_level := current_rank.rank_level;
  
  -- 手動調整されている場合はスキップ
  IF current_rank.manual_adjustment THEN
    RETURN QUERY SELECT true, old_rank_level, old_rank_level, current_rank.points;
    RETURN;
  END IF;
  
  -- 予約数と参加数を計算
  SELECT COUNT(*) INTO booking_count
  FROM bookings 
  WHERE user_id = target_user_id AND status = 'confirmed';
  
  -- 参加数は過去の撮影会で確定予約があるもの
  SELECT COUNT(*) INTO participation_count
  FROM bookings b
  JOIN photo_sessions ps ON ps.id = b.photo_session_id
  WHERE b.user_id = target_user_id 
  AND b.status = 'confirmed'
  AND ps.end_time < NOW();
  
  -- ポイント計算（参加1回=10ポイント、予約1回=5ポイント）
  calculated_points := (participation_count * 10) + (booking_count * 5);
  
  -- ランク判定
  IF calculated_points >= 500 THEN
    new_rank_level := 'vip';
  ELSIF calculated_points >= 200 THEN
    new_rank_level := 'platinum';
  ELSIF calculated_points >= 100 THEN
    new_rank_level := 'gold';
  ELSIF calculated_points >= 50 THEN
    new_rank_level := 'silver';
  ELSE
    new_rank_level := 'bronze';
  END IF;
  
  -- ランク情報を更新
  UPDATE user_ranks 
  SET 
    rank_level = new_rank_level,
    points = calculated_points,
    participation_count = participation_count,
    total_bookings = booking_count,
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN QUERY SELECT true, old_rank_level, new_rank_level, calculated_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- キャンセル待ち登録用のストアドプロシージャ
CREATE OR REPLACE FUNCTION join_waitlist(
  target_photo_session_id UUID,
  target_user_id UUID,
  user_message TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  queue_position INTEGER,
  waitlist_entry_id UUID
) AS $$
DECLARE
  session_record photo_sessions%ROWTYPE;
  settings_record waitlist_settings%ROWTYPE;
  current_bookings INTEGER := 0;
  current_waitlist_size INTEGER := 0;
  new_queue_position INTEGER;
  new_entry_id UUID;
BEGIN
  -- 撮影会情報を取得
  SELECT * INTO session_record 
  FROM photo_sessions 
  WHERE id = target_photo_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '撮影会が見つかりません', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- 既に予約済みかチェック
  SELECT COUNT(*) INTO current_bookings
  FROM bookings 
  WHERE photo_session_id = target_photo_session_id 
  AND user_id = target_user_id 
  AND status = 'confirmed';
  
  IF current_bookings > 0 THEN
    RETURN QUERY SELECT false, '既に予約済みです', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- 既にキャンセル待ちに登録済みかチェック
  IF EXISTS (
    SELECT 1 FROM waitlist_entries 
    WHERE photo_session_id = target_photo_session_id 
    AND user_id = target_user_id 
    AND status = 'waiting'
  ) THEN
    RETURN QUERY SELECT false, '既にキャンセル待ちに登録済みです', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- 撮影会が満席かチェック
  SELECT COUNT(*) INTO current_bookings
  FROM bookings 
  WHERE photo_session_id = target_photo_session_id 
  AND status = 'confirmed';
  
  IF current_bookings < session_record.max_participants THEN
    RETURN QUERY SELECT false, 'まだ空きがあります。直接予約してください', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- キャンセル待ち設定を取得
  SELECT * INTO settings_record 
  FROM waitlist_settings 
  WHERE photo_session_id = target_photo_session_id;
  
  -- 設定が存在しない場合はデフォルト設定を作成
  IF NOT FOUND THEN
    INSERT INTO waitlist_settings (photo_session_id)
    VALUES (target_photo_session_id);
    
    SELECT * INTO settings_record 
    FROM waitlist_settings 
    WHERE photo_session_id = target_photo_session_id;
  END IF;
  
  -- キャンセル待ちが無効の場合
  IF NOT settings_record.enabled THEN
    RETURN QUERY SELECT false, 'キャンセル待ちは受け付けていません', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- 現在のキャンセル待ち数をチェック
  SELECT COUNT(*) INTO current_waitlist_size
  FROM waitlist_entries 
  WHERE photo_session_id = target_photo_session_id 
  AND status = 'waiting';
  
  IF current_waitlist_size >= settings_record.max_waitlist_size THEN
    RETURN QUERY SELECT false, 'キャンセル待ちが満員です', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- 新しい順位を計算
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO new_queue_position
  FROM waitlist_entries 
  WHERE photo_session_id = target_photo_session_id 
  AND status = 'waiting';
  
  -- キャンセル待ちエントリーを作成
    INSERT INTO waitlist_entries (
    photo_session_id,
    user_id,
    queue_position,
    message,
    auto_promote
  ) VALUES (
    target_photo_session_id,
    target_user_id,
    new_queue_position,
    user_message,
    true
  ) RETURNING id INTO new_entry_id;
  
  -- 履歴を記録
  INSERT INTO waitlist_history (
    waitlist_entry_id,
    photo_session_id,
    user_id,
    action,
    new_queue_position,
    new_status,
    reason
  ) VALUES (
    new_entry_id,
    target_photo_session_id,
    target_user_id,
    'joined',
    new_queue_position,
    'waiting',
    'ユーザーがキャンセル待ちに登録'
  );
  
  RETURN QUERY SELECT true, 'キャンセル待ちに登録しました', new_queue_position, new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- キャンセル待ち自動繰り上げ用のストアドプロシージャ
CREATE OR REPLACE FUNCTION promote_from_waitlist(
  target_photo_session_id UUID,
  slots_available INTEGER DEFAULT 1
) RETURNS TABLE (
  promoted_count INTEGER,
  promoted_users UUID[]
) AS $$
DECLARE
  session_record photo_sessions%ROWTYPE;
  settings_record waitlist_settings%ROWTYPE;
  waitlist_record waitlist_entries%ROWTYPE;
  current_bookings INTEGER := 0;
  available_slots INTEGER := 0;
  promoted_count INTEGER := 0;
  promoted_users UUID[] := ARRAY[]::UUID[];
  promotion_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 撮影会情報を取得
  SELECT * INTO session_record 
  FROM photo_sessions 
  WHERE id = target_photo_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, ARRAY[]::UUID[];
    RETURN;
  END IF;
  
  -- キャンセル待ち設定を取得
  SELECT * INTO settings_record 
  FROM waitlist_settings 
  WHERE photo_session_id = target_photo_session_id;
  
  IF NOT FOUND OR NOT settings_record.auto_promote_enabled THEN
    RETURN QUERY SELECT 0, ARRAY[]::UUID[];
    RETURN;
  END IF;
  
  -- 現在の予約数を取得
  SELECT COUNT(*) INTO current_bookings
  FROM bookings 
  WHERE photo_session_id = target_photo_session_id 
  AND status = 'confirmed';
  
  -- 利用可能なスロット数を計算
  available_slots := LEAST(
    session_record.max_participants - current_bookings,
    slots_available
  );
  
  IF available_slots <= 0 THEN
    RETURN QUERY SELECT 0, ARRAY[]::UUID[];
    RETURN;
  END IF;
  
  -- 繰り上げ期限を計算
  promotion_deadline := NOW() + (settings_record.promotion_deadline_hours || ' hours')::INTERVAL;
  
  -- キャンセル待ちから順番に繰り上げ
  FOR waitlist_record IN 
    SELECT * FROM waitlist_entries 
    WHERE photo_session_id = target_photo_session_id 
    AND status = 'waiting'
    AND auto_promote = true
    ORDER BY queue_position ASC
    LIMIT available_slots
  LOOP
    -- エントリーを繰り上げ状態に更新
    UPDATE waitlist_entries 
    SET 
      status = 'promoted',
      promoted_at = NOW(),
      promotion_deadline = promotion_deadline,
      promotion_reason = '空きが発生したため自動繰り上げ'
    WHERE id = waitlist_record.id;
    
    -- 履歴を記録
    INSERT INTO waitlist_history (
      waitlist_entry_id,
      photo_session_id,
      user_id,
      action,
      old_queue_position,
      old_status,
      new_status,
      reason
    ) VALUES (
      waitlist_record.id,
      target_photo_session_id,
      waitlist_record.user_id,
      'promoted',
      waitlist_record.queue_position,
      'waiting',
      'promoted',
      '空きが発生したため自動繰り上げ'
    );
    
    -- 通知を作成
    INSERT INTO waitlist_notifications (
      waitlist_entry_id,
      user_id,
      photo_session_id,
      notification_type,
      title,
      message
    ) VALUES (
      waitlist_record.id,
      waitlist_record.user_id,
      target_photo_session_id,
      'promotion_available',
      '繰り上げ当選のお知らせ',
      '撮影会に空きが発生しました。' || promotion_deadline || 'までに予約を確定してください。'
    );
    
    promoted_count := promoted_count + 1;
    promoted_users := array_append(promoted_users, waitlist_record.user_id);
  END LOOP;
  
  -- 残りのキャンセル待ちの順位を更新
  UPDATE waitlist_entries 
      SET queue_position = queue_position - promoted_count
  WHERE photo_session_id = target_photo_session_id 
  AND status = 'waiting'
  AND queue_position > (
    SELECT MIN(queue_position) FROM waitlist_entries 
    WHERE photo_session_id = target_photo_session_id 
    AND status = 'promoted'
  );
  
  RETURN QUERY SELECT promoted_count, promoted_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- キャンセル待ちキャンセル用のストアドプロシージャ
CREATE OR REPLACE FUNCTION cancel_waitlist_entry(
  target_waitlist_entry_id UUID,
  target_user_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  entry_record waitlist_entries%ROWTYPE;
  affected_queue_position INTEGER;
BEGIN
  -- エントリーを取得
  SELECT * INTO entry_record 
  FROM waitlist_entries 
  WHERE id = target_waitlist_entry_id 
  AND user_id = target_user_id
  AND status IN ('waiting', 'promoted');
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'キャンセル待ちエントリーが見つかりません';
    RETURN;
  END IF;
  
  affected_queue_position := entry_record.queue_position;
  
  -- エントリーをキャンセル状態に更新
  UPDATE waitlist_entries 
  SET 
    status = 'cancelled',
    cancelled_at = NOW()
  WHERE id = target_waitlist_entry_id;
  
  -- 履歴を記録
  INSERT INTO waitlist_history (
    waitlist_entry_id,
    photo_session_id,
    user_id,
    action,
    old_queue_position,
    old_status,
    new_status,
    reason
  ) VALUES (
    target_waitlist_entry_id,
    entry_record.photo_session_id,
    target_user_id,
    'cancelled',
    affected_queue_position,
    entry_record.status,
    'cancelled',
    'ユーザーによるキャンセル'
  );
  
  -- 後続の待ち順位を繰り上げ
  UPDATE waitlist_entries 
  SET queue_position = queue_position - 1
  WHERE photo_session_id = entry_record.photo_session_id 
  AND status = 'waiting'
  AND queue_position > affected_queue_position;
  
  RETURN QUERY SELECT true, 'キャンセル待ちをキャンセルしました';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 期限切れキャンセル待ちの処理用ストアドプロシージャ
CREATE OR REPLACE FUNCTION expire_waitlist_promotions()
RETURNS TABLE (
  expired_count INTEGER,
  expired_users UUID[]
) AS $$
DECLARE
  expired_record waitlist_entries%ROWTYPE;
  expired_count INTEGER := 0;
  expired_users UUID[] := ARRAY[]::UUID[];
BEGIN
  -- 期限切れの繰り上げエントリーを処理
  FOR expired_record IN 
    SELECT * FROM waitlist_entries 
    WHERE status = 'promoted'
    AND promotion_deadline < NOW()
  LOOP
    -- エントリーを期限切れ状態に更新
    UPDATE waitlist_entries 
    SET 
      status = 'expired',
      expired_at = NOW()
    WHERE id = expired_record.id;
    
    -- 履歴を記録
    INSERT INTO waitlist_history (
      waitlist_entry_id,
      photo_session_id,
      user_id,
      action,
      old_status,
      new_status,
      reason
    ) VALUES (
      expired_record.id,
      expired_record.photo_session_id,
      expired_record.user_id,
      'expired',
      'promoted',
      'expired',
      '繰り上げ期限切れ'
    );
    
    expired_count := expired_count + 1;
    expired_users := array_append(expired_users, expired_record.user_id);
  END LOOP;
  
  RETURN QUERY SELECT expired_count, expired_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- トリガー設定
-- =============================================================================

-- 更新時刻自動更新トリガー
CREATE TRIGGER update_lottery_sessions_updated_at 
  BEFORE UPDATE ON lottery_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_lottery_sessions_updated_at 
  BEFORE UPDATE ON admin_lottery_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ranks_updated_at 
  BEFORE UPDATE ON user_ranks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_priority_booking_settings_updated_at 
  BEFORE UPDATE ON priority_booking_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlist_settings_updated_at 
  BEFORE UPDATE ON waitlist_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 撮影会画像機能 (Photo Session Images)
-- =============================================================================

-- 撮影会テーブルに画像URL配列フィールドを追加
ALTER TABLE photo_sessions ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_photo_sessions_image_urls ON photo_sessions USING GIN (image_urls);

-- コメント追加
COMMENT ON COLUMN photo_sessions.image_urls IS '撮影会の画像URL配列（最初の要素がメイン画像）';

-- =============================================================================
-- Supabase Storage設定 (Storage Configuration)
-- =============================================================================

-- ストレージバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photo-sessions',
  'photo-sessions',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 公開読み取りポリシー
CREATE POLICY "Public read access for photo session images" ON storage.objects
FOR SELECT USING (bucket_id = 'photo-sessions');

-- 認証済みユーザーのアップロードポリシー
CREATE POLICY "Authenticated users can upload photo session images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'photo-sessions' 
  AND auth.role() = 'authenticated'
);

-- 所有者のみ削除可能ポリシー
CREATE POLICY "Users can delete their own photo session images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'photo-sessions' 
  AND auth.uid() = owner
);

-- 所有者のみ更新可能ポリシー
CREATE POLICY "Users can update their own photo session images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'photo-sessions' 
  AND auth.uid() = owner
) WITH CHECK (
  bucket_id = 'photo-sessions' 
  AND auth.uid() = owner
);

-- =============================================================================
-- 予約方式フィールド追加 (Booking Type Field)
-- =============================================================================

-- booking_type列を追加
ALTER TABLE photo_sessions ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'first_come';

-- CHECK制約を追加
ALTER TABLE photo_sessions ADD CONSTRAINT photo_sessions_booking_type_check 
CHECK (booking_type IN ('first_come', 'lottery', 'admin_lottery', 'priority'));

-- NOT NULL制約を追加
ALTER TABLE photo_sessions ALTER COLUMN booking_type SET NOT NULL;

-- インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_photo_sessions_booking_type ON photo_sessions(booking_type);

-- コメント追加
COMMENT ON COLUMN photo_sessions.booking_type IS '予約方式: first_come(先着順), lottery(抽選), admin_lottery(管理抽選), priority(優先予約)';

-- 既存データのデフォルト値設定
UPDATE photo_sessions SET booking_type = 'first_come' WHERE booking_type IS NULL; 