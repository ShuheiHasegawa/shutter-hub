-- 衣装画像のハッシュ値カラムを追加（重複排除用）
ALTER TABLE photo_session_slots 
ADD COLUMN costume_image_hash TEXT;

-- 画像ハッシュにインデックスを作成（重複チェック用）
CREATE INDEX idx_photo_session_slots_costume_image_hash 
ON photo_session_slots(costume_image_hash) 
WHERE costume_image_hash IS NOT NULL;

-- 衣装画像管理テーブル（オプション：将来的な拡張用）
CREATE TABLE IF NOT EXISTS costume_images (
  hash TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 衣装画像の使用回数を更新する関数
CREATE OR REPLACE FUNCTION update_costume_image_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- 新しい画像が追加された場合
  IF NEW.costume_image_hash IS NOT NULL AND (OLD.costume_image_hash IS NULL OR OLD.costume_image_hash != NEW.costume_image_hash) THEN
    INSERT INTO costume_images (hash, url, usage_count)
    VALUES (NEW.costume_image_hash, NEW.costume_image_url, 1)
    ON CONFLICT (hash) 
    DO UPDATE SET 
      usage_count = costume_images.usage_count + 1,
      updated_at = NOW();
  END IF;
  
  -- 古い画像が削除された場合
  IF OLD.costume_image_hash IS NOT NULL AND (NEW.costume_image_hash IS NULL OR OLD.costume_image_hash != NEW.costume_image_hash) THEN
    UPDATE costume_images 
    SET 
      usage_count = usage_count - 1,
      updated_at = NOW()
    WHERE hash = OLD.costume_image_hash;
    
    -- 使用回数が0になった画像を削除
    DELETE FROM costume_images 
    WHERE hash = OLD.costume_image_hash AND usage_count <= 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
CREATE TRIGGER costume_image_usage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON photo_session_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_costume_image_usage();

-- RLS設定
ALTER TABLE costume_images ENABLE ROW LEVEL SECURITY;

-- 衣装画像の閲覧ポリシー（誰でも閲覧可能）
CREATE POLICY "costume_images_select_policy" ON costume_images
  FOR SELECT USING (true);

-- 衣装画像の作成・更新ポリシー（認証済みユーザーのみ）
CREATE POLICY "costume_images_insert_policy" ON costume_images
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "costume_images_update_policy" ON costume_images
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_costume_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER costume_images_updated_at
  BEFORE UPDATE ON costume_images
  FOR EACH ROW
  EXECUTE FUNCTION update_costume_images_updated_at(); 