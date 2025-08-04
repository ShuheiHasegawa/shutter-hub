-- 一般的な通知システム
-- NotificationCenterで使用する統合通知テーブル

-- 通知タイプの定義
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    -- 即座撮影関連
    'instant_photo_new_request',
    'instant_photo_match_found',
    'instant_photo_payment_received',
    'instant_photo_booking_completed',
    'instant_photo_booking_started',
    'instant_photo_photos_delivered',
    
    -- 撮影会関連
    'photo_session_booking_confirmed',
    'photo_session_booking_cancelled',
    'photo_session_reminder',
    'photo_session_slot_available',
    'photo_session_review_request',
    'photo_session_document_signed',
    'photo_session_photos_available',
    
    -- フォローシステム関連
    'follow_new_follower',
    'follow_request_received',
    'follow_request_accepted',
    'follow_mutual_follow',
    
    -- メッセージ関連
    'message_new_message',
    'message_group_invite',
    'message_group_message',
    
    -- レビュー関連
    'review_received',
    'review_reminder',
    
    -- 管理者関連
    'admin_user_report',
    'admin_system_alert',
    'admin_content_flagged',
    
    -- システム関連
    'system_maintenance',
    'system_update',
    'system_security_alert',
    
    -- その他
    'general_announcement',
    'payment_success',
    'payment_failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 通知優先度の定義
DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 通知カテゴリの定義
DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'instant_photo',
    'photo_session',
    'social',
    'payment',
    'system',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- メイン通知テーブル
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 通知内容
  type notification_type NOT NULL,
  category notification_category NOT NULL,
  priority notification_priority DEFAULT 'normal',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- 追加データ（JSON形式で関連情報を格納）
  data JSONB DEFAULT '{}',
  
  -- 関連エンティティID（必要に応じて）
  related_entity_type TEXT, -- 'photo_session', 'instant_booking', 'message', 'user' など
  related_entity_id UUID,
  
  -- 通知状態
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- 配信設定
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMP WITH TIME ZONE,
  in_app_sent BOOLEAN DEFAULT TRUE,
  
  -- アクション関連
  action_url TEXT, -- 通知をクリックした時の遷移先
  action_label TEXT, -- アクションボタンのラベル
  action_completed BOOLEAN DEFAULT FALSE,
  action_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- タイムスタンプ
  expires_at TIMESTAMP WITH TIME ZONE, -- 通知の有効期限
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知設定テーブル（ユーザーごとの通知設定）
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 通知タイプ別設定（JSON形式）
  email_enabled JSONB DEFAULT '{}', -- 各notification_typeに対するemail通知のon/off
  push_enabled JSONB DEFAULT '{}',  -- 各notification_typeに対するpush通知のon/off
  in_app_enabled JSONB DEFAULT '{}', -- 各notification_typeに対するin-app通知のon/off
  
  -- 一括設定
  email_enabled_global BOOLEAN DEFAULT TRUE,
  push_enabled_global BOOLEAN DEFAULT TRUE,
  in_app_enabled_global BOOLEAN DEFAULT TRUE,
  
  -- Do Not Disturbの設定
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'Asia/Tokyo',
  
  -- 頻度制限
  digest_enabled BOOLEAN DEFAULT FALSE, -- ダイジェスト形式での送信
  digest_frequency TEXT DEFAULT 'daily', -- 'immediate', 'hourly', 'daily', 'weekly'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 通知テンプレートテーブル（将来の多言語化・カスタマイズ用）
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  language TEXT DEFAULT 'ja',
  
  -- テンプレート内容
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  email_subject_template TEXT,
  email_body_template TEXT,
  
  -- 変数定義（どの変数が使用可能かを記録）
  available_variables JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(type, language)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_archived ON notifications(archived);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON notifications(user_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- RLS ポリシー設定
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- 通知テーブルのRLSポリシー
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- システムが通知を作成できるポリシー（service_role使用時）
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update notifications"
  ON notifications FOR UPDATE
  USING (true);

-- 通知設定テーブルのRLSポリシー
CREATE POLICY "Users can manage their own notification settings"
  ON notification_settings FOR ALL
  USING (auth.uid() = user_id);

-- 通知テンプレートテーブルのRLSポリシー（読み取り専用）
CREATE POLICY "Users can view notification templates"
  ON notification_templates FOR SELECT
  USING (true);

-- 管理者のみテンプレート編集可能
CREATE POLICY "Admins can manage notification templates"
  ON notification_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 期限切れ通知の自動削除機能
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  -- 期限切れ通知を削除（30日経過したもの）
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND created_at < NOW() - INTERVAL '30 days';
  
  -- 古い既読通知を削除（90日経過したもの）
  DELETE FROM notifications
  WHERE read = TRUE
    AND read_at < NOW() - INTERVAL '90 days';
    
  -- アーカイブされた通知を削除（180日経過したもの）
  DELETE FROM notifications
  WHERE archived = TRUE
    AND archived_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- 通知統計取得機能
CREATE OR REPLACE FUNCTION get_notification_stats(target_user_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  unread_count BIGINT,
  high_priority_unread BIGINT,
  categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE read = FALSE AND priority IN ('high', 'urgent')) as high_priority_unread,
    JSONB_OBJECT_AGG(
      category,
      JSONB_BUILD_OBJECT(
        'total', category_total,
        'unread', category_unread
      )
    ) as categories
  FROM (
    SELECT 
      category,
      COUNT(*) as category_total,
      COUNT(*) FILTER (WHERE read = FALSE) as category_unread
    FROM notifications
    WHERE user_id = target_user_id
      AND archived = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY category
  ) category_stats;
END;
$$ LANGUAGE plpgsql;

-- デフォルト通知設定の作成関数
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 新規ユーザー作成時にデフォルト設定を作成するトリガー
CREATE TRIGGER create_notification_settings_on_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_settings();

-- 一括通知作成機能（管理者用）
CREATE OR REPLACE FUNCTION create_bulk_notification(
  target_user_ids UUID[],
  notification_type notification_type,
  notification_category notification_category,
  notification_priority notification_priority,
  notification_title TEXT,
  notification_message TEXT,
  notification_data JSONB DEFAULT '{}',
  notification_action_url TEXT DEFAULT NULL,
  notification_action_label TEXT DEFAULT NULL,
  notification_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
  user_id UUID;
BEGIN
  -- 対象ユーザー全員に通知を作成
  FOREACH user_id IN ARRAY target_user_ids
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      category,
      priority,
      title,
      message,
      data,
      action_url,
      action_label,
      expires_at
    )
    VALUES (
      user_id,
      notification_type,
      notification_category,
      notification_priority,
      notification_title,
      notification_message,
      notification_data,
      notification_action_url,
      notification_action_label,
      notification_expires_at
    );
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- デフォルトテンプレートの挿入
INSERT INTO notification_templates (type, language, title_template, message_template, available_variables) VALUES
-- 即座撮影関連
('instant_photo_new_request', 'ja', '新しい撮影リクエスト', '近くで撮影リクエストが発生しました。距離: {{distance}}m', '["distance", "request_type", "budget"]'),
('instant_photo_match_found', 'ja', 'カメラマンが見つかりました！', '撮影リクエストにカメラマンがマッチしました。{{photographer_name}}さんと{{estimated_arrival}}分で到着予定です。', '["photographer_name", "estimated_arrival", "photographer_rating"]'),
('instant_photo_booking_completed', 'ja', '撮影が完了しました', '写真の配信をお待ちください。', '["booking_id", "photo_count"]'),

-- 撮影会関連
('photo_session_booking_confirmed', 'ja', '撮影会の予約が確定しました', '{{session_title}}の予約が確定しました。開催日: {{session_date}}', '["session_title", "session_date", "organizer_name"]'),
('photo_session_reminder', 'ja', '撮影会のリマインダー', '{{session_title}}が{{hours_until}}時間後に開始されます。', '["session_title", "hours_until", "location"]'),

-- フォロー関連
('follow_new_follower', 'ja', '新しいフォロワー', '{{follower_name}}さんがあなたをフォローしました。', '["follower_name", "follower_avatar"]'),
('follow_request_received', 'ja', 'フォローリクエスト', '{{requester_name}}さんからフォローリクエストが届いています。', '["requester_name", "requester_avatar"]'),

-- メッセージ関連
('message_new_message', 'ja', '新しいメッセージ', '{{sender_name}}さんからメッセージが届きました。', '["sender_name", "message_preview", "conversation_id"]'),

-- システム関連
('system_maintenance', 'ja', 'システムメンテナンスのお知らせ', 'システムメンテナンスを実施します。期間: {{maintenance_period}}', '["maintenance_period", "affected_features"]')

ON CONFLICT (type, language) DO NOTHING;

-- 英語テンプレートも追加
INSERT INTO notification_templates (type, language, title_template, message_template, available_variables) VALUES
('instant_photo_new_request', 'en', 'New Photo Request', 'A photo request has been made nearby. Distance: {{distance}}m', '["distance", "request_type", "budget"]'),
('instant_photo_match_found', 'en', 'Photographer Found!', 'Your photo request has been matched with {{photographer_name}}. Estimated arrival: {{estimated_arrival}} minutes.', '["photographer_name", "estimated_arrival", "photographer_rating"]'),
('photo_session_booking_confirmed', 'en', 'Photo Session Booking Confirmed', 'Your booking for {{session_title}} has been confirmed. Date: {{session_date}}', '["session_title", "session_date", "organizer_name"]'),
('follow_new_follower', 'en', 'New Follower', '{{follower_name}} started following you.', '["follower_name", "follower_avatar"]'),
('message_new_message', 'en', 'New Message', 'You have a new message from {{sender_name}}.', '["sender_name", "message_preview", "conversation_id"]')

ON CONFLICT (type, language) DO NOTHING;