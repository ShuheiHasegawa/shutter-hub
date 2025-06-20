-- 既存の問題のあるポリシーを削除
DROP POLICY IF EXISTS "Users can insert conversation members for groups" ON conversation_members;
DROP POLICY IF EXISTS "Users can update conversation members for groups they created" ON conversation_members;
DROP POLICY IF EXISTS "Users can delete conversation members for groups they created" ON conversation_members;

-- シンプルで再帰しないINSERTポリシーを作成
CREATE POLICY "conversation_members_insert_policy" ON conversation_members FOR INSERT WITH CHECK (
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
  auth.uid() = user_id
);

-- DELETEポリシー（シンプル）
CREATE POLICY "conversation_members_delete_policy" ON conversation_members FOR DELETE USING (
  auth.uid() = user_id
);
