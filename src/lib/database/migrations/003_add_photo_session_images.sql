-- Migration: 003_add_photo_session_images
-- Description: 撮影会テーブルに画像URL配列フィールドを追加
-- Date: 2024-12-01

-- 画像URL配列フィールドを追加
-- ALTER TABLE photo_sessions ADD COLUMN image_urls TEXT[] DEFAULT '{}';

-- インデックスを追加（検索性能向上）
-- CREATE INDEX idx_photo_sessions_image_urls ON photo_sessions USING GIN (image_urls);

-- コメント追加
-- COMMENT ON COLUMN photo_sessions.image_urls IS '撮影会の画像URL配列（最初の要素がメイン画像）';

-- Note: このマイグレーションはSupabaseダッシュボードで手動実行してください
-- 実行するSQL:
-- ALTER TABLE photo_sessions ADD COLUMN image_urls TEXT[] DEFAULT '{}';
-- CREATE INDEX idx_photo_sessions_image_urls ON photo_sessions USING GIN (image_urls); 