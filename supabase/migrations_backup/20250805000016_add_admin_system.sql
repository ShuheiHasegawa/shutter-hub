-- Migration: 012_add_admin_system
-- Description: Add role field to profiles and create admin management system
-- Created: 2024-12-XX

-- ユーザーロール列挙型を追加
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');

-- プロフィールテーブルにroleフィールドを追加
ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user';

-- 管理者招待システム用テーブル
CREATE TABLE admin_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理者アクティビティログテーブル
CREATE TABLE admin_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX idx_admin_invitations_expires_at ON admin_invitations(expires_at);
CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

-- 管理者招待機能のためのストアドプロシージャ
CREATE OR REPLACE FUNCTION invite_admin(
  invite_email TEXT,
  invite_role user_role,
  invited_by_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  invitation_token TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_token TEXT;
  expires_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 招待者が管理者権限を持っているかチェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = invited_by_id 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN QUERY SELECT FALSE, '管理者権限が必要です'::TEXT, ''::TEXT;
    RETURN;
  END IF;

  -- 既存の招待があるかチェック
  IF EXISTS (
    SELECT 1 FROM admin_invitations 
    WHERE email = invite_email 
    AND used_at IS NULL 
    AND expires_at > NOW()
  ) THEN
    RETURN QUERY SELECT FALSE, '既に有効な招待が存在します'::TEXT, ''::TEXT;
    RETURN;
  END IF;

  -- 既にユーザーとして登録されているかチェック
  IF EXISTS (SELECT 1 FROM profiles WHERE email = invite_email) THEN
    RETURN QUERY SELECT FALSE, '既に登録済みのユーザーです'::TEXT, ''::TEXT;
    RETURN;
  END IF;

  -- 招待トークンを生成（UUIDを使用）
  generated_token := gen_random_uuid()::TEXT;
  expires_time := NOW() + INTERVAL '7 days';

  -- 招待を作成
  INSERT INTO admin_invitations (
    email, 
    role, 
    invited_by, 
    invitation_token, 
    expires_at
  ) VALUES (
    invite_email, 
    invite_role, 
    invited_by_id, 
    generated_token, 
    expires_time
  );

  -- アクティビティログを記録
  INSERT INTO admin_activity_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    invited_by_id,
    'admin_invitation_sent',
    'admin_invitation',
    generated_token,
    jsonb_build_object(
      'email', invite_email,
      'role', invite_role
    )
  );

  RETURN QUERY SELECT TRUE, '招待を送信しました'::TEXT, generated_token;
END;
$$;

-- 管理者招待受諾のためのストアドプロシージャ
CREATE OR REPLACE FUNCTION accept_admin_invitation(
  invitation_token_param TEXT,
  user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record admin_invitations%ROWTYPE;
BEGIN
  -- 招待を取得
  SELECT * INTO invitation_record 
  FROM admin_invitations 
  WHERE invitation_token = invitation_token_param
  AND used_at IS NULL
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, '無効または期限切れの招待です'::TEXT;
    RETURN;
  END IF;

  -- ユーザーのプロフィールを更新
  UPDATE profiles 
  SET role = invitation_record.role 
  WHERE id = user_id;

  -- 招待を使用済みにマーク
  UPDATE admin_invitations 
  SET used_at = NOW() 
  WHERE invitation_token = invitation_token_param;

  -- アクティビティログを記録
  INSERT INTO admin_activity_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    user_id,
    'admin_invitation_accepted',
    'admin_invitation',
    invitation_token_param,
    jsonb_build_object(
      'email', invitation_record.email,
      'role', invitation_record.role
    )
  );

  RETURN QUERY SELECT TRUE, '管理者権限が付与されました'::TEXT;
END;
$$;

-- システム初期管理者を作成するプロシージャ（初回セットアップ用）
CREATE OR REPLACE FUNCTION create_initial_admin(
  admin_email TEXT,
  admin_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 既に管理者が存在するかチェック
  IF EXISTS (SELECT 1 FROM profiles WHERE role IN ('admin', 'super_admin')) THEN
    RETURN QUERY SELECT FALSE, '既に管理者が存在します'::TEXT;
    RETURN;
  END IF;

  -- 指定されたユーザーを最初の管理者にする
  UPDATE profiles 
  SET role = 'super_admin' 
  WHERE id = admin_user_id AND email = admin_email;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'ユーザーが見つかりません'::TEXT;
    RETURN;
  END IF;

  -- アクティビティログを記録
  INSERT INTO admin_activity_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    admin_user_id,
    'initial_admin_created',
    'profile',
    admin_user_id::TEXT,
    jsonb_build_object(
      'email', admin_email,
      'role', 'super_admin'
    )
  );

  RETURN QUERY SELECT TRUE, '初期管理者が作成されました'::TEXT;
END;
$$;

-- RLS設定
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 管理者招待: 管理者のみ閲覧・作成可能
CREATE POLICY "admin_invitations_admin_policy" ON admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- アクティビティログ: 管理者のみ閲覧可能
CREATE POLICY "admin_activity_logs_admin_policy" ON admin_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 自分のアクティビティログは作成可能
CREATE POLICY "admin_activity_logs_self_insert_policy" ON admin_activity_logs
  FOR INSERT WITH CHECK (admin_id = auth.uid()); 