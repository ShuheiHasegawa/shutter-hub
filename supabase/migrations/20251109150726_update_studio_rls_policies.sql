-- Migration: 20251109150726_update_studio_rls_policies
-- Description: スタジオ編集Wikipedia風システム - RLSポリシーを更新（認証済みユーザーなら誰でも編集可能）
-- Created: 2025-11-09

-- ========================================================================
-- studiosテーブルのRLSポリシー更新
-- ========================================================================

-- 既存の更新ポリシーを削除
DROP POLICY IF EXISTS "Studio creators and admins can update" ON studios;

-- 認証済みユーザーなら誰でも更新可能
CREATE POLICY "Authenticated users can update studios" ON studios
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================================================
-- studio_photosテーブルのRLSポリシー更新
-- ========================================================================

-- 既存の管理ポリシーを削除
DROP POLICY IF EXISTS "Photo uploaders can manage their photos" ON studio_photos;

-- 認証済みユーザーなら誰でも操作可能（INSERT, UPDATE, DELETE）
CREATE POLICY "Authenticated users can manage studio photos" ON studio_photos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================================================
-- コメント
-- ========================================================================

COMMENT ON POLICY "Authenticated users can update studios" ON studios IS 
'認証済みユーザーなら誰でもスタジオ情報を更新可能（Wikipedia風編集システム）';

COMMENT ON POLICY "Authenticated users can manage studio photos" ON studio_photos IS 
'認証済みユーザーなら誰でもスタジオ画像を操作可能（Wikipedia風編集システム）';

