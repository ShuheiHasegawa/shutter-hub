-- Migration: 20251107100231_add_photographer_acceptance_flow
-- Description: フォトグラファー受諾フロー追加（2段階マッチング対応）
-- Date: 2025-11-07

-- =============================================================================
-- 1. instant_photo_requestsテーブルの拡張
-- =============================================================================

-- 新規カラムの追加
ALTER TABLE instant_photo_requests 
  ADD COLUMN IF NOT EXISTS pending_photographer_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS photographer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guest_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photographer_timeout_at TIMESTAMPTZ;

-- ステータス制約の更新（photographer_accepted, guest_approvedを追加）
ALTER TABLE instant_photo_requests 
  DROP CONSTRAINT IF EXISTS instant_photo_requests_status_check;

ALTER TABLE instant_photo_requests 
  ADD CONSTRAINT instant_photo_requests_status_check 
  CHECK (status IN (
    'pending', 
    'photographer_accepted',  -- 新規追加：フォトグラファーが受諾
    'guest_approved',          -- 新規追加：ゲストが承認
    'matched', 
    'in_progress', 
    'completed', 
    'delivered', 
    'cancelled', 
    'expired'
  ));

-- =============================================================================
-- 2. インデックスの追加（パフォーマンス最適化）
-- =============================================================================

-- pending_photographer_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_instant_photo_requests_pending_photographer_id 
  ON instant_photo_requests(pending_photographer_id) 
  WHERE pending_photographer_id IS NOT NULL;

-- photographer_timeout_atでの検索を高速化（タイムアウト処理用）
CREATE INDEX IF NOT EXISTS idx_instant_photo_requests_timeout 
  ON instant_photo_requests(photographer_timeout_at) 
  WHERE status = 'photographer_accepted' AND photographer_timeout_at IS NOT NULL;

-- =============================================================================
-- 3. コメント追加
-- =============================================================================

COMMENT ON COLUMN instant_photo_requests.pending_photographer_id IS '受諾したフォトグラファーのID（ゲスト承認待ち）';
COMMENT ON COLUMN instant_photo_requests.photographer_accepted_at IS 'フォトグラファーが受諾した時刻';
COMMENT ON COLUMN instant_photo_requests.guest_approved_at IS 'ゲストが承認した時刻';
COMMENT ON COLUMN instant_photo_requests.photographer_timeout_at IS 'フォトグラファー受諾のタイムアウト時刻（10分後）';

