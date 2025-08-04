-- conversations.last_message_idにmessagesテーブルへの外部キー制約を追加

-- last_message_idにmessagesテーブルへの外部キー制約を追加
ALTER TABLE conversations 
ADD CONSTRAINT conversations_last_message_id_fkey 
FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- PostgRESTスキーマキャッシュを手動でリロード
NOTIFY pgrst, 'reload schema'; 