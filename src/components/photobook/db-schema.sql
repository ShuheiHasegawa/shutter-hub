-- 写真集テーブル
CREATE TABLE photobooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_photo_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  max_pages INTEGER,
  theme_id UUID,
  data JSONB
);

-- 写真テーブル
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  photobook_id UUID REFERENCES photobooks(id),
  src TEXT NOT NULL,
  alt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- レイアウトテンプレートテーブル
CREATE TABLE layout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  photo_positions JSONB NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  category_id UUID,
  thumbnail_url TEXT
);

-- レイアウトカテゴリーテーブル
CREATE TABLE layout_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT
);

-- スプレッドレイアウトテーブル
CREATE TABLE spread_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photobook_id UUID REFERENCES photobooks(id) NOT NULL,
  position INTEGER NOT NULL,
  left_template_id UUID REFERENCES layout_templates(id),
  right_template_id UUID REFERENCES layout_templates(id),
  full_spread_template_id UUID REFERENCES layout_templates(id),
  data JSONB
);

-- 写真配置テーブル
CREATE TABLE photo_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spread_id UUID REFERENCES spread_layouts(id) NOT NULL,
  photo_id UUID REFERENCES photos(id) NOT NULL,
  position_index INTEGER NOT NULL,
  x NUMERIC,
  y NUMERIC,
  width NUMERIC,
  height NUMERIC,
  rotation NUMERIC DEFAULT 0,
  z_index INTEGER DEFAULT 1
);

-- ユーザー写真集設定テーブル
CREATE TABLE photobook_user_settings (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  permission TEXT NOT NULL,
  max_pages INTEGER NOT NULL DEFAULT 10,
  max_photos INTEGER NOT NULL DEFAULT 50,
  max_photobooks INTEGER NOT NULL DEFAULT 1,
  has_premium_templates BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシー
ALTER TABLE photobooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE spread_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobook_user_settings ENABLE ROW LEVEL SECURITY;

-- 写真集のRLSポリシー
CREATE POLICY "ユーザーは自分の写真集を CRUD できる" ON photobooks
  FOR ALL USING (auth.uid() = user_id);
  
CREATE POLICY "公開された写真集は全員が閲覧できる" ON photobooks
  FOR SELECT USING (is_published = TRUE);

-- 写真のRLSポリシー
CREATE POLICY "ユーザーは自分の写真を CRUD できる" ON photos
  FOR ALL USING (auth.uid() = user_id);
  
CREATE POLICY "公開された写真集の写真は閲覧できる" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = photos.photobook_id
      AND photobooks.is_published = TRUE
    )
  );

-- スプレッドレイアウトのRLSポリシー
CREATE POLICY "ユーザーは自分の写真集のスプレッドレイアウトを CRUD できる" ON spread_layouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = spread_layouts.photobook_id
      AND photobooks.user_id = auth.uid()
    )
  );
  
CREATE POLICY "公開された写真集のスプレッドレイアウトは閲覧できる" ON spread_layouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = spread_layouts.photobook_id
      AND photobooks.is_published = TRUE
    )
  );

-- 写真配置のRLSポリシー
CREATE POLICY "ユーザーは自分の写真配置を CRUD できる" ON photo_placements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM spread_layouts
      JOIN photobooks ON photobooks.id = spread_layouts.photobook_id
      WHERE spread_layouts.id = photo_placements.spread_id
      AND photobooks.user_id = auth.uid()
    )
  );
  
CREATE POLICY "公開された写真集の写真配置は閲覧できる" ON photo_placements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM spread_layouts
      JOIN photobooks ON photobooks.id = spread_layouts.photobook_id
      WHERE spread_layouts.id = photo_placements.spread_id
      AND photobooks.is_published = TRUE
    )
  );

-- ユーザー設定のRLSポリシー
CREATE POLICY "ユーザーは自分の設定のみ閲覧・編集できる" ON photobook_user_settings
  FOR ALL USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_photobooks_user_id ON photobooks(user_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_photobook_id ON photos(photobook_id);
CREATE INDEX idx_spread_layouts_photobook_id ON spread_layouts(photobook_id);
CREATE INDEX idx_photo_placements_spread_id ON photo_placements(spread_id);
CREATE INDEX idx_photo_placements_photo_id ON photo_placements(photo_id);

-- トリガー: photobooks の updated_at を自動更新
CREATE OR REPLACE FUNCTION update_photobook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photobook_timestamp_trigger
BEFORE UPDATE ON photobooks
FOR EACH ROW
EXECUTE FUNCTION update_photobook_timestamp();

-- トリガー: ユーザー作成時にデフォルト設定を作成
CREATE OR REPLACE FUNCTION create_default_photobook_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO photobook_user_settings (user_id, permission, max_pages, max_photos, max_photobooks)
  VALUES (NEW.id, 'free', 10, 50, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_photobook_settings_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_photobook_settings(); 