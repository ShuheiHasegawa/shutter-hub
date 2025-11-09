-- Migration: 20251109150413_add_studio_hidden_status
-- Description: スタジオ非表示機能 - 報告数が3件に達したら自動的に非表示にする
-- Created: 2025-11-09

-- ========================================================================
-- studiosテーブルに非表示関連カラムを追加
-- ========================================================================

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_studios_is_hidden ON studios(is_hidden) WHERE is_hidden = true;

-- コメント
COMMENT ON COLUMN studios.is_hidden IS '非表示フラグ - 報告数が3件に達したら自動的にtrueになる';
COMMENT ON COLUMN studios.hidden_reason IS '非表示理由 - 自動非表示の場合は「複数の報告により一時的に非表示」';
COMMENT ON COLUMN studios.hidden_at IS '非表示になった日時';

