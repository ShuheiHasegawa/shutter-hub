-- キャンセル待ちテーブル
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 待ち順位
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'expired', 'cancelled')),
  
  -- 自動繰り上げ設定
  auto_promote BOOLEAN DEFAULT true,
  notification_sent BOOLEAN DEFAULT false,
  promotion_deadline TIMESTAMPTZ, -- 繰り上げ通知の期限
  
  -- メッセージ・理由
  message TEXT, -- キャンセル待ち登録時のメッセージ
  promotion_reason TEXT, -- 繰り上げ理由
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  promoted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  UNIQUE(photo_session_id, user_id) -- 1撮影会につき1エントリー
);

-- キャンセル待ち設定テーブル
CREATE TABLE waitlist_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  
  -- 機能ON/OFF
  enabled BOOLEAN DEFAULT true,
  max_waitlist_size INTEGER DEFAULT 50, -- 最大キャンセル待ち数
  
  -- 自動繰り上げ設定
  auto_promote_enabled BOOLEAN DEFAULT true,
  promotion_deadline_hours INTEGER DEFAULT 24, -- 繰り上げ通知の期限（時間）
  
  -- 通知設定
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(photo_session_id) -- 1撮影会につき1設定
);

-- キャンセル待ち履歴テーブル
CREATE TABLE waitlist_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waitlist_entry_id UUID REFERENCES waitlist_entries(id) ON DELETE CASCADE,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'joined', 'promoted', 'expired', 'cancelled', 'position_changed'
  old_position INTEGER,
  new_position INTEGER,
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- キャンセル待ち通知テーブル
CREATE TABLE waitlist_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waitlist_entry_id UUID REFERENCES waitlist_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL, -- 'promotion_available', 'position_changed', 'deadline_reminder'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- 送信状態
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- 送信方法
  email_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_waitlist_entries_photo_session ON waitlist_entries(photo_session_id);
CREATE INDEX idx_waitlist_entries_user ON waitlist_entries(user_id);
CREATE INDEX idx_waitlist_entries_status ON waitlist_entries(status);
CREATE INDEX idx_waitlist_entries_position ON waitlist_entries(photo_session_id, position);
CREATE INDEX idx_waitlist_settings_photo_session ON waitlist_settings(photo_session_id);
CREATE INDEX idx_waitlist_history_entry ON waitlist_history(waitlist_entry_id);
CREATE INDEX idx_waitlist_history_photo_session ON waitlist_history(photo_session_id);
CREATE INDEX idx_waitlist_notifications_user ON waitlist_notifications(user_id);
CREATE INDEX idx_waitlist_notifications_sent ON waitlist_notifications(sent);

-- RLS (Row Level Security) 設定
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_notifications ENABLE ROW LEVEL SECURITY;

-- キャンセル待ちエントリーのRLSポリシー
CREATE POLICY "キャンセル待ちエントリーは誰でも閲覧可能" ON waitlist_entries
  FOR SELECT USING (true);

CREATE POLICY "キャンセル待ちエントリーは本人のみ作成・更新可能" ON waitlist_entries
  FOR ALL USING (auth.uid() = user_id);

-- キャンセル待ち設定のRLSポリシー
CREATE POLICY "キャンセル待ち設定は誰でも閲覧可能" ON waitlist_settings
  FOR SELECT USING (true);

CREATE POLICY "キャンセル待ち設定は開催者のみ作成・更新可能" ON waitlist_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = waitlist_settings.photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- キャンセル待ち履歴のRLSポリシー
CREATE POLICY "キャンセル待ち履歴は誰でも閲覧可能" ON waitlist_history
  FOR SELECT USING (true);

CREATE POLICY "キャンセル待ち履歴は自動システムのみ作成可能" ON waitlist_history
  FOR INSERT WITH CHECK (true);

-- キャンセル待ち通知のRLSポリシー
CREATE POLICY "キャンセル待ち通知は本人のみ閲覧可能" ON waitlist_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "キャンセル待ち通知は本人のみ更新可能" ON waitlist_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "キャンセル待ち通知は自動システムのみ作成可能" ON waitlist_notifications
  FOR INSERT WITH CHECK (true);

-- キャンセル待ち登録用のストアドプロシージャ
CREATE OR REPLACE FUNCTION join_waitlist(
  target_photo_session_id UUID,
  target_user_id UUID,
  user_message TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  position INTEGER,
  waitlist_entry_id UUID
) AS $$
DECLARE
  session_record photo_sessions%ROWTYPE;
  settings_record waitlist_settings%ROWTYPE;
  current_bookings INTEGER := 0;
  current_waitlist_size INTEGER := 0;
  new_position INTEGER;
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
  SELECT COALESCE(MAX(position), 0) + 1 INTO new_position
  FROM waitlist_entries 
  WHERE photo_session_id = target_photo_session_id 
  AND status = 'waiting';
  
  -- キャンセル待ちエントリーを作成
  INSERT INTO waitlist_entries (
    photo_session_id, 
    user_id, 
    position, 
    message,
    auto_promote
  ) VALUES (
    target_photo_session_id, 
    target_user_id, 
    new_position, 
    user_message,
    true
  ) RETURNING id INTO new_entry_id;
  
  -- 履歴を記録
  INSERT INTO waitlist_history (
    waitlist_entry_id,
    photo_session_id,
    user_id,
    action,
    new_position,
    new_status,
    reason
  ) VALUES (
    new_entry_id,
    target_photo_session_id,
    target_user_id,
    'joined',
    new_position,
    'waiting',
    'ユーザーがキャンセル待ちに登録'
  );
  
  RETURN QUERY SELECT true, 'キャンセル待ちに登録しました', new_position, new_entry_id;
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
  promotion_deadline TIMESTAMPTZ;
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
    ORDER BY position ASC
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
      old_position,
      old_status,
      new_status,
      reason
    ) VALUES (
      waitlist_record.id,
      target_photo_session_id,
      waitlist_record.user_id,
      'promoted',
      waitlist_record.position,
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
  SET position = position - promoted_count
  WHERE photo_session_id = target_photo_session_id 
  AND status = 'waiting'
  AND position > (
    SELECT MIN(position) FROM waitlist_entries 
    WHERE photo_session_id = target_photo_session_id 
    AND status = 'promoted'
  );
  
  RETURN QUERY SELECT promoted_count, promoted_users;
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
  affected_position INTEGER;
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
  
  affected_position := entry_record.position;
  
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
    old_position,
    old_status,
    new_status,
    reason
  ) VALUES (
    target_waitlist_entry_id,
    entry_record.photo_session_id,
    target_user_id,
    'cancelled',
    affected_position,
    entry_record.status,
    'cancelled',
    'ユーザーによるキャンセル'
  );
  
  -- 後続の待ち順位を繰り上げ
  UPDATE waitlist_entries 
  SET position = position - 1
  WHERE photo_session_id = entry_record.photo_session_id 
  AND status = 'waiting'
  AND position > affected_position;
  
  RETURN QUERY SELECT true, 'キャンセル待ちをキャンセルしました';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 