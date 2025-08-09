-- Migration: 20250805000003_create_studio_system
-- Description: StudioWiki完全実装 - スタジオ情報一元化プラットフォーム
-- Features: 基本CRUD、重複防止システム、運営者管理、評価システム、Wiki機能
-- Created: 2025-08-05

-- ========================================================================
-- 拡張機能の有効化
-- ========================================================================

-- 類似度検索用拡張（重複防止に使用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 全文検索用拡張
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ========================================================================
-- 1. スタジオ基本情報テーブル
-- ========================================================================

CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  access_info TEXT, -- アクセス情報
  phone TEXT,
  email TEXT,
  website_url TEXT,
  
  -- 位置情報
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- 基本設備
  total_area DECIMAL, -- 総面積（㎡）
  max_capacity INTEGER, -- 最大収容人数
  parking_available BOOLEAN DEFAULT false,
  wifi_available BOOLEAN DEFAULT false,
  
  -- 営業情報
  business_hours JSONB, -- {"mon": "9:00-21:00", "tue": "9:00-21:00", ...}
  regular_holidays TEXT[], -- 定休日 ["日曜日", "祝日"]
  
  -- 料金情報
  hourly_rate_min INTEGER, -- 最低時間料金（円）
  hourly_rate_max INTEGER, -- 最高時間料金（円）
  
  -- 重複防止用正規化フィールド
  normalized_name TEXT NOT NULL,
  normalized_address TEXT NOT NULL,
  location_hash TEXT,
  
  -- メタ情報
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 検索用
  search_vector tsvector,
  
  -- 重複防止制約
  CONSTRAINT unique_studio_location 
    UNIQUE (normalized_name, normalized_address, prefecture, city),
  -- 注意: 初期データで位置ハッシュの重複を避けるため一時的にコメントアウト
  -- CONSTRAINT unique_location_hash 
  --   UNIQUE (location_hash),
    
  -- バリデーション制約
  CONSTRAINT valid_coordinates 
    CHECK (
      (latitude IS NULL AND longitude IS NULL) OR 
      (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    ),
  CONSTRAINT valid_capacity 
    CHECK (max_capacity IS NULL OR max_capacity > 0),
  CONSTRAINT valid_area 
    CHECK (total_area IS NULL OR total_area > 0),
  CONSTRAINT valid_rates 
    CHECK (
      (hourly_rate_min IS NULL AND hourly_rate_max IS NULL) OR
      (hourly_rate_min <= hourly_rate_max AND hourly_rate_min >= 0)
    )
);

-- ========================================================================
-- 2. スタジオ設備詳細テーブル
-- ========================================================================

CREATE TABLE studio_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'lighting', 'camera', 'backdrop', 'props', 'furniture', 'audio', 'other'
  )),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  rental_fee INTEGER CHECK (rental_fee >= 0), -- 追加料金（円/時間）
  is_included BOOLEAN DEFAULT true, -- 基本料金に含まれるか
  condition_notes TEXT, -- 機材の状態メモ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 3. スタジオ写真テーブル
-- ========================================================================

CREATE TABLE studio_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_filename TEXT,
  alt_text TEXT,
  caption TEXT,
  category TEXT CHECK (category IN (
    'exterior', 'interior', 'equipment', 'lighting_setup', 'sample_work', 'other'
  )),
  photo_type TEXT DEFAULT 'general',
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 4. 撮影会-スタジオ連携テーブル
-- ========================================================================

CREATE TABLE photo_session_studios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE NOT NULL,
  studio_id UUID REFERENCES studios(id) NOT NULL,
  usage_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_cost INTEGER CHECK (total_cost >= 0), -- 実際の利用料金
  notes TEXT, -- 利用時のメモ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 同じ撮影会で複数スタジオは使用可能だが、同じスタジオの重複は防ぐ
  UNIQUE(photo_session_id, studio_id),
  
  -- 時間の妥当性チェック
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- ========================================================================
-- 5. 評価システムテーブル
-- ========================================================================

CREATE TABLE studio_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  photo_session_id UUID REFERENCES photo_sessions(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('model', 'photographer', 'organizer')),
  
  -- 基本評価（1-5点、0.5刻み）
  overall_rating DECIMAL(2,1) NOT NULL CHECK (overall_rating BETWEEN 1.0 AND 5.0),
  accessibility_rating DECIMAL(2,1) CHECK (accessibility_rating BETWEEN 1.0 AND 5.0),
  cleanliness_rating DECIMAL(2,1) CHECK (cleanliness_rating BETWEEN 1.0 AND 5.0),
  staff_support_rating DECIMAL(2,1) CHECK (staff_support_rating BETWEEN 1.0 AND 5.0),
  cost_performance_rating DECIMAL(2,1) CHECK (cost_performance_rating BETWEEN 1.0 AND 5.0),
  
  -- 役割別評価（JSONBで柔軟に対応）
  role_specific_ratings JSONB DEFAULT '{}',
  
  -- コメント・写真
  comment TEXT,
  evaluation_photos TEXT[], -- 評価時に投稿した写真URL
  
  -- 評価の信頼性フラグ
  is_verified BOOLEAN DEFAULT false, -- 実際に参加したことが確認済み
  
  -- メタ情報
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 同じユーザーが同じ撮影会で同じスタジオを複数回評価できない
  UNIQUE(studio_id, photo_session_id, user_id)
);

-- ========================================================================
-- 6. Wiki編集履歴テーブル
-- ========================================================================

CREATE TABLE studio_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  edited_by UUID REFERENCES auth.users(id) NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('create', 'update', 'delete', 'restore')),
  changed_fields JSONB, -- 変更されたフィールド
  old_values JSONB, -- 変更前の値
  new_values JSONB, -- 変更後の値
  edit_reason TEXT, -- 編集理由
  ip_address TEXT, -- 編集者のIPアドレス（セキュリティ用）
  user_agent TEXT, -- ブラウザ情報
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 7. 運営者スタジオ管理テーブル
-- ========================================================================

CREATE TABLE organizer_studios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'preferred' CHECK (
    relationship_type IN ('preferred', 'partner', 'exclusive', 'blocked')
  ),
  usage_rate INTEGER CHECK (usage_rate >= 0), -- 特別料金（円/時間）
  contact_person TEXT, -- 担当者名
  contact_notes TEXT, -- 連絡時の注意事項
  priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5), -- 優先度（1-5）
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- 契約期間
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- メタ情報
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  UNIQUE(organizer_id, studio_id),
  
  -- 契約期間の妥当性チェック
  CONSTRAINT valid_contract_period CHECK (
    (contract_start_date IS NULL AND contract_end_date IS NULL) OR
    (contract_start_date <= contract_end_date)
  )
);

-- ========================================================================
-- インデックス作成
-- ========================================================================

-- スタジオ基本情報
CREATE INDEX idx_studios_prefecture_city ON studios(prefecture, city);
CREATE INDEX idx_studios_location ON studios(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_studios_capacity ON studios(max_capacity) WHERE max_capacity IS NOT NULL;
CREATE INDEX idx_studios_rates ON studios(hourly_rate_min, hourly_rate_max) WHERE hourly_rate_min IS NOT NULL;
CREATE INDEX idx_studios_created_by ON studios(created_by);
CREATE INDEX idx_studios_search_vector ON studios USING gin(search_vector);

-- 正規化フィールドのインデックス（重複防止用）
CREATE INDEX idx_studios_normalized_name ON studios USING gin(normalized_name gin_trgm_ops);
CREATE INDEX idx_studios_normalized_address ON studios USING gin(normalized_address gin_trgm_ops);

-- スタジオ設備
CREATE INDEX idx_studio_equipment_studio_id ON studio_equipment(studio_id);
CREATE INDEX idx_studio_equipment_category ON studio_equipment(category);

-- スタジオ写真
CREATE INDEX idx_studio_photos_studio_id ON studio_photos(studio_id);
CREATE INDEX idx_studio_photos_category ON studio_photos(category);
CREATE INDEX idx_studio_photos_display_order ON studio_photos(display_order);

-- 撮影会-スタジオ連携
CREATE INDEX idx_photo_session_studios_photo_session_id ON photo_session_studios(photo_session_id);
CREATE INDEX idx_photo_session_studios_studio_id ON photo_session_studios(studio_id);
CREATE INDEX idx_photo_session_studios_usage_date ON photo_session_studios(usage_date);

-- 評価システム
CREATE INDEX idx_studio_evaluations_studio_id ON studio_evaluations(studio_id);
CREATE INDEX idx_studio_evaluations_photo_session_id ON studio_evaluations(photo_session_id);
CREATE INDEX idx_studio_evaluations_user_id ON studio_evaluations(user_id);
CREATE INDEX idx_studio_evaluations_rating ON studio_evaluations(overall_rating);
CREATE INDEX idx_studio_evaluations_role ON studio_evaluations(user_role);

-- Wiki編集履歴
CREATE INDEX idx_studio_edit_history_studio_id ON studio_edit_history(studio_id);
CREATE INDEX idx_studio_edit_history_edited_by ON studio_edit_history(edited_by);
CREATE INDEX idx_studio_edit_history_edit_type ON studio_edit_history(edit_type);
CREATE INDEX idx_studio_edit_history_created_at ON studio_edit_history(created_at);

-- 運営者スタジオ管理
CREATE INDEX idx_organizer_studios_organizer_id ON organizer_studios(organizer_id);
CREATE INDEX idx_organizer_studios_studio_id ON organizer_studios(studio_id);
CREATE INDEX idx_organizer_studios_status ON organizer_studios(status);
CREATE INDEX idx_organizer_studios_priority_level ON organizer_studios(priority_level);
CREATE INDEX idx_organizer_studios_relationship_type ON organizer_studios(relationship_type);

-- ========================================================================
-- 重複防止システム用関数
-- ========================================================================

-- 正規化関数（カタカナ→ひらがな、全角→半角など）
CREATE OR REPLACE FUNCTION normalize_studio_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      translate(
        input_name,
        'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤユヨラリルレロワヲン　（）()「」[]【】',
        'あああいいううええおおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもやゆよらりるれろわをん                    '
      ),
      '[^ぁ-んa-z0-9\s]', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 住所正規化関数
CREATE OR REPLACE FUNCTION normalize_address(input_address TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      translate(
        input_address,
        '０１２３４５６７８９－‐−ー　（）()「」[]【】',
        '0123456789----                '
      ),
      '[番号地丁目町村市区都道府県\s\-−‐ー()（）「」\[\]【】]+', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 位置ハッシュ生成関数（緯度経度から重複チェック用ハッシュ生成）
CREATE OR REPLACE FUNCTION generate_location_hash(lat DECIMAL, lng DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF lat IS NULL OR lng IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 約100m精度でのハッシュ生成（小数点3桁まで使用）
  RETURN encode(
    digest(
      concat(
        round(lat::numeric, 3)::text, 
        ',', 
        round(lng::numeric, 3)::text
      ), 
      'sha256'
    ), 
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- スタジオ類似度検証関数
CREATE OR REPLACE FUNCTION check_studio_similarity(
  input_name TEXT,
  input_address TEXT,
  input_prefecture TEXT,
  input_city TEXT,
  input_lat DECIMAL DEFAULT NULL,
  input_lng DECIMAL DEFAULT NULL,
  exclude_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  similar_studios RECORD;
  distance_threshold DECIMAL := 0.001; -- 約100m以内
  similarity_threshold REAL := 0.8;
  normalized_input_name TEXT;
  normalized_input_address TEXT;
BEGIN
  -- 入力値の正規化
  normalized_input_name := normalize_studio_name(input_name);
  normalized_input_address := normalize_address(input_address);
  
  result := jsonb_build_object(
    'has_duplicates', false,
    'similar_studios', '[]'::jsonb,
    'suggestions', '[]'::jsonb
  );
  
  -- 完全一致チェック
  IF EXISTS (
    SELECT 1 FROM studios 
    WHERE normalized_name = normalized_input_name
    AND normalized_address = normalized_input_address
    AND prefecture = input_prefecture
    AND city = input_city
    AND (exclude_id IS NULL OR id != exclude_id)
  ) THEN
    result := jsonb_set(result, '{has_duplicates}', 'true'::jsonb);
    RETURN result;
  END IF;
  
  -- 類似名前・住所チェック
  FOR similar_studios IN
    SELECT 
      id, name, address,
      similarity(normalized_name, normalized_input_name) as name_sim,
      similarity(normalized_address, normalized_input_address) as addr_sim,
      CASE 
        WHEN latitude IS NOT NULL AND longitude IS NOT NULL 
        AND input_lat IS NOT NULL AND input_lng IS NOT NULL THEN
          sqrt(power(latitude - input_lat, 2) + power(longitude - input_lng, 2))
        ELSE NULL
      END as distance
    FROM studios
    WHERE prefecture = input_prefecture
    AND city = input_city
    AND (exclude_id IS NULL OR id != exclude_id)
    AND (
      similarity(normalized_name, normalized_input_name) > similarity_threshold
      OR similarity(normalized_address, normalized_input_address) > similarity_threshold
    )
    ORDER BY GREATEST(name_sim, addr_sim) DESC
    LIMIT 5
  LOOP
    -- 距離が近い場合は重複の可能性が高い
    IF similar_studios.distance IS NOT NULL AND similar_studios.distance < distance_threshold THEN
      result := jsonb_set(result, '{has_duplicates}', 'true'::jsonb);
    END IF;
    
    result := jsonb_set(
      result, 
      '{similar_studios}',
      (result->'similar_studios') || jsonb_build_object(
        'id', similar_studios.id,
        'name', similar_studios.name,
        'address', similar_studios.address,
        'name_similarity', similar_studios.name_sim,
        'address_similarity', similar_studios.addr_sim,
        'distance_km', COALESCE(similar_studios.distance * 111, 0)
      )
    );
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- トリガー関数とトリガー
-- ========================================================================

-- スタジオ情報更新時の正規化処理とサーチベクトル更新
CREATE OR REPLACE FUNCTION update_studio_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- 正規化フィールドの更新
  NEW.normalized_name := normalize_studio_name(NEW.name);
  NEW.normalized_address := normalize_address(NEW.address);
  
  -- 位置ハッシュの生成
  NEW.location_hash := generate_location_hash(NEW.latitude, NEW.longitude);
  
  -- 検索ベクトルの更新
  NEW.search_vector := to_tsvector('simple', 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' || 
    COALESCE(NEW.address, '') || ' ' ||
    COALESCE(NEW.access_info, '')
  );
  
  -- 更新時間の設定
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 編集履歴記録トリガー関数
CREATE OR REPLACE FUNCTION record_studio_edit_history()
RETURNS TRIGGER AS $$
DECLARE
  edit_type_val TEXT;
  old_values_json JSONB;
  new_values_json JSONB;
BEGIN
  -- 操作タイプの決定
  IF TG_OP = 'INSERT' THEN
    edit_type_val := 'create';
    old_values_json := NULL;
    new_values_json := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    edit_type_val := 'update';
    old_values_json := to_jsonb(OLD);
    new_values_json := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    edit_type_val := 'delete';
    old_values_json := to_jsonb(OLD);
    new_values_json := NULL;
  END IF;
  
  -- 履歴レコードの挿入
  INSERT INTO studio_edit_history (
    studio_id,
    edited_by,
    edit_type,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.created_by, OLD.created_by), -- 編集者情報（実際の実装では認証情報から取得）
    edit_type_val,
    old_values_json,
    new_values_json
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER update_studios_metadata
  BEFORE INSERT OR UPDATE ON studios
  FOR EACH ROW EXECUTE FUNCTION update_studio_metadata();

CREATE TRIGGER record_studios_edit_history
  AFTER INSERT OR UPDATE OR DELETE ON studios
  FOR EACH ROW EXECUTE FUNCTION record_studio_edit_history();

-- その他のテーブルの更新時間トリガー
CREATE TRIGGER update_studio_equipment_updated_at
  BEFORE UPDATE ON studio_equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studio_evaluations_updated_at
  BEFORE UPDATE ON studio_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizer_studios_updated_at
  BEFORE UPDATE ON organizer_studios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- Row Level Security (RLS) 設定
-- ========================================================================

-- 全テーブルでRLSを有効化
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_session_studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_studios ENABLE ROW LEVEL SECURITY;

-- スタジオ基本情報のRLSポリシー
CREATE POLICY "Anyone can view published studios" ON studios
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create studios" ON studios
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Studio creators and admins can update" ON studios
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'organizer')
  );

CREATE POLICY "Studio creators and admins can delete" ON studios
  FOR DELETE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'organizer')
  );

-- スタジオ設備のRLSポリシー
CREATE POLICY "Anyone can view studio equipment" ON studio_equipment
  FOR SELECT USING (true);

CREATE POLICY "Studio managers can manage equipment" ON studio_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM studios 
      WHERE id = studio_equipment.studio_id 
      AND (created_by = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

-- スタジオ写真のRLSポリシー  
CREATE POLICY "Anyone can view studio photos" ON studio_photos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload photos" ON studio_photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Photo uploaders can manage their photos" ON studio_photos
  FOR ALL USING (uploaded_by = auth.uid());

-- 撮影会-スタジオ連携のRLSポリシー
CREATE POLICY "Users can view session-studio links" ON photo_session_studios
  FOR SELECT USING (true);

CREATE POLICY "Session organizers can manage studio links" ON photo_session_studios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions 
      WHERE id = photo_session_studios.photo_session_id 
      AND organizer_id = auth.uid()
    )
  );

-- 評価システムのRLSポリシー
CREATE POLICY "Anyone can view studio evaluations" ON studio_evaluations
  FOR SELECT USING (true);

CREATE POLICY "Session participants can create evaluations" ON studio_evaluations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN photo_sessions ps ON ps.id = b.photo_session_id
      WHERE ps.id = photo_session_id 
      AND b.user_id = auth.uid()
      AND b.status = 'confirmed'
    )
  );

CREATE POLICY "Users can update their own evaluations" ON studio_evaluations
  FOR UPDATE USING (user_id = auth.uid());

-- Wiki編集履歴のRLSポリシー
CREATE POLICY "Anyone can view edit history" ON studio_edit_history
  FOR SELECT USING (true);

-- 運営者スタジオ管理のRLSポリシー
CREATE POLICY "Organizers can view their studio relationships" ON organizer_studios
  FOR SELECT USING (
    organizer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'organizer')
  );

CREATE POLICY "Organizers can manage their studio relationships" ON organizer_studios
  FOR ALL USING (organizer_id = auth.uid());

-- ========================================================================
-- 初期データの挿入
-- ========================================================================

-- サンプルデータは後で手動で追加する（テーブル作成時のトリガー問題を回避）
-- INSERT INTO studios (...) VALUES (...) は後で実行

-- ========================================================================
-- コメント追加
-- ========================================================================

COMMENT ON TABLE studios IS 'スタジオ基本情報 - 撮影スタジオの詳細情報を管理';
COMMENT ON TABLE studio_equipment IS 'スタジオ設備詳細 - 各スタジオの設備・機材情報';
COMMENT ON TABLE studio_photos IS 'スタジオ写真 - スタジオの内部・設備写真';
COMMENT ON TABLE photo_session_studios IS '撮影会-スタジオ連携 - 撮影会で使用されたスタジオの記録';
COMMENT ON TABLE studio_evaluations IS 'スタジオ評価 - 撮影会参加者による評価・レビュー';
COMMENT ON TABLE studio_edit_history IS 'Wiki編集履歴 - スタジオ情報の変更履歴';
COMMENT ON TABLE organizer_studios IS '運営者スタジオ管理 - 運営者とスタジオの関係性管理';

COMMENT ON FUNCTION normalize_studio_name(TEXT) IS 'スタジオ名正規化関数 - 重複防止用';
COMMENT ON FUNCTION normalize_address(TEXT) IS '住所正規化関数 - 重複防止用';
COMMENT ON FUNCTION generate_location_hash(DECIMAL, DECIMAL) IS '位置ハッシュ生成関数 - 地理的重複防止用';
COMMENT ON FUNCTION check_studio_similarity(TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, UUID) IS 'スタジオ類似度検証関数 - 重複防止システムのコア';