-- Migration: 004_create_storage_bucket
-- Description: 撮影会画像用のStorageバケットとポリシーを作成
-- Date: 2024-12-01

-- ストレージバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photo-sessions',
  'photo-sessions',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 公開読み取りポリシー
CREATE POLICY "Public read access for photo session images" ON storage.objects
FOR SELECT USING (bucket_id = 'photo-sessions');

-- 認証済みユーザーのアップロードポリシー
CREATE POLICY "Authenticated users can upload photo session images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'photo-sessions' 
  AND auth.role() = 'authenticated'
);

-- 所有者のみ削除可能ポリシー
CREATE POLICY "Users can delete their own photo session images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'photo-sessions' 
  AND auth.uid() = owner
);

-- 所有者のみ更新可能ポリシー
CREATE POLICY "Users can update their own photo session images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'photo-sessions' 
  AND auth.uid() = owner
) WITH CHECK (
  bucket_id = 'photo-sessions' 
  AND auth.uid() = owner
); 