-- Migration: 20251111092019_update_studio_edit_history_rls
-- Description: スタジオ編集履歴テーブルのRLSポリシーを更新（Wikipedia風編集システム対応）
-- Date: 2025-11-11

-- ========================================================================
-- studio_edit_historyテーブルのRLSポリシー更新
-- ========================================================================

-- 既存のINSERTポリシーを削除
DROP POLICY IF EXISTS "Users can insert edit history" ON studio_edit_history;

-- 認証済みユーザーなら誰でも編集履歴を挿入可能（Wikipedia風編集システム）
CREATE POLICY "Authenticated users can insert edit history" ON studio_edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================================================
-- コメント
-- ========================================================================

COMMENT ON POLICY "Authenticated users can insert edit history" ON studio_edit_history IS 
'認証済みユーザーなら誰でもスタジオ編集履歴を挿入可能（Wikipedia風編集システム）';



