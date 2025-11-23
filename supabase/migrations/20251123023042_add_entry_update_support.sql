-- Migration: 20251123023042_add_entry_update_support
-- Description: エントリー変更機能のサポート（変更回数記録）
-- Created: 2025-11-23

-- =============================================================================
-- lottery_entry_groupsテーブルの拡張
-- =============================================================================

-- 変更回数カラムを追加
ALTER TABLE lottery_entry_groups
  ADD COLUMN IF NOT EXISTS update_count INTEGER DEFAULT 0 NOT NULL CHECK (update_count >= 0 AND update_count <= 3);

-- コメント追加
COMMENT ON COLUMN lottery_entry_groups.update_count IS 'エントリー変更回数（最大3回まで）';




