-- Migration: 20250128000000_fix_studio_update_rls_policy
-- Description: セキュリティ監査対応 - studiosテーブルのUPDATEポリシーを修正（作成者のみ更新可能に変更）
-- Created: 2025-01-28

-- ========================================================================
-- studiosテーブルのRLSポリシー修正
-- ========================================================================

-- 既存の過度に寛容な更新ポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can update studios" ON studios;

-- 作成者のみが更新可能なポリシーを作成
CREATE POLICY "Studio creators can update studios" ON studios
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ========================================================================
-- コメント
-- ========================================================================

COMMENT ON POLICY "Studio creators can update studios" ON studios IS 
'スタジオの作成者のみがスタジオ情報を更新可能（セキュリティ監査対応）';
