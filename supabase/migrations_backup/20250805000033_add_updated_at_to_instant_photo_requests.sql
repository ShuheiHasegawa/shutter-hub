-- instant_photo_requests テーブルに updated_at カラムを追加
-- ステータス更新時の追跡を可能にする

-- updated_at カラムを追加
ALTER TABLE instant_photo_requests 
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- 既存レコードの updated_at を created_at で初期化
UPDATE instant_photo_requests 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- updated_at を NOT NULL に設定
ALTER TABLE instant_photo_requests 
ALTER COLUMN updated_at SET NOT NULL;

-- updated_at 自動更新用のトリガー関数を作成
CREATE OR REPLACE FUNCTION update_instant_photo_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 自動更新トリガーを作成
CREATE TRIGGER instant_photo_requests_updated_at
  BEFORE UPDATE ON instant_photo_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_instant_photo_requests_updated_at();

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX idx_instant_photo_requests_updated_at 
ON instant_photo_requests(updated_at);

-- コメントを追加
COMMENT ON COLUMN instant_photo_requests.updated_at IS 'レコードの最終更新日時';
COMMENT ON TRIGGER instant_photo_requests_updated_at ON instant_photo_requests IS 'updated_at フィールドの自動更新'; 