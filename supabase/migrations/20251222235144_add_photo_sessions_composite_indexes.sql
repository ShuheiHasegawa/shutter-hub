-- Migration: 20251222235144_add_photo_sessions_composite_indexes
-- Description: 撮影会一覧クエリのパフォーマンス改善のための複合インデックス追加
-- Date: 2025-12-22

-- 複合インデックス: 公開済み + 開始時刻（部分インデックス）
-- 最も頻繁に使用されるクエリ条件の組み合わせを最適化
CREATE INDEX IF NOT EXISTS idx_photo_sessions_published_start_time 
ON photo_sessions(is_published, start_time) 
WHERE is_published = true;

-- 複合インデックス: 公開済み + 開始時刻 + 価格（部分インデックス）
-- 価格範囲検索を含むクエリを最適化
CREATE INDEX IF NOT EXISTS idx_photo_sessions_published_start_price 
ON photo_sessions(is_published, start_time, price_per_person) 
WHERE is_published = true;

-- 複合インデックス: 公開済み + 開始時刻 + 場所（部分インデックス）
-- 場所検索を含むクエリを最適化
CREATE INDEX IF NOT EXISTS idx_photo_sessions_published_start_location 
ON photo_sessions(is_published, start_time, location) 
WHERE is_published = true;

-- コメント追加
COMMENT ON INDEX idx_photo_sessions_published_start_time IS 
'公開済み撮影会の開始時刻順ソート用複合インデックス（部分インデックス）';

COMMENT ON INDEX idx_photo_sessions_published_start_price IS 
'公開済み撮影会の価格範囲検索用複合インデックス（部分インデックス）';

COMMENT ON INDEX idx_photo_sessions_published_start_location IS 
'公開済み撮影会の場所検索用複合インデックス（部分インデックス）';

