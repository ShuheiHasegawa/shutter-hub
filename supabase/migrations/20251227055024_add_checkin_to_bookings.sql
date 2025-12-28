-- Migration: 20251227055024_add_checkin_to_bookings
-- Description: bookingsテーブルにチェックイン情報を追加
-- Date: 2025-12-27

-- bookingsテーブルにチェックイン情報を追加
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- インデックス追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_bookings_checked_in_at ON bookings(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_bookings_checked_out_at ON bookings(checked_out_at);

-- slot_idが存在しない場合は追加（念のため）
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES photo_session_slots(id) ON DELETE CASCADE;

-- slot_idのインデックス（既に存在する可能性があるが、念のため）
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);

-- コメント追加
COMMENT ON COLUMN bookings.checked_in_at IS '入場時刻（QRスキャン1回目）';
COMMENT ON COLUMN bookings.checked_out_at IS '退場時刻（QRスキャン2回目）';
COMMENT ON COLUMN bookings.slot_id IS '予約したスロットID（スロット制撮影会用）';

-- RLSポリシー: 主催者は自分の撮影会の予約のチェックイン情報を更新可能
-- （既存のポリシーで閲覧は可能だが、更新権限を追加）
CREATE POLICY "Organizers can update check-in for their sessions" ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM photo_sessions
      WHERE photo_sessions.id = bookings.photo_session_id
      AND photo_sessions.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM photo_sessions
      WHERE photo_sessions.id = bookings.photo_session_id
      AND photo_sessions.organizer_id = auth.uid()
    )
  );

