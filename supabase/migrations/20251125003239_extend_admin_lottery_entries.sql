-- Migration: 20251125003239_extend_admin_lottery_entries
-- Description: admin_lottery_entriesテーブルに複数スロット対応フィールドを追加
-- Date: 2025-11-25

-- admin_lottery_entriesテーブルに複数スロット対応のフィールドを追加
ALTER TABLE admin_lottery_entries
  ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES photo_session_slots(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS preferred_model_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cheki_unsigned_count INTEGER DEFAULT 0 CHECK (cheki_unsigned_count >= 0),
  ADD COLUMN IF NOT EXISTS cheki_signed_count INTEGER DEFAULT 0 CHECK (cheki_signed_count >= 0),
  ADD COLUMN IF NOT EXISTS lottery_weight DECIMAL(10, 4) DEFAULT 1.0;

-- 既存のエントリーに対してデフォルト値を設定
UPDATE admin_lottery_entries
SET 
  cheki_unsigned_count = 0,
  cheki_signed_count = 0,
  lottery_weight = 1.0
WHERE cheki_unsigned_count IS NULL OR cheki_signed_count IS NULL OR lottery_weight IS NULL;

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_admin_lottery_entries_slot_id 
  ON admin_lottery_entries(slot_id);
CREATE INDEX IF NOT EXISTS idx_admin_lottery_entries_preferred_model_id 
  ON admin_lottery_entries(preferred_model_id);
CREATE INDEX IF NOT EXISTS idx_admin_lottery_entries_lottery_weight 
  ON admin_lottery_entries(lottery_weight DESC);

-- コメントを追加
COMMENT ON COLUMN admin_lottery_entries.slot_id IS '応募したスロットID（複数スロット対応）';
COMMENT ON COLUMN admin_lottery_entries.preferred_model_id IS '推しモデルID';
COMMENT ON COLUMN admin_lottery_entries.cheki_unsigned_count IS 'チェキサインなし枚数';
COMMENT ON COLUMN admin_lottery_entries.cheki_signed_count IS 'チェキサインあり枚数';
COMMENT ON COLUMN admin_lottery_entries.lottery_weight IS '抽選重み（当選確率）';






