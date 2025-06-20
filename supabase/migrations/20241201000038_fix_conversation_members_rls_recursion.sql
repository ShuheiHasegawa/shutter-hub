-- 無限再帰を起こしていたRLSポリシーを修正

-- 既存の問題のあるSELECTポリシーを削除
DROP POLICY IF EXISTS "Users can view conversation members" ON conversation_members;

-- 無限再帰を起こさない新しいSELECTポリシーを作成
CREATE POLICY "conversation_members_select_policy" ON conversation_members
FOR SELECT
USING (
  -- 自分自身のメンバーシップレコード
  auth.uid() = user_id 
  OR 
  -- グループの作成者
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND c.created_by = auth.uid()
  )
  OR
  -- 直接会話の参加者
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND c.is_group = false
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

-- グループ作成用のストアドプロシージャを作成
CREATE OR REPLACE FUNCTION create_group_with_members(
  group_name TEXT,
  creator_id UUID,
  member_ids UUID[],
  group_description TEXT DEFAULT NULL,
  group_image_url TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id UUID;
  member_id UUID;
BEGIN
  -- グループ会話を作成
  INSERT INTO conversations (
    is_group,
    group_name,
    group_description,
    group_image_url,
    created_by
  ) VALUES (
    TRUE,
    group_name,
    group_description,
    group_image_url,
    creator_id
  ) RETURNING id INTO conversation_id;

  -- 作成者を管理者として追加
  INSERT INTO conversation_members (
    conversation_id,
    user_id,
    role,
    is_active
  ) VALUES (
    conversation_id,
    creator_id,
    'admin',
    TRUE
  );

  -- 他のメンバーを追加
  FOREACH member_id IN ARRAY member_ids
  LOOP
    -- 作成者の重複を避ける
    IF member_id != creator_id THEN
      INSERT INTO conversation_members (
        conversation_id,
        user_id,
        role,
        is_active
      ) VALUES (
        conversation_id,
        member_id,
        'member',
        TRUE
      );
    END IF;
  END LOOP;

  RETURN conversation_id;
END;
$$; 