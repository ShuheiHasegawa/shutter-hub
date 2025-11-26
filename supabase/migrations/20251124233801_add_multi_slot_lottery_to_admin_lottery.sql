-- Migration: 20251124233801_add_multi_slot_lottery_to_admin_lottery
-- Description: 管理抽選セッションに複数スロット抽選設定を追加
-- Date: 2025-11-24

-- =============================================================================
-- admin_lottery_sessionsテーブルに複数スロット抽選設定を追加
-- =============================================================================

-- 複数スロット抽選設定を追加（lottery_sessionsと同じフィールド）
ALTER TABLE admin_lottery_sessions
  ADD COLUMN IF NOT EXISTS enable_lottery_weight BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weight_calculation_method TEXT DEFAULT 'linear' 
    CHECK (weight_calculation_method IN ('linear', 'bonus', 'custom')),
  ADD COLUMN IF NOT EXISTS weight_multiplier DECIMAL(10, 2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS enable_model_selection BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS model_selection_scope TEXT DEFAULT 'per_slot'
    CHECK (model_selection_scope IN ('per_slot', 'session_wide')),
  ADD COLUMN IF NOT EXISTS enable_cheki_selection BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cheki_selection_scope TEXT DEFAULT 'total_only'
    CHECK (cheki_selection_scope IN ('per_slot', 'total_only'));

-- コメント追加
COMMENT ON COLUMN admin_lottery_sessions.enable_lottery_weight IS '応募数による当選確率調整の有効化';
COMMENT ON COLUMN admin_lottery_sessions.weight_calculation_method IS '重み計算方法: linear=線形, bonus=ボーナス, custom=カスタム';
COMMENT ON COLUMN admin_lottery_sessions.weight_multiplier IS '重み倍率（運営者が設定）';
COMMENT ON COLUMN admin_lottery_sessions.enable_model_selection IS '推しモデル選択機能の有効化';
COMMENT ON COLUMN admin_lottery_sessions.model_selection_scope IS 'モデル選択範囲: per_slot=スロットごと, session_wide=撮影会全体';
COMMENT ON COLUMN admin_lottery_sessions.enable_cheki_selection IS 'チェキ選択機能の有効化';
COMMENT ON COLUMN admin_lottery_sessions.cheki_selection_scope IS 'チェキ選択範囲: per_slot=スロットごと, total_only=合計のみ';






