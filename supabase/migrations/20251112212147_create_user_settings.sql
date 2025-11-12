-- Migration: 20251112212147_create_user_settings
-- Description: ユーザー設定テーブル作成（撮影関連設定・セキュリティ設定用）
-- Date: 2025-11-12

-- user_settingsテーブル作成
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- セキュリティ設定
  two_factor_enabled boolean DEFAULT false,
  
  -- 撮影関連設定（ユーザータイプ別）
  instant_photo_available boolean DEFAULT false, -- フォトグラファー
  max_travel_distance integer DEFAULT 10, -- フォトグラファー（km）
  auto_accept_bookings boolean DEFAULT false, -- 運営者
  require_photo_consent boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- RLS (Row Level Security) 設定
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の設定のみ閲覧・更新可能
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- コメント追加
COMMENT ON TABLE user_settings IS 'ユーザー設定テーブル（撮影関連設定・セキュリティ設定）';
COMMENT ON COLUMN user_settings.two_factor_enabled IS '二段階認証の有効/無効';
COMMENT ON COLUMN user_settings.instant_photo_available IS 'フォトグラファーの即座撮影受け付け設定';
COMMENT ON COLUMN user_settings.max_travel_distance IS 'フォトグラファーの最大移動距離（km）';
COMMENT ON COLUMN user_settings.auto_accept_bookings IS '運営者の自動承認設定';
COMMENT ON COLUMN user_settings.require_photo_consent IS '写真公開前の同意必須設定';

