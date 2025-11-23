-- Migration: 20251123163401_add_max_entries_to_lottery_sessions
-- Description: 抽選エントリー上限設定を追加
-- Date: 2025-11-23

-- lottery_sessionsテーブルにmax_entriesカラムを追加
ALTER TABLE lottery_sessions
  ADD COLUMN IF NOT EXISTS max_entries INTEGER;

COMMENT ON COLUMN lottery_sessions.max_entries IS 'スロットごとのエントリー上限数（全スロット共通、NULLの場合は上限なし）';

