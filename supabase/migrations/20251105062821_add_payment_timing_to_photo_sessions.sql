-- Migration: 20251105062821_add_payment_timing_to_photo_sessions
-- Description: 撮影会テーブルに支払い方法（payment_timing）カラムを追加
-- Date: 2025-11-05

-- =============================================================================
-- 1. payment_timingカラムの追加
-- =============================================================================

-- payment_timingカラムを追加（デフォルト: 'prepaid'）
ALTER TABLE photo_sessions 
ADD COLUMN IF NOT EXISTS payment_timing TEXT DEFAULT 'prepaid';

-- 既存データにデフォルト値を設定
UPDATE photo_sessions 
SET payment_timing = 'prepaid' 
WHERE payment_timing IS NULL;

-- NOT NULL制約を追加
ALTER TABLE photo_sessions 
ALTER COLUMN payment_timing SET NOT NULL;

-- CHECK制約を追加
ALTER TABLE photo_sessions 
ADD CONSTRAINT photo_sessions_payment_timing_check 
CHECK (payment_timing IN ('prepaid', 'cash_on_site'));

-- インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_photo_sessions_payment_timing 
ON photo_sessions(payment_timing);

-- コメント追加
COMMENT ON COLUMN photo_sessions.payment_timing IS '支払いタイミング: prepaid(事前決済/Stripe), cash_on_site(現地払い)';


