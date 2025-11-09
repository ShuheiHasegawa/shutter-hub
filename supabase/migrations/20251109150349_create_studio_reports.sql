-- Migration: 20251109150349_create_studio_reports
-- Description: スタジオ報告システム - Wikipedia風編集システムの報告機能
-- Created: 2025-11-09

-- ========================================================================
-- スタジオ報告テーブル
-- ========================================================================

CREATE TABLE studio_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_reason TEXT NOT NULL CHECK (
    report_reason IN ('spam', 'inappropriate', 'false_info', 'other')
  ),
  report_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'resolved', 'dismissed')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- インデックス
CREATE INDEX idx_studio_reports_studio_id ON studio_reports(studio_id);
CREATE INDEX idx_studio_reports_reporter_id ON studio_reports(reporter_id);
CREATE INDEX idx_studio_reports_status ON studio_reports(status);
CREATE INDEX idx_studio_reports_created_at ON studio_reports(created_at DESC);

-- 重複報告防止（同じユーザーが同じスタジオに複数回報告できない）
CREATE UNIQUE INDEX idx_studio_reports_unique_reporter_studio 
ON studio_reports(reporter_id, studio_id) 
WHERE status = 'pending';

-- ========================================================================
-- RLSポリシー
-- ========================================================================

-- 誰でも報告可能
ALTER TABLE studio_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_reports_insert_policy ON studio_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 自分の報告のみ閲覧可能
CREATE POLICY studio_reports_select_policy ON studio_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- 運営者・管理者は全報告を閲覧可能
CREATE POLICY studio_reports_select_admin_policy ON studio_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'organizer')
    )
  );

-- 運営者・管理者は報告を解決可能
CREATE POLICY studio_reports_update_admin_policy ON studio_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'organizer')
    )
  );

-- ========================================================================
-- コメント
-- ========================================================================

COMMENT ON TABLE studio_reports IS 'スタジオ情報の報告テーブル - Wikipedia風編集システムの報告機能';
COMMENT ON COLUMN studio_reports.report_reason IS '報告理由: spam(スパム), inappropriate(不適切な内容), false_info(誤情報), other(その他)';
COMMENT ON COLUMN studio_reports.status IS '報告ステータス: pending(未解決), resolved(解決済み), dismissed(却下)';

