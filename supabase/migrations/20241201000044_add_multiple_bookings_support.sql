-- Migration: 044_add_multiple_bookings_support
-- Description: 撮影会での複数予約許可機能を追加
-- Created: 2024-12-01

-- 撮影会テーブルに複数予約許可フィールドを追加
ALTER TABLE photo_sessions 
ADD COLUMN IF NOT EXISTS allow_multiple_bookings BOOLEAN DEFAULT false;

-- インデックス追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_photo_sessions_allow_multiple_bookings 
ON photo_sessions(allow_multiple_bookings);

-- コメント追加
COMMENT ON COLUMN photo_sessions.allow_multiple_bookings IS '複数予約許可: true=ユーザーが複数の時間枠を予約可能, false=1つの枠のみ予約可能';

-- 既存データのデフォルト値設定（明示的にfalse）
UPDATE photo_sessions 
SET allow_multiple_bookings = false 
WHERE allow_multiple_bookings IS NULL;

-- NOT NULL制約を追加
ALTER TABLE photo_sessions 
ALTER COLUMN allow_multiple_bookings SET NOT NULL;

-- bookingsテーブルのUNIQUE制約を条件付きに変更
-- 複数予約が許可されている場合は重複を許可する必要がある

-- 既存のUNIQUE制約を削除
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_photo_session_id_user_id_key;

-- 新しい条件付きUNIQUE制約を追加
-- 複数予約が許可されていない撮影会では、ユーザーごとに1つの予約のみ許可
-- スロット制の場合は、slot_idが異なれば同一ユーザーでも複数予約可能
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_single_booking_per_user 
ON bookings (photo_session_id, user_id) 
WHERE slot_id IS NULL;

-- スロット予約の場合は、同一スロットに対して同一ユーザーは1つまで
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_single_slot_per_user 
ON bookings (slot_id, user_id) 
WHERE slot_id IS NOT NULL;

-- 複数予約チェック用のストアドプロシージャ
CREATE OR REPLACE FUNCTION check_multiple_booking_allowed(
  p_photo_session_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_record RECORD;
  v_existing_bookings INTEGER;
BEGIN
  -- 撮影会情報を取得
  SELECT allow_multiple_bookings, booking_type
  INTO v_session_record
  FROM photo_sessions
  WHERE id = p_photo_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '撮影会が見つかりません'::TEXT;
    RETURN;
  END IF;
  
  -- 複数予約が許可されている場合は常にOK
  IF v_session_record.allow_multiple_bookings THEN
    RETURN QUERY SELECT true, '複数予約が許可されています'::TEXT;
    RETURN;
  END IF;
  
  -- 複数予約が許可されていない場合、既存予約をチェック
  SELECT COUNT(*)
  INTO v_existing_bookings
  FROM bookings
  WHERE photo_session_id = p_photo_session_id
    AND user_id = p_user_id
    AND status = 'confirmed';
  
  IF v_existing_bookings > 0 THEN
    RETURN QUERY SELECT false, '既に予約済みです。この撮影会では複数予約は許可されていません'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, '予約可能です'::TEXT;
END;
$$; 