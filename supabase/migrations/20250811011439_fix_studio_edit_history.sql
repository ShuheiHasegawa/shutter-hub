-- Migration: 20250811011439_fix_studio_edit_history
-- Description: スタジオ編集履歴テーブルの修正
-- Date: 2025-08-11

-- 1. change_summaryフィールドの追加
ALTER TABLE studio_edit_history 
ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- 2. edited_byフィールドをprofilesテーブルを参照するように変更
-- まず外部キー制約を削除
ALTER TABLE studio_edit_history 
DROP CONSTRAINT IF EXISTS studio_edit_history_edited_by_fkey;

-- 新しい外部キー制約を追加（profilesテーブルを参照）
ALTER TABLE studio_edit_history 
ADD CONSTRAINT studio_edit_history_edited_by_fkey 
FOREIGN KEY (edited_by) REFERENCES profiles(id);

-- 3. RLSポリシーの更新（必要に応じて）
-- 編集履歴の挿入ポリシーを追加
DROP POLICY IF EXISTS "Users can insert edit history" ON studio_edit_history;
CREATE POLICY "Users can insert edit history" ON studio_edit_history
  FOR INSERT WITH CHECK (auth.uid() = edited_by);

-- 4. コメントの更新
COMMENT ON COLUMN studio_edit_history.change_summary IS '変更内容の要約';
COMMENT ON COLUMN studio_edit_history.edited_by IS '編集者のプロフィールID（profiles.id）';
