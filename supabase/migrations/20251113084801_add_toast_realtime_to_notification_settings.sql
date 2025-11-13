-- Migration: 20251113084801_add_toast_realtime_to_notification_settings
-- Description: notification_settingsテーブルにtoast_enabledとrealtime_enabledカラムを追加
-- Date: 2025-11-13

-- トースト通知設定を追加
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS toast_enabled BOOLEAN DEFAULT true;

-- リアルタイム通知設定を追加
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS realtime_enabled BOOLEAN DEFAULT true;

-- 既存レコードにデフォルト値を設定
UPDATE notification_settings
SET 
  toast_enabled = COALESCE(toast_enabled, true),
  realtime_enabled = COALESCE(realtime_enabled, true)
WHERE toast_enabled IS NULL OR realtime_enabled IS NULL;

-- コメントを追加
COMMENT ON COLUMN notification_settings.toast_enabled IS 'トースト通知の有効/無効';
COMMENT ON COLUMN notification_settings.realtime_enabled IS 'リアルタイム通知（Supabase Realtime）の有効/無効';

