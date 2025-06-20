-- Migration: 036_fix_conversation_members_rls
-- Description: conversation_membersテーブルのINSERTポリシーを修正
-- Created: 2024-12-01

-- conversation_membersテーブルのINSERTポリシーを追加
CREATE POLICY "Users can insert conversation members for groups" ON conversation_members FOR INSERT WITH CHECK (
  -- グループ作成者または参加者のみ追加可能
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
    AND c.is_group = TRUE
  )
  OR
  -- 自分自身をメンバーとして追加する場合
  auth.uid() = user_id
);

-- UPDATEとDELETEポリシーも追加
CREATE POLICY "Users can update conversation members for groups they created" ON conversation_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
    AND c.is_group = TRUE
  )
  OR
  -- 自分自身の情報は更新可能
  auth.uid() = user_id
);

CREATE POLICY "Users can delete conversation members for groups they created" ON conversation_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
    AND c.is_group = TRUE
  )
  OR
  -- 自分自身は退出可能
  auth.uid() = user_id
); 