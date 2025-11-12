-- Migration: 20251112212146_add_show_location_to_user_preferences
-- Description: user_preferencesテーブルにshow_locationカラムを追加
-- Date: 2025-11-12

-- user_preferencesテーブルにshow_locationカラムを追加
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT true;

-- 既存レコードのデフォルト値を設定
UPDATE user_preferences
SET show_location = true
WHERE show_location IS NULL;

-- コメントを追加
COMMENT ON COLUMN user_preferences.show_location IS '位置情報の表示/非表示設定';

