-- 運営所属モデル管理システム v2
-- テーブル未存在問題解決版

-- 運営からモデルへの招待テーブル
CREATE TABLE IF NOT EXISTS organizer_model_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  invitation_message text,
  rejection_reason text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 同じ組み合わせの重複を防ぐ
  UNIQUE(organizer_id, model_id)
);

-- 承認済み運営所属モデル関係テーブル
CREATE TABLE IF NOT EXISTS organizer_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  contract_start_date date,
  contract_end_date date,
  notes text,
  
  -- 統計データ用カラム
  total_sessions_participated integer NOT NULL DEFAULT 0,
  total_revenue_generated numeric(10,2) NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 同じ組み合わせの重複を防ぐ
  UNIQUE(organizer_id, model_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_organizer_id ON organizer_model_invitations(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_model_id ON organizer_model_invitations(model_id);
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_status ON organizer_model_invitations(status);
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_expires_at ON organizer_model_invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_organizer_models_organizer_id ON organizer_models(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_models_model_id ON organizer_models(model_id);
CREATE INDEX IF NOT EXISTS idx_organizer_models_status ON organizer_models(status);
CREATE INDEX IF NOT EXISTS idx_organizer_models_joined_at ON organizer_models(joined_at);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの存在確認と作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizer_model_invitations_updated_at') THEN
        CREATE TRIGGER update_organizer_model_invitations_updated_at 
            BEFORE UPDATE ON organizer_model_invitations 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizer_models_updated_at') THEN
        CREATE TRIGGER update_organizer_models_updated_at 
            BEFORE UPDATE ON organizer_models 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- RLS ポリシー設定
ALTER TABLE organizer_model_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_models ENABLE ROW LEVEL SECURITY;

-- ポリシーの存在確認と作成
DO $$
BEGIN
    -- 招待テーブルのRLSポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizer_model_invitations' AND policyname = 'organizer_model_invitations_organizer_policy') THEN
        CREATE POLICY "organizer_model_invitations_organizer_policy" ON organizer_model_invitations
            FOR ALL USING (
                auth.uid() = organizer_id AND 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'organizer'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizer_model_invitations' AND policyname = 'organizer_model_invitations_model_policy') THEN
        CREATE POLICY "organizer_model_invitations_model_policy" ON organizer_model_invitations
            FOR ALL USING (
                auth.uid() = model_id AND 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'model'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizer_model_invitations' AND policyname = 'organizer_model_invitations_admin_policy') THEN
        CREATE POLICY "organizer_model_invitations_admin_policy" ON organizer_model_invitations
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'admin'
                )
            );
    END IF;

    -- 所属関係テーブルのRLSポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizer_models' AND policyname = 'organizer_models_organizer_policy') THEN
        CREATE POLICY "organizer_models_organizer_policy" ON organizer_models
            FOR ALL USING (
                auth.uid() = organizer_id AND 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'organizer'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizer_models' AND policyname = 'organizer_models_model_view_policy') THEN
        CREATE POLICY "organizer_models_model_view_policy" ON organizer_models
            FOR SELECT USING (
                auth.uid() = model_id AND 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'model'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizer_models' AND policyname = 'organizer_models_public_view_policy') THEN
        CREATE POLICY "organizer_models_public_view_policy" ON organizer_models
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = model_id 
                    AND is_public = true
                    AND user_type = 'model'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizer_models' AND policyname = 'organizer_models_admin_policy') THEN
        CREATE POLICY "organizer_models_admin_policy" ON organizer_models
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'admin'
                )
            );
    END IF;
END
$$;

-- 期限切れ招待の自動削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE organizer_model_invitations 
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending' 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 招待承認時に所属関係を自動作成する関数
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- 招待が承認された場合、所属関係を作成
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        INSERT INTO organizer_models (
            organizer_id,
            model_id,
            joined_at,
            last_activity_at
        ) VALUES (
            NEW.organizer_id,
            NEW.model_id,
            NEW.responded_at,
            NEW.responded_at
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 招待承認時のトリガー（存在確認付き）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_invitation_acceptance') THEN
        CREATE TRIGGER trigger_invitation_acceptance
            AFTER UPDATE ON organizer_model_invitations
            FOR EACH ROW
            WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
            EXECUTE FUNCTION handle_invitation_acceptance();
    END IF;
END
$$;

-- 統計データ更新関数（撮影会参加時に呼び出し用）
CREATE OR REPLACE FUNCTION update_model_statistics(
    p_organizer_id uuid,
    p_model_id uuid,
    p_session_revenue numeric DEFAULT 0
)
RETURNS void AS $$
BEGIN
    UPDATE organizer_models 
    SET 
        total_sessions_participated = total_sessions_participated + 1,
        total_revenue_generated = total_revenue_generated + p_session_revenue,
        last_activity_at = now(),
        updated_at = now()
    WHERE organizer_id = p_organizer_id 
    AND model_id = p_model_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql; 