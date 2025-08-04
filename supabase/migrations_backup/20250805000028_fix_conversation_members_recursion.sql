-- Migration: 037_fix_conversation_members_recursion
-- Description: conversation_membersテーブルの無限再帰エラーを修正
-- Created: 2024-12-01

-- 既存の問題のあるポリシーを削除
DROP POLICY IF EXISTS "Users can insert conversation members for groups" ON conversation_members;
DROP POLICY IF EXISTS "Users can update conversation members for groups they created" ON conversation_members;
DROP POLICY IF EXISTS "Users can delete conversation members for groups they created" ON conversation_members;

-- シンプルで再帰しないINSERTポリシーを作成
CREATE POLICY "conversation_members_insert_policy" ON conversation_members FOR INSERT WITH CHECK (
  -- 自分自身を追加する場合、または作成者が他のメンバーを追加する場合
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
    AND c.is_group = TRUE
  )
);

-- UPDATEポリシー（シンプル）
CREATE POLICY "conversation_members_update_policy" ON conversation_members FOR UPDATE USING (
  auth.uid() = user_id  -- 自分の情報のみ更新可能
);

-- DELETEポリシー（シンプル）
CREATE POLICY "conversation_members_delete_policy" ON conversation_members FOR DELETE USING (
  auth.uid() = user_id  -- 自分のメンバーシップのみ削除可能
); 