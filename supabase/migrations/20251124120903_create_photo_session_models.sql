-- Migration: 20251124120903_create_photo_session_models
-- Description: 撮影会に紐づくモデル情報を保存するテーブルを作成
-- Date: 2025-11-24

-- ========================================================================
-- 撮影会モデルテーブル
-- ========================================================================

CREATE TABLE photo_session_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  fee_amount INTEGER NOT NULL CHECK (fee_amount >= 0), -- モデルごとの個別料金
  display_order INTEGER DEFAULT 0, -- 表示順序
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 同じ撮影会で同じモデルは1回のみ
  UNIQUE(photo_session_id, model_id)
);

-- インデックス作成
CREATE INDEX idx_photo_session_models_photo_session_id ON photo_session_models(photo_session_id);
CREATE INDEX idx_photo_session_models_model_id ON photo_session_models(model_id);

-- RLS有効化
ALTER TABLE photo_session_models ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 誰でも閲覧可能
CREATE POLICY "Anyone can view photo session models" ON photo_session_models
  FOR SELECT USING (true);

-- RLSポリシー: 運営者のみ作成・更新・削除可能
CREATE POLICY "Organizers can manage photo session models" ON photo_session_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps
      WHERE ps.id = photo_session_models.photo_session_id
      AND ps.organizer_id = auth.uid()
    )
  );

-- コメント追加
COMMENT ON TABLE photo_session_models IS '撮影会に紐づくモデル情報';
COMMENT ON COLUMN photo_session_models.photo_session_id IS '撮影会ID';
COMMENT ON COLUMN photo_session_models.model_id IS 'モデルID';
COMMENT ON COLUMN photo_session_models.fee_amount IS 'モデルごとの個別料金（円）';
COMMENT ON COLUMN photo_session_models.display_order IS '表示順序（低い値ほど前に表示）';



