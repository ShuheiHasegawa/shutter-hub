-- Migration: 20251126033155_create_select_admin_lottery_winners_function
-- Description: 管理抽選の当選者選出ストアドプロシージャを作成
-- Date: 2025-11-26

-- =============================================================================
-- 管理抽選当選者選出ストアドプロシージャ
-- =============================================================================

CREATE OR REPLACE FUNCTION select_admin_lottery_winners(
  p_session_id UUID,
  p_entry_ids UUID[],
  p_selected_by_user_id UUID,
  p_selection_reason TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  selected_count INTEGER
) AS $$
DECLARE
  session_record admin_lottery_sessions%ROWTYPE;
  entry_id UUID;
  selected_count INTEGER := 0;
  total_entries_count INTEGER;
  entry_record RECORD;
  bookings_count INTEGER := 0;
  photo_session_id_val UUID;
BEGIN
  -- 管理抽選セッション情報を取得
  SELECT * INTO session_record 
  FROM admin_lottery_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '管理抽選セッションが見つかりません', 0;
    RETURN;
  END IF;
  
  -- 既に選択が完了している場合
  IF session_record.status = 'completed' THEN
    RETURN QUERY SELECT false, '選択は既に完了しています', 0;
    RETURN;
  END IF;
  
  -- エントリーIDの配列が空の場合
  IF array_length(p_entry_ids, 1) IS NULL OR array_length(p_entry_ids, 1) = 0 THEN
    RETURN QUERY SELECT false, '選択するエントリーが指定されていません', 0;
    RETURN;
  END IF;
  
  -- 指定されたエントリーがこのセッションに属しているか確認
  SELECT COUNT(*) INTO total_entries_count
  FROM admin_lottery_entries
  WHERE admin_lottery_session_id = p_session_id
    AND id = ANY(p_entry_ids)
    AND status = 'applied';
  
  IF total_entries_count != array_length(p_entry_ids, 1) THEN
    RETURN QUERY SELECT false, '無効なエントリーIDが含まれています', 0;
    RETURN;
  END IF;
  
  -- 各エントリーを選択状態に更新
  FOREACH entry_id IN ARRAY p_entry_ids
  LOOP
    UPDATE admin_lottery_entries
    SET 
      status = 'selected',
      selected_at = NOW(),
      selection_notes = p_selection_reason
    WHERE id = entry_id
      AND admin_lottery_session_id = p_session_id
      AND status = 'applied';
    
    IF FOUND THEN
      selected_count := selected_count + 1;
    END IF;
  END LOOP;
  
  -- 残りのエントリーを拒否状態に更新
  UPDATE admin_lottery_entries
  SET status = 'rejected'
  WHERE admin_lottery_session_id = p_session_id
    AND status = 'applied'
    AND id != ALL(p_entry_ids);
  
  -- 撮影会IDを取得
  SELECT photo_session_id INTO photo_session_id_val
  FROM admin_lottery_sessions
  WHERE id = p_session_id;
  
  -- 当選者から予約を作成
  FOR entry_record IN
    SELECT 
      ale.id,
      ale.user_id,
      ale.slot_id,
      photo_session_id_val as photo_session_id
    FROM admin_lottery_entries ale
    WHERE ale.admin_lottery_session_id = p_session_id
      AND ale.status = 'selected'
      AND ale.id = ANY(p_entry_ids)
  LOOP
    -- 既存の予約をチェック（スロットごと、または撮影会全体）
    IF NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE photo_session_id = entry_record.photo_session_id
        AND user_id = entry_record.user_id
        AND (
          (entry_record.slot_id IS NOT NULL AND slot_id = entry_record.slot_id)
          OR (entry_record.slot_id IS NULL)
        )
        AND status = 'confirmed'
    ) THEN
      -- 予約を作成
      INSERT INTO bookings (
        photo_session_id,
        user_id,
        slot_id,
        status,
        created_at
      ) VALUES (
        entry_record.photo_session_id,
        entry_record.user_id,
        entry_record.slot_id,
        'confirmed',
        NOW()
      );
      
      bookings_count := bookings_count + 1;
    END IF;
  END LOOP;
  
  -- 撮影会とスロットの参加者数を更新
  UPDATE photo_sessions ps
  SET current_participants = (
    SELECT COUNT(DISTINCT b.user_id)
    FROM bookings b
    WHERE b.photo_session_id = ps.id
      AND b.status = 'confirmed'
  )
  WHERE ps.id = photo_session_id_val;
  
  -- スロットごとの参加者数を更新
  UPDATE photo_session_slots pss
  SET current_participants = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.slot_id = pss.id
      AND b.status = 'confirmed'
  )
  WHERE pss.photo_session_id = photo_session_id_val;
  
  -- 管理抽選セッションのステータスを完了に更新
  UPDATE admin_lottery_sessions
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN QUERY SELECT true, format('%s名の当選者を選出し、%s件の予約を作成しました', selected_count, bookings_count), selected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON FUNCTION select_admin_lottery_winners IS '管理抽選の当選者を選出し、セッションを完了状態に更新する';

