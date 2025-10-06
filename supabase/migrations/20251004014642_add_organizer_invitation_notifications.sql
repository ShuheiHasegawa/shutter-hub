-- 運営者招待通知タイプの追加
-- 通知タイプの更新

-- 通知タイプの定義を更新
DO $$ BEGIN
  -- 既存のenumに新しい値を追加
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'organizer_invitation_received';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'organizer_invitation_accepted';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'organizer_invitation_rejected';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'organizer_invitation_expired';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 通知カテゴリの定義を更新
DO $$ BEGIN
  -- 既存のenumに新しい値を追加
  ALTER TYPE notification_category ADD VALUE IF NOT EXISTS 'organizer';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 通知テンプレートの追加
INSERT INTO notification_templates (
  type,
  language,
  title_template,
  message_template,
  available_variables
) VALUES 
  (
    'organizer_invitation_received',
    'ja',
    '運営者からの招待が届きました',
    '{organizer_name}さんから所属モデルの招待が届きました。',
    '["organizer_name", "invitation_message", "expires_at"]'
  ),
  (
    'organizer_invitation_accepted',
    'ja',
    'モデル招待が受諾されました',
    '{model_name}さんが所属モデルの招待を受諾しました。',
    '["model_name", "invitation_id"]'
  ),
  (
    'organizer_invitation_rejected',
    'ja',
    'モデル招待が拒否されました',
    '{model_name}さんが所属モデルの招待を拒否しました。',
    '["model_name", "invitation_id", "rejection_reason"]'
  ),
  (
    'organizer_invitation_expired',
    'ja',
    'モデル招待が期限切れになりました',
    '所属モデルの招待が期限切れになりました。',
    '["invitation_id"]'
  )
ON CONFLICT (type, language) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  available_variables = EXCLUDED.available_variables,
  updated_at = NOW();
