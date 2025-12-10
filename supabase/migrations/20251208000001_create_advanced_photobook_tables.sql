-- Migration: create_advanced_photobook_tables
-- Description: アドバンスドフォトブック用の追加テーブル
-- Date: 2025-12-08

-- =============================================================================
-- 1. アドバンスドフォトブック ページテーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS advanced_photobook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photobook_id UUID REFERENCES photobooks(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  
  -- レイアウト設定
  background_color TEXT DEFAULT '#ffffff',
  background_image_url TEXT,
  template_id TEXT,
  
  -- ページごとの要素データ (JSONB)
  -- 要素の配列: [{id, type, transform, style, data}, ...]
  elements JSONB DEFAULT '[]'::jsonb,
  
  -- ページ設定
  is_locked BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 同じフォトブック内でページ番号はユニーク
  UNIQUE(photobook_id, page_number)
);

-- =============================================================================
-- 2. アドバンスドフォトブック リソーステーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS advanced_photobook_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photobook_id UUID REFERENCES photobooks(id) ON DELETE CASCADE NOT NULL,
  
  -- リソース情報
  resource_type TEXT NOT NULL CHECK (resource_type IN ('image', 'font')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- メタデータ
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  format TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. インデックス作成
-- =============================================================================

-- ページ検索最適化
CREATE INDEX IF NOT EXISTS idx_advanced_photobook_pages_photobook_id 
  ON advanced_photobook_pages(photobook_id);
CREATE INDEX IF NOT EXISTS idx_advanced_photobook_pages_page_number 
  ON advanced_photobook_pages(photobook_id, page_number);

-- リソース検索最適化
CREATE INDEX IF NOT EXISTS idx_advanced_photobook_resources_photobook_id 
  ON advanced_photobook_resources(photobook_id);
CREATE INDEX IF NOT EXISTS idx_advanced_photobook_resources_type 
  ON advanced_photobook_resources(photobook_id, resource_type);

-- =============================================================================
-- 4. RLS (Row Level Security) ポリシー
-- =============================================================================

-- ページテーブルのRLS有効化
ALTER TABLE advanced_photobook_pages ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフォトブックページをCRUD可能
CREATE POLICY "Users can manage own advanced photobook pages" 
  ON advanced_photobook_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = advanced_photobook_pages.photobook_id
      AND photobooks.user_id = auth.uid()
    )
  );

-- 公開されたフォトブックのページは全員が閲覧可能
CREATE POLICY "Anyone can view published advanced photobook pages" 
  ON advanced_photobook_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = advanced_photobook_pages.photobook_id
      AND photobooks.is_published = TRUE
    )
  );

-- リソーステーブルのRLS有効化
ALTER TABLE advanced_photobook_resources ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフォトブックリソースをCRUD可能
CREATE POLICY "Users can manage own advanced photobook resources" 
  ON advanced_photobook_resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = advanced_photobook_resources.photobook_id
      AND photobooks.user_id = auth.uid()
    )
  );

-- 公開されたフォトブックのリソースは全員が閲覧可能
CREATE POLICY "Anyone can view published advanced photobook resources" 
  ON advanced_photobook_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = advanced_photobook_resources.photobook_id
      AND photobooks.is_published = TRUE
    )
  );

-- =============================================================================
-- 5. トリガー関数
-- =============================================================================

-- ページ更新時のタイムスタンプ自動更新
CREATE OR REPLACE FUNCTION update_advanced_photobook_page_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_advanced_photobook_pages_updated_at
  BEFORE UPDATE ON advanced_photobook_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_photobook_page_timestamp();

-- =============================================================================
-- 6. コメント追加
-- =============================================================================

COMMENT ON TABLE advanced_photobook_pages IS 'アドバンスドフォトブックのページデータ（要素レイアウト含む）';
COMMENT ON COLUMN advanced_photobook_pages.elements IS 'ページ内の要素の配列 (image, text, shape など)';
COMMENT ON COLUMN advanced_photobook_pages.template_id IS 'レイアウトテンプレートID（テンプレート使用時）';

COMMENT ON TABLE advanced_photobook_resources IS 'アドバンスドフォトブックのリソース（アップロード画像・フォント）';
COMMENT ON COLUMN advanced_photobook_resources.resource_type IS 'リソースタイプ: image, font';
