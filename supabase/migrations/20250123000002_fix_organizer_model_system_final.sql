-- 運営所属モデル管理システム最終版
-- 招待・所属関係の完全な実装

-- organizer_model_invitationsテーブルの修正
-- 不足しているカラムを追加
DO $$
BEGIN
    -- rejection_reasonカラムの追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_model_invitations' 
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE organizer_model_invitations 
        ADD COLUMN rejection_reason TEXT;
    END IF;
    
    -- invitation_messageカラムの追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_model_invitations' 
        AND column_name = 'invitation_message'
    ) THEN
        ALTER TABLE organizer_model_invitations 
        ADD COLUMN invitation_message TEXT;
    END IF;
    
    -- responded_atカラムの追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_model_invitations' 
        AND column_name = 'responded_at'
    ) THEN
        ALTER TABLE organizer_model_invitations 
        ADD COLUMN responded_at TIMESTAMPTZ;
    END IF;
END $$;

-- statusのCHECK制約を修正（rejectedを含む）
DO $$
BEGIN
    -- 既存の制約を削除
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organizer_model_invitations_status_check'
    ) THEN
        ALTER TABLE organizer_model_invitations 
        DROP CONSTRAINT organizer_model_invitations_status_check;
    END IF;
    
    -- 新しい制約を追加
    ALTER TABLE organizer_model_invitations 
    ADD CONSTRAINT organizer_model_invitations_status_check 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));
END $$;

-- organizer_modelsテーブルの作成（完全版）
CREATE TABLE IF NOT EXISTS organizer_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    model_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- 日時管理
    joined_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    last_activity_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- 契約管理
    contract_start_date date,
    contract_end_date date,
    notes text,
    
    -- 統計データ
    total_sessions_participated integer NOT NULL DEFAULT 0,
    total_revenue_generated numeric(10,2) NOT NULL DEFAULT 0,
    
    -- 重複防止
    UNIQUE(organizer_id, model_id)
);

-- organizer_modelsテーブルに不足しているカラムを追加（既存テーブル用）
DO $$
BEGIN
    -- statusカラムの追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;
    
    -- created_atカラムの追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
    
    -- その他の必要カラムの追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'joined_at'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'accepted_at'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN accepted_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN last_activity_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'contract_start_date'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN contract_start_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'contract_end_date'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN contract_end_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'total_sessions_participated'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN total_sessions_participated INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'total_revenue_generated'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN total_revenue_generated NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizer_models' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE organizer_models 
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_organizer_id ON organizer_model_invitations(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_model_id ON organizer_model_invitations(model_id);
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_email ON organizer_model_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_status ON organizer_model_invitations(status);
CREATE INDEX IF NOT EXISTS idx_organizer_model_invitations_expires_at ON organizer_model_invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_organizer_models_organizer_id ON organizer_models(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_models_model_id ON organizer_models(model_id);
CREATE INDEX IF NOT EXISTS idx_organizer_models_status ON organizer_models(status);
CREATE INDEX IF NOT EXISTS idx_organizer_models_joined_at ON organizer_models(joined_at);

-- RLS設定
ALTER TABLE organizer_model_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_models ENABLE ROW LEVEL SECURITY;

-- 招待承認時に所属関係を自動作成するトリガー関数
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- 招待が承認された場合、所属関係を作成
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        -- model_idが設定されていることを確認
        IF NEW.model_id IS NOT NULL THEN
            INSERT INTO organizer_models (
                organizer_id,
                model_id,
                joined_at,
                accepted_at,
                last_activity_at
            ) VALUES (
                NEW.organizer_id,
                NEW.model_id,
                COALESCE(NEW.responded_at, NOW()),
                COALESCE(NEW.responded_at, NOW()),
                NOW()
            )
            ON CONFLICT (organizer_id, model_id) DO NOTHING; -- 重複を防ぐ
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_invitation_acceptance ON organizer_model_invitations;
CREATE TRIGGER trigger_invitation_acceptance
    AFTER UPDATE ON organizer_model_invitations
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
    EXECUTE FUNCTION handle_invitation_acceptance();

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガーの作成
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
END $$;

-- 既存の承諾済み招待から所属関係を作成（データ移行）
INSERT INTO organizer_models (
    organizer_id,
    model_id,
    joined_at,
    accepted_at,
    last_activity_at
)
SELECT 
    omi.organizer_id,
    omi.model_id,
    COALESCE(omi.responded_at, omi.created_at),
    COALESCE(omi.responded_at, omi.created_at),
    NOW()
FROM organizer_model_invitations omi
WHERE omi.status = 'accepted'
  AND omi.model_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organizer_models om 
    WHERE om.organizer_id = omi.organizer_id 
    AND om.model_id = omi.model_id
  )
ON CONFLICT (organizer_id, model_id) DO NOTHING;

-- コメント追加
COMMENT ON TABLE organizer_model_invitations IS '運営からモデルへの招待管理テーブル';
COMMENT ON TABLE organizer_models IS '承認済み運営所属モデル関係テーブル';
COMMENT ON FUNCTION handle_invitation_acceptance() IS '招待承認時に所属関係を自動作成する関数';

-- 完了メッセージ
SELECT '運営所属モデル管理システム最終版の構築完了' as result; 