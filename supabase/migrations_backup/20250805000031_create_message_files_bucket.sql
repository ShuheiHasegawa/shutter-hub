-- Migration: 042_create_message_files_bucket
-- Description: メッセージファイル専用のStorageバケットとポリシーを作成
-- Date: 2024-12-01

-- メッセージファイル用ストレージバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-files',
  'message-files',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 公開読み取りポリシー
CREATE POLICY "Public read access for message files" ON storage.objects
FOR SELECT USING (bucket_id = 'message-files');

-- 認証済みユーザーのアップロードポリシー
CREATE POLICY "Authenticated users can upload message files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'message-files' 
  AND auth.role() = 'authenticated'
);

-- 所有者のみ削除可能ポリシー
CREATE POLICY "Users can delete their own message files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'message-files' 
  AND auth.uid() = owner
);

-- 所有者のみ更新可能ポリシー
CREATE POLICY "Users can update their own message files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'message-files' 
  AND auth.uid() = owner
) WITH CHECK (
  bucket_id = 'message-files' 
  AND auth.uid() = owner
); 