-- photo_sessions テーブルを一括作成機能用に拡張

-- 1. 出演モデルID列を追加
ALTER TABLE photo_sessions 
ADD COLUMN featured_model_id UUID REFERENCES profiles(id);

-- 2. 一括作成グループID列を追加
ALTER TABLE photo_sessions 
ADD COLUMN bulk_group_id UUID;

-- 3. 運営手数料割合列を追加
ALTER TABLE photo_sessions 
ADD COLUMN organizer_fee_percentage DECIMAL(5,2) DEFAULT 20.00;

-- 4. システム手数料割合列を追加
ALTER TABLE photo_sessions 
ADD COLUMN system_fee_percentage DECIMAL(5,2) DEFAULT 5.00;

-- 5. インデックスを追加
CREATE INDEX idx_photo_sessions_bulk_group ON photo_sessions(bulk_group_id);
CREATE INDEX idx_photo_sessions_featured_model ON photo_sessions(featured_model_id);

-- 6. コメント追加
COMMENT ON COLUMN photo_sessions.featured_model_id IS '出演モデルのID（一括作成時に設定）';
COMMENT ON COLUMN photo_sessions.bulk_group_id IS '一括作成されたグループの識別ID';
COMMENT ON COLUMN photo_sessions.organizer_fee_percentage IS '運営手数料の割合（%）';
COMMENT ON COLUMN photo_sessions.system_fee_percentage IS 'システム利用手数料の割合（%）'; 