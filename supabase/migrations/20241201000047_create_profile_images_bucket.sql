-- Migration: 047_create_user_storage_bucket
-- Description: ユーザー別ストレージバケット（プロフィール画像・ポートフォリオ対応）
-- Date: 2024-12-01

-- ユーザーストレージバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-storage',
  'user-storage',
  true,
  10485760, -- 10MB（ポートフォリオ対応のため増量）
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 公開読み取りポリシー
CREATE POLICY "Public read access for user storage" ON storage.objects
FOR SELECT USING (bucket_id = 'user-storage');

-- ユーザーは自分のストレージのみアップロード可能
-- パス構造: [userId]/profile/, [userId]/portfolio/, [userId]/session-photos/
CREATE POLICY "Users can upload to their own storage" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-storage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ユーザーは自分のストレージのみ更新可能
CREATE POLICY "Users can update their own storage" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-storage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'user-storage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ユーザーは自分のストレージのみ削除可能
CREATE POLICY "Users can delete their own storage" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-storage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
); 