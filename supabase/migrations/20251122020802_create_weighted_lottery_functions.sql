-- Migration: 20251122020802_create_weighted_lottery_functions
-- Description: 重み付き抽選アルゴリズムの実装
-- Created: 2025-11-22

-- =============================================================================
-- 1. 重み付き抽選実行関数
-- =============================================================================

CREATE OR REPLACE FUNCTION execute_weighted_lottery(
  p_lottery_session_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  total_winners INTEGER,
  total_entries INTEGER
) AS $$
DECLARE
  session_record lottery_sessions%ROWTYPE;
  slot_record RECORD;
  entry_record RECORD;
  total_entries_count INTEGER := 0;
  winners_selected INTEGER := 0;
  weight_sum DECIMAL(10, 4) := 0;
  random_value DECIMAL(10, 4);
  cumulative_weight DECIMAL(10, 4);
  slot_winners_count INTEGER;
  slot_max_participants INTEGER;
  group_record RECORD;
BEGIN
  -- 抽選セッション情報を取得
  SELECT * INTO session_record
  FROM lottery_sessions
  WHERE id = p_lottery_session_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '抽選セッションが見つかりません', 0, 0;
    RETURN;
  END IF;

  IF session_record.status != 'accepting' THEN
    RETURN QUERY SELECT false, '抽選セッションがエントリー受付中ではありません', 0, 0;
    RETURN;
  END IF;

  -- エントリー総数を取得
  SELECT COUNT(DISTINCT user_id) INTO total_entries_count
  FROM lottery_entry_groups
  WHERE lottery_session_id = p_lottery_session_id
    AND group_status = 'entered';

  IF total_entries_count = 0 THEN
    RETURN QUERY SELECT false, 'エントリーがありません', 0, 0;
    RETURN;
  END IF;

  -- 各スロットごとに抽選を実行
  FOR slot_record IN
    SELECT 
      pss.id as slot_id,
      pss.slot_number,
      pss.max_participants,
      ls.id as lottery_session_id
    FROM photo_session_slots pss
    JOIN photo_sessions ps ON ps.id = pss.photo_session_id
    JOIN lottery_sessions ls ON ls.photo_session_id = ps.id
    WHERE ls.id = p_lottery_session_id
      AND pss.is_active = true
    ORDER BY pss.slot_number
  LOOP
    slot_max_participants := slot_record.max_participants;
    slot_winners_count := 0;

    -- 重み付き抽選が有効な場合
    IF session_record.enable_lottery_weight THEN
      -- 各エントリーの重みを計算・更新
      UPDATE lottery_slot_entries lse
      SET lottery_weight = CASE
        WHEN session_record.weight_calculation_method = 'linear' THEN
          -- 線形: 応募スロット数 = 重み
          (SELECT total_slots_applied::DECIMAL(10, 4)
           FROM lottery_entry_groups leg
           WHERE leg.id = lse.lottery_entry_group_id)
        WHEN session_record.weight_calculation_method = 'bonus' THEN
          -- ボーナス: 基本重み1.0 + (応募スロット数 - 1) * ボーナス倍率
          1.0 + ((SELECT total_slots_applied::DECIMAL(10, 4)
                  FROM lottery_entry_groups leg
                  WHERE leg.id = lse.lottery_entry_group_id) - 1.0) * 
                COALESCE(session_record.weight_multiplier, 1.0)
        ELSE
          -- custom: カスタム計算（現在は線形と同じ）
          (SELECT total_slots_applied::DECIMAL(10, 4)
           FROM lottery_entry_groups leg
           WHERE leg.id = lse.lottery_entry_group_id)
      END * COALESCE(session_record.weight_multiplier, 1.0)
      WHERE lse.lottery_session_id = p_lottery_session_id
        AND lse.slot_id = slot_record.slot_id
        AND lse.status = 'entered';

      -- 重みの合計を計算
      SELECT COALESCE(SUM(lottery_weight), 0) INTO weight_sum
      FROM lottery_slot_entries
      WHERE lottery_session_id = p_lottery_session_id
        AND slot_id = slot_record.slot_id
        AND status = 'entered';

      -- 重み付きランダム抽選を実行
      WHILE slot_winners_count < slot_max_participants LOOP
        -- 残りのエントリーを確認
        IF NOT EXISTS (
          SELECT 1 FROM lottery_slot_entries
          WHERE lottery_session_id = p_lottery_session_id
            AND slot_id = slot_record.slot_id
            AND status = 'entered'
        ) THEN
          EXIT;
        END IF;

        -- ランダム値を生成（0.0 ～ weight_sum）
        random_value := random() * weight_sum;
        cumulative_weight := 0;

        -- 重み付き抽選
        FOR entry_record IN
          SELECT 
            lse.id,
            lse.lottery_weight,
            lse.user_id
          FROM lottery_slot_entries lse
          WHERE lse.lottery_session_id = p_lottery_session_id
            AND lse.slot_id = slot_record.slot_id
            AND lse.status = 'entered'
          ORDER BY lse.id
        LOOP
          cumulative_weight := cumulative_weight + entry_record.lottery_weight;
          
          IF random_value <= cumulative_weight THEN
            -- 当選
            UPDATE lottery_slot_entries
            SET status = 'won',
                won_at = NOW()
            WHERE id = entry_record.id;

            slot_winners_count := slot_winners_count + 1;
            winners_selected := winners_selected + 1;

            -- 重みの合計から当選者の重みを減算
            weight_sum := weight_sum - entry_record.lottery_weight;

            EXIT;
          END IF;
        END LOOP;
      END LOOP;

    ELSE
      -- 通常のランダム抽選（重みなし）
      WITH winners AS (
        SELECT lse.id
        FROM lottery_slot_entries lse
        WHERE lse.lottery_session_id = p_lottery_session_id
          AND lse.slot_id = slot_record.slot_id
          AND lse.status = 'entered'
        ORDER BY RANDOM()
        LIMIT slot_max_participants
      )
      UPDATE lottery_slot_entries lse
      SET status = 'won',
          won_at = NOW()
      FROM winners w
      WHERE lse.id = w.id;

      GET DIAGNOSTICS slot_winners_count = ROW_COUNT;
      winners_selected := winners_selected + slot_winners_count;
    END IF;

    -- 残りのエントリーを落選に更新
    UPDATE lottery_slot_entries
    SET status = 'lost'
    WHERE lottery_session_id = p_lottery_session_id
      AND slot_id = slot_record.slot_id
      AND status = 'entered';
  END LOOP;

  -- グループごとの当選状況を更新
  FOR group_record IN
    SELECT 
      leg.id,
      leg.cancellation_policy,
      COUNT(CASE WHEN lse.status = 'won' THEN 1 END) as won_count,
      leg.total_slots_applied
    FROM lottery_entry_groups leg
    LEFT JOIN lottery_slot_entries lse ON lse.lottery_entry_group_id = leg.id
    WHERE leg.lottery_session_id = p_lottery_session_id
    GROUP BY leg.id, leg.cancellation_policy, leg.total_slots_applied
  LOOP
    -- グループの状態を更新
    UPDATE lottery_entry_groups
    SET 
      slots_won = group_record.won_count,
      group_status = CASE
        WHEN group_record.won_count = 0 THEN 'all_lost'
        WHEN group_record.won_count = group_record.total_slots_applied THEN 'all_won'
        ELSE 'partially_won'
      END,
      updated_at = NOW()
    WHERE id = group_record.id;

    -- キャンセルポリシーに基づいて処理
    IF group_record.cancellation_policy = 'all_or_nothing' THEN
      -- 全落選または部分当選の場合は全て落選扱い
      IF group_record.won_count < group_record.total_slots_applied THEN
        UPDATE lottery_slot_entries
        SET status = 'lost',
            won_at = NULL
        WHERE lottery_entry_group_id = group_record.id
          AND status = 'won';
        
        -- グループ状態を更新
        UPDATE lottery_entry_groups
        SET 
          slots_won = 0,
          group_status = 'all_lost',
          updated_at = NOW()
        WHERE id = group_record.id;
      END IF;
    END IF;
  END LOOP;

  -- 抽選セッションのステータスを更新
  UPDATE lottery_sessions 
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_lottery_session_id;

  RETURN QUERY SELECT true, '抽選が正常に完了しました', winners_selected, total_entries_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. 当選者から予約を作成する関数
-- =============================================================================

CREATE OR REPLACE FUNCTION create_bookings_from_lottery_winners(
  p_lottery_session_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  bookings_created INTEGER
) AS $$
DECLARE
  entry_record RECORD;
  bookings_count INTEGER := 0;
BEGIN
  -- 当選したスロットエントリーから予約を作成
  FOR entry_record IN
    SELECT 
      lse.id,
      lse.slot_id,
      lse.user_id,
      pss.photo_session_id,
      leg.cancellation_policy,
      leg.group_status
    FROM lottery_slot_entries lse
    JOIN photo_session_slots pss ON pss.id = lse.slot_id
    JOIN lottery_entry_groups leg ON leg.id = lse.lottery_entry_group_id
    WHERE lse.lottery_session_id = p_lottery_session_id
      AND lse.status = 'won'
      AND leg.group_status IN ('all_won', 'partially_won')
  LOOP
    -- 既存の予約をチェック
    IF NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE photo_session_id = entry_record.photo_session_id
        AND user_id = entry_record.user_id
        AND slot_id = entry_record.slot_id
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
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.photo_session_id = ps.id
      AND b.status = 'confirmed'
  )
  WHERE ps.id IN (
    SELECT DISTINCT pss.photo_session_id
    FROM lottery_slot_entries lse
    JOIN photo_session_slots pss ON pss.id = lse.slot_id
    WHERE lse.lottery_session_id = p_lottery_session_id
      AND lse.status = 'won'
  );

  UPDATE photo_session_slots pss
  SET current_participants = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.slot_id = pss.id
      AND b.status = 'confirmed'
  )
  WHERE pss.id IN (
    SELECT DISTINCT slot_id
    FROM lottery_slot_entries
    WHERE lottery_session_id = p_lottery_session_id
      AND status = 'won'
  );

  RETURN QUERY SELECT true, '予約の作成が完了しました', bookings_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. エントリー重み計算関数（ユーティリティ）
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_lottery_weight(
  p_total_slots_applied INTEGER,
  p_calculation_method TEXT,
  p_weight_multiplier DECIMAL(10, 2) DEFAULT 1.0
) RETURNS DECIMAL(10, 4) AS $$
BEGIN
  RETURN CASE
    WHEN p_calculation_method = 'linear' THEN
      p_total_slots_applied::DECIMAL(10, 4) * p_weight_multiplier
    WHEN p_calculation_method = 'bonus' THEN
      (1.0 + (p_total_slots_applied - 1)::DECIMAL(10, 4) * p_weight_multiplier)
    ELSE
      p_total_slots_applied::DECIMAL(10, 4) * p_weight_multiplier
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


