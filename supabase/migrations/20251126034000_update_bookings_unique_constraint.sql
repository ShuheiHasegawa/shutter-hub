-- Migration: 20251126034000_update_bookings_unique_constraint
-- Description: bookingsテーブルのUNIQUE制約をスロット対応に変更
-- Date: 2025-11-26

-- 既存のUNIQUE制約を削除
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_photo_session_id_user_id_key;

-- スロットIDを含むUNIQUE制約を追加
-- slot_idがNULLの場合は(photo_session_id, user_id)の組み合わせで一意
-- slot_idがNOT NULLの場合は(photo_session_id, user_id, slot_id)の組み合わせで一意
CREATE UNIQUE INDEX bookings_photo_session_user_slot_unique 
ON bookings(photo_session_id, user_id, COALESCE(slot_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- コメント追加
COMMENT ON INDEX bookings_photo_session_user_slot_unique IS '同じユーザーが同じ撮影会の同じスロットに複数の予約を持てないようにする制約';





