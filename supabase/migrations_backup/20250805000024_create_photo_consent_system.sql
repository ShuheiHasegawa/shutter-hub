-- 写真公開合意システム
-- ストレージ最適化: 短期間のみ画像保存、長期はファイル名・ハッシュで管理

-- 写真公開合意リクエストテーブル
CREATE TABLE photo_consent_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id UUID REFERENCES auth.users(id) NOT NULL,
  model_id UUID REFERENCES auth.users(id) NOT NULL,
  photo_session_id UUID REFERENCES photo_sessions(id),
  
  -- 写真情報（ストレージ最適化）
  photo_url TEXT NOT NULL, -- 短期保存用URL（7日間）
  photo_filename TEXT NOT NULL, -- 永続保存用ファイル名
  photo_hash TEXT NOT NULL UNIQUE, -- 重複防止・証跡用
  photo_metadata JSONB, -- 撮影メタデータ
  
  -- 合意状態
  consent_status TEXT DEFAULT 'pending' CHECK (consent_status IN ('pending', 'approved', 'rejected', 'requires_discussion')),
  usage_scope TEXT[] DEFAULT '{}', -- web, sns, print, commercial
  usage_notes TEXT, -- 使用用途の詳細説明
  
  -- メッセージ・コメント
  request_message TEXT,
  response_message TEXT,
  
  -- 日時管理
  consent_given_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- 画像の自動削除日時（7日後）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- GDPR対応
  gdpr_consent BOOLEAN DEFAULT FALSE,
  data_retention_agreed BOOLEAN DEFAULT FALSE
);

-- 撮影会モデルタグ付けテーブル
CREATE TABLE photo_session_model_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) NOT NULL,
  model_id UUID REFERENCES auth.users(id) NOT NULL,
  tagged_by UUID REFERENCES auth.users(id) NOT NULL, -- 誰がタグ付けしたか
  
  -- タグ状態管理
  tag_status TEXT DEFAULT 'pending' CHECK (tag_status IN ('pending', 'accepted', 'declined')),
  invitation_message TEXT,
  response_message TEXT,
  
  -- 確認日時
  tagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- 一意制約: 1つの撮影会に同じモデルは1回のみタグ付け可能
  UNIQUE(photo_session_id, model_id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- モデル代表画像管理テーブル
CREATE TABLE model_portfolio_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- 画像情報
  image_url TEXT NOT NULL,
  image_hash TEXT NOT NULL,
  image_filename TEXT NOT NULL,
  
  -- 画像タイプ・設定
  image_type TEXT DEFAULT 'portfolio' CHECK (image_type IN ('profile', 'portfolio', 'representative')),
  is_primary BOOLEAN DEFAULT FALSE, -- プライマリー代表画像
  display_order INTEGER DEFAULT 0,
  
  -- メタデータ
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- 公開設定
  is_public BOOLEAN DEFAULT TRUE,
  is_available_for_sessions BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 合意証跡・監査ログテーブル（GDPR・法的要件対応）
CREATE TABLE photo_consent_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consent_request_id UUID REFERENCES photo_consent_requests(id) NOT NULL,
  
  -- 変更情報
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'approved', 'rejected', 'modified', 'revoked', 'auto_expired')),
  previous_status TEXT,
  new_status TEXT,
  change_reason TEXT,
  
  -- 変更者・環境情報（法的証跡）
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- 法的根拠・GDPR対応
  legal_basis TEXT, -- legitimate_interest, consent, contract, etc.
  gdpr_article TEXT, -- 該当するGDPR条項
  
  -- タイムスタンプ（改ざん防止）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  audit_hash TEXT -- 監査ログのハッシュ値
);

-- 合意リマインダー管理テーブル
CREATE TABLE photo_consent_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consent_request_id UUID REFERENCES photo_consent_requests(id) NOT NULL,
  
  -- リマインダー設定
  reminder_type TEXT DEFAULT 'email' CHECK (reminder_type IN ('email', 'push', 'sms')),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- 送信結果
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  
  -- 次回送信予定
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_photo_consent_photographer ON photo_consent_requests(photographer_id);
CREATE INDEX idx_photo_consent_model ON photo_consent_requests(model_id);
CREATE INDEX idx_photo_consent_session ON photo_consent_requests(photo_session_id);
CREATE INDEX idx_photo_consent_status ON photo_consent_requests(consent_status);
CREATE INDEX idx_photo_consent_expires ON photo_consent_requests(expires_at);

CREATE INDEX idx_model_tags_session ON photo_session_model_tags(photo_session_id);
CREATE INDEX idx_model_tags_model ON photo_session_model_tags(model_id);
CREATE INDEX idx_model_tags_status ON photo_session_model_tags(tag_status);

CREATE INDEX idx_portfolio_model ON model_portfolio_images(model_id, is_primary);
CREATE INDEX idx_portfolio_public ON model_portfolio_images(is_public, is_available_for_sessions);

CREATE INDEX idx_audit_log_consent ON photo_consent_audit_log(consent_request_id);
CREATE INDEX idx_audit_log_date ON photo_consent_audit_log(created_at);

CREATE INDEX idx_reminders_request ON photo_consent_reminders(consent_request_id);
CREATE INDEX idx_reminders_next ON photo_consent_reminders(next_reminder_at);

-- RLS ポリシー設定

-- 写真公開合意リクエスト: 関係者のみアクセス可能
ALTER TABLE photo_consent_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consent requests they are involved in" ON photo_consent_requests
  FOR SELECT USING (
    auth.uid() = photographer_id OR 
    auth.uid() = model_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Photographers can create consent requests" ON photo_consent_requests
  FOR INSERT WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Models can update consent status" ON photo_consent_requests
  FOR UPDATE USING (auth.uid() = model_id)
  WITH CHECK (auth.uid() = model_id);

-- モデルタグ付け: 関係者のみアクセス可能
ALTER TABLE photo_session_model_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags they are involved in" ON photo_session_model_tags
  FOR SELECT USING (
    auth.uid() = model_id OR 
    auth.uid() = tagged_by OR
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = photo_session_id AND ps.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can create model tags" ON photo_session_model_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = photo_session_id AND ps.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Models can update their tag responses" ON photo_session_model_tags
  FOR UPDATE USING (auth.uid() = model_id)
  WITH CHECK (auth.uid() = model_id);

-- モデル代表画像: 所有者のみ管理、公開画像は全員閲覧可能
ALTER TABLE model_portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public portfolio images" ON model_portfolio_images
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own portfolio images" ON model_portfolio_images
  FOR SELECT USING (auth.uid() = model_id);

CREATE POLICY "Users can manage their own portfolio images" ON model_portfolio_images
  FOR ALL USING (auth.uid() = model_id);

-- 監査ログ: 管理者と関係者のみ閲覧可能
ALTER TABLE photo_consent_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON photo_consent_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view audit logs for their consents" ON photo_consent_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photo_consent_requests pcr
      WHERE pcr.id = consent_request_id 
      AND (pcr.photographer_id = auth.uid() OR pcr.model_id = auth.uid())
    )
  );

-- リマインダー: システムのみ管理
ALTER TABLE photo_consent_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can manage reminders" ON photo_consent_reminders
  FOR ALL USING (false); -- システム関数のみアクセス可能

-- ストレージ最適化用関数
CREATE OR REPLACE FUNCTION cleanup_expired_photos()
RETURNS void AS $$
BEGIN
  -- 7日間経過した写真URLを削除（ファイル名・ハッシュは保持）
  UPDATE photo_consent_requests 
  SET photo_url = NULL
  WHERE expires_at < NOW() AND photo_url IS NOT NULL;
  
  -- 処理ログを挿入
  INSERT INTO photo_consent_audit_log (
    consent_request_id, action_type, changed_by, change_reason, legal_basis
  )
  SELECT 
    id, 'auto_expired', 
    '00000000-0000-0000-0000-000000000000'::uuid, -- システムユーザー
    'Automatic photo cleanup after 7 days',
    'data_retention_policy'
  FROM photo_consent_requests
  WHERE expires_at < NOW() AND photo_url IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- リマインダー送信管理関数
CREATE OR REPLACE FUNCTION schedule_consent_reminders()
RETURNS void AS $$
BEGIN
  -- 3日以上経過した未回答の合意リクエストにリマインダーを設定
  INSERT INTO photo_consent_reminders (consent_request_id, next_reminder_at)
  SELECT 
    pcr.id,
    NOW() + INTERVAL '1 day' -- 翌日にリマインダー送信
  FROM photo_consent_requests pcr
  WHERE pcr.consent_status = 'pending'
    AND pcr.created_at < NOW() - INTERVAL '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM photo_consent_reminders pcrem
      WHERE pcrem.consent_request_id = pcr.id
      AND pcrem.sent_at > NOW() - INTERVAL '2 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 監査ログ自動生成トリガー
CREATE OR REPLACE FUNCTION photo_consent_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- 変更時に監査ログを自動生成
  INSERT INTO photo_consent_audit_log (
    consent_request_id,
    action_type,
    previous_status,
    new_status,
    changed_by,
    ip_address,
    user_agent,
    legal_basis
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'modified'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    OLD.consent_status,
    NEW.consent_status,
    auth.uid(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    'user_consent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
CREATE TRIGGER photo_consent_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON photo_consent_requests
  FOR EACH ROW EXECUTE FUNCTION photo_consent_audit_trigger();

-- cron job設定（定期実行）
-- 注意: この部分は Supabase の pg_cron 拡張機能が必要
-- SELECT cron.schedule('cleanup-expired-photos', '0 2 * * *', 'SELECT cleanup_expired_photos();');
-- SELECT cron.schedule('schedule-reminders', '0 9 * * *', 'SELECT schedule_consent_reminders();'); 