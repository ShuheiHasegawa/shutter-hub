-- Migration: 20250910080010_create_unified_photobook_system
-- Description: 統合フォトブックシステム（クイック・高機能両対応）
-- Date: 2025-01-09

-- =============================================================================
-- 1. フォトブックタイプ列挙型
-- =============================================================================

CREATE TYPE photobook_type AS ENUM ('quick', 'advanced');
CREATE TYPE image_orientation AS ENUM ('portrait', 'landscape', 'square');

-- =============================================================================
-- 2. 統合フォトブックテーブル
-- =============================================================================

CREATE TABLE photobooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 基本情報
  title TEXT NOT NULL,
  description TEXT,
  photobook_type photobook_type NOT NULL DEFAULT 'quick',
  
  -- プラン制限関連
  max_pages INTEGER NOT NULL,
  current_pages INTEGER DEFAULT 0 CHECK (current_pages >= 0),
  
  -- 表示・公開設定
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  
  -- 高機能版用設定（将来拡張）
  theme_id UUID,
  advanced_settings JSONB DEFAULT '{}'::jsonb,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT valid_page_count CHECK (current_pages <= max_pages)
);

-- =============================================================================
-- 3. フォトブック画像テーブル
-- =============================================================================

CREATE TABLE photobook_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photobook_id UUID REFERENCES photobooks(id) ON DELETE CASCADE NOT NULL,
  
  -- 画像基本情報
  image_url TEXT NOT NULL,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  
  -- ファイルメタデータ
  original_filename TEXT,
  file_size_bytes INTEGER CHECK (file_size_bytes > 0),
  image_width INTEGER CHECK (image_width > 0),
  image_height INTEGER CHECK (image_height > 0),
  orientation image_orientation NOT NULL,
  
  -- 高機能版用設定（将来拡張）
  position_x DECIMAL DEFAULT 0,
  position_y DECIMAL DEFAULT 0,
  scale_factor DECIMAL DEFAULT 1 CHECK (scale_factor > 0),
  rotation_angle DECIMAL DEFAULT 0,
  advanced_settings JSONB DEFAULT '{}'::jsonb,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  UNIQUE(photobook_id, page_number)
);

-- =============================================================================
-- 4. インデックス作成
-- =============================================================================

-- フォトブック検索最適化
CREATE INDEX idx_photobooks_user_id ON photobooks(user_id);
CREATE INDEX idx_photobooks_type ON photobooks(photobook_type);
CREATE INDEX idx_photobooks_published ON photobooks(is_published);
CREATE INDEX idx_photobooks_created_at ON photobooks(created_at DESC);

-- 画像検索最適化
CREATE INDEX idx_photobook_images_photobook_id ON photobook_images(photobook_id);
CREATE INDEX idx_photobook_images_page_number ON photobook_images(photobook_id, page_number);

-- =============================================================================
-- 5. RLS (Row Level Security) ポリシー
-- =============================================================================

-- フォトブックテーブルのRLS有効化
ALTER TABLE photobooks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフォトブックをCRUD可能
CREATE POLICY "Users can manage own photobooks" ON photobooks
  FOR ALL USING (auth.uid() = user_id);

-- 公開されたフォトブックは全員が閲覧可能
CREATE POLICY "Anyone can view published photobooks" ON photobooks
  FOR SELECT USING (is_published = TRUE);

-- フォトブック画像テーブルのRLS有効化
ALTER TABLE photobook_images ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフォトブック画像をCRUD可能
CREATE POLICY "Users can manage own photobook images" ON photobook_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = photobook_images.photobook_id
      AND photobooks.user_id = auth.uid()
    )
  );

-- 公開されたフォトブックの画像は全員が閲覧可能
CREATE POLICY "Anyone can view published photobook images" ON photobook_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = photobook_images.photobook_id
      AND photobooks.is_published = TRUE
    )
  );

-- =============================================================================
-- 6. トリガー関数
-- =============================================================================

-- フォトブック更新時のタイムスタンプ自動更新
CREATE OR REPLACE FUNCTION update_photobook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photobooks_updated_at
  BEFORE UPDATE ON photobooks
  FOR EACH ROW
  EXECUTE FUNCTION update_photobook_timestamp();

-- ページ数自動カウント更新
CREATE OR REPLACE FUNCTION update_photobook_page_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photobooks 
    SET current_pages = (
      SELECT COUNT(*) FROM photobook_images 
      WHERE photobook_id = NEW.photobook_id
    )
    WHERE id = NEW.photobook_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photobooks 
    SET current_pages = (
      SELECT COUNT(*) FROM photobook_images 
      WHERE photobook_id = OLD.photobook_id
    )
    WHERE id = OLD.photobook_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_page_count_on_image_insert
  AFTER INSERT ON photobook_images
  FOR EACH ROW
  EXECUTE FUNCTION update_photobook_page_count();

CREATE TRIGGER update_page_count_on_image_delete
  AFTER DELETE ON photobook_images
  FOR EACH ROW
  EXECUTE FUNCTION update_photobook_page_count();

-- =============================================================================
-- 7. コメント追加
-- =============================================================================

COMMENT ON TABLE photobooks IS 'フォトブック（クイック・高機能統合）';
COMMENT ON COLUMN photobooks.photobook_type IS 'フォトブックタイプ: quick(クイック), advanced(高機能)';
COMMENT ON COLUMN photobooks.max_pages IS 'プラン制限による最大ページ数';
COMMENT ON COLUMN photobooks.current_pages IS '現在のページ数（自動計算）';

COMMENT ON TABLE photobook_images IS 'フォトブック画像（1ページ1枚対応）';
COMMENT ON COLUMN photobook_images.page_number IS 'ページ番号（1から開始、連番）';
COMMENT ON COLUMN photobook_images.orientation IS '画像向き: portrait(縦), landscape(横), square(正方形)';
