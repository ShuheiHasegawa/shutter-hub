-- 撮影会スロットシステム
-- 撮影会の時間枠を細分化し、枠ごとに時間・料金・人数・衣装を設定可能にする

-- 撮影会スロットテーブル
CREATE TABLE photo_session_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_session_id UUID NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL, -- スロット番号（1, 2, 3...）
  
  -- 時間設定
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  break_duration_minutes INTEGER DEFAULT 15, -- 次のスロットまでの休憩時間（分）
  
  -- 料金・参加者設定
  price_per_person INTEGER NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL DEFAULT 1,
  current_participants INTEGER DEFAULT 0,
  
  -- 衣装画像
  costume_image_url TEXT, -- 衣装画像のURL
  costume_description TEXT, -- 衣装の説明
  
  -- 割引設定
  discount_type TEXT CHECK (discount_type IN ('none', 'percentage', 'fixed_amount')) DEFAULT 'none',
  discount_value INTEGER DEFAULT 0, -- パーセンテージまたは固定金額
  discount_condition TEXT, -- 割引条件の説明
  
  -- メタデータ
  notes TEXT, -- スロット固有のメモ
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  UNIQUE(photo_session_id, slot_number),
  CHECK (start_time < end_time),
  CHECK (slot_number > 0),
  CHECK (max_participants > 0),
  CHECK (current_participants >= 0),
  CHECK (current_participants <= max_participants),
  CHECK (break_duration_minutes >= 0),
  CHECK (discount_value >= 0)
);

-- スロット予約テーブル（既存のbookingsテーブルを拡張）
ALTER TABLE bookings 
ADD COLUMN slot_id UUID REFERENCES photo_session_slots(id) ON DELETE CASCADE;

-- スロット予約のインデックス
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_photo_session_slots_session_id ON photo_session_slots(photo_session_id);
CREATE INDEX idx_photo_session_slots_start_time ON photo_session_slots(start_time);

-- スロット予約作成用ストアドプロシージャ
CREATE OR REPLACE FUNCTION create_slot_booking(
  p_slot_id UUID,
  p_user_id UUID,
  p_booking_type TEXT DEFAULT 'first_come'
)
RETURNS TABLE(
  booking_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot_record RECORD;
  v_session_record RECORD;
  v_booking_id UUID;
  v_current_participants INTEGER;
BEGIN
  -- スロット情報を取得
  SELECT * INTO v_slot_record
  FROM photo_session_slots
  WHERE id = p_slot_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, false, 'スロットが見つかりません'::TEXT;
    RETURN;
  END IF;
  
  -- 撮影会情報を取得
  SELECT * INTO v_session_record
  FROM photo_sessions
  WHERE id = v_slot_record.photo_session_id AND is_published = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, false, '撮影会が見つかりません'::TEXT;
    RETURN;
  END IF;
  
  -- 現在の参加者数を取得（ロック）
  SELECT current_participants INTO v_current_participants
  FROM photo_session_slots
  WHERE id = p_slot_id
  FOR UPDATE;
  
  -- 定員チェック
  IF v_current_participants >= v_slot_record.max_participants THEN
    RETURN QUERY SELECT NULL::UUID, false, 'このスロットは満席です'::TEXT;
    RETURN;
  END IF;
  
  -- 重複予約チェック
  IF EXISTS (
    SELECT 1 FROM bookings 
    WHERE slot_id = p_slot_id AND user_id = p_user_id AND status = 'confirmed'
  ) THEN
    RETURN QUERY SELECT NULL::UUID, false, 'すでにこのスロットを予約済みです'::TEXT;
    RETURN;
  END IF;
  
  -- 予約作成
  INSERT INTO bookings (
    photo_session_id,
    slot_id,
    user_id,
    status,
    created_at
  ) VALUES (
    v_slot_record.photo_session_id,
    p_slot_id,
    p_user_id,
    'confirmed',
    NOW()
  ) RETURNING id INTO v_booking_id;
  
  -- スロットの参加者数を更新
  UPDATE photo_session_slots
  SET 
    current_participants = current_participants + 1,
    updated_at = NOW()
  WHERE id = p_slot_id;
  
  -- 撮影会全体の参加者数も更新
  UPDATE photo_sessions
  SET 
    current_participants = (
      SELECT COALESCE(SUM(current_participants), 0)
      FROM photo_session_slots
      WHERE photo_session_id = v_slot_record.photo_session_id
    ),
    updated_at = NOW()
  WHERE id = v_slot_record.photo_session_id;
  
  RETURN QUERY SELECT v_booking_id, true, '予約が完了しました'::TEXT;
END;
$$;

-- スロット予約キャンセル用ストアドプロシージャ
CREATE OR REPLACE FUNCTION cancel_slot_booking(
  p_booking_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_record RECORD;
BEGIN
  -- 予約情報を取得
  SELECT b.*, s.photo_session_id
  INTO v_booking_record
  FROM bookings b
  JOIN photo_session_slots s ON b.slot_id = s.id
  WHERE b.id = p_booking_id AND b.user_id = p_user_id AND b.status = 'confirmed';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '予約が見つかりません'::TEXT;
    RETURN;
  END IF;
  
  -- 予約をキャンセル状態に更新
  UPDATE bookings
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- スロットの参加者数を減らす
  UPDATE photo_session_slots
  SET 
    current_participants = current_participants - 1,
    updated_at = NOW()
  WHERE id = v_booking_record.slot_id;
  
  -- 撮影会全体の参加者数も更新
  UPDATE photo_sessions
  SET 
    current_participants = (
      SELECT COALESCE(SUM(current_participants), 0)
      FROM photo_session_slots
      WHERE photo_session_id = v_booking_record.photo_session_id
    ),
    updated_at = NOW()
  WHERE id = v_booking_record.photo_session_id;
  
  RETURN QUERY SELECT true, 'キャンセルが完了しました'::TEXT;
END;
$$;

-- RLS (Row Level Security) 設定
ALTER TABLE photo_session_slots ENABLE ROW LEVEL SECURITY;

-- スロット閲覧ポリシー（公開されている撮影会のスロットは誰でも閲覧可能）
CREATE POLICY "photo_session_slots_select_policy" ON photo_session_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photo_sessions 
      WHERE id = photo_session_id AND is_published = true
    )
  );

-- スロット作成・更新ポリシー（撮影会の主催者のみ）
CREATE POLICY "photo_session_slots_insert_policy" ON photo_session_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM photo_sessions 
      WHERE id = photo_session_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "photo_session_slots_update_policy" ON photo_session_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM photo_sessions 
      WHERE id = photo_session_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "photo_session_slots_delete_policy" ON photo_session_slots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM photo_sessions 
      WHERE id = photo_session_id AND organizer_id = auth.uid()
    )
  );

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_photo_session_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_session_slots_updated_at
  BEFORE UPDATE ON photo_session_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_session_slots_updated_at();

-- RPC関数にSECURITY DEFINERを設定（RLS権限問題修正）
ALTER FUNCTION create_photo_session_booking(uuid, uuid) SECURITY DEFINER;
ALTER FUNCTION cancel_photo_session_booking(uuid, uuid) SECURITY DEFINER; 