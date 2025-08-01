-- 画像メタデータ管理テーブル（パフォーマンス最適化・フォトブック対応）

-- 画像メタデータテーブル
CREATE TABLE IF NOT EXISTS image_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 画像URL情報
  web_url TEXT NOT NULL,
  print_url TEXT,              -- フォトブック用高画質版
  thumbnail_url TEXT NOT NULL,
  original_url TEXT,           -- オリジナル版（必要に応じて）
  
  -- ファイル情報
  file_hash TEXT,              -- 重複検出用
  original_size BIGINT NOT NULL,
  processed_sizes JSONB NOT NULL DEFAULT '{}', -- {web: size, print: size, thumbnail: size}
  dimensions JSONB NOT NULL DEFAULT '{}',      -- {original: {w,h}, web: {w,h}, print: {w,h}, thumbnail: {w,h}}
  formats TEXT[] NOT NULL DEFAULT '{}',        -- 対応フォーマット
  
  -- カテゴリ・関連情報
  category TEXT NOT NULL CHECK (category IN ('profile', 'photoSession', 'photobook', 'social')),
  related_id TEXT,             -- photo_session_id, photobook_id など
  
  -- メタデータ
  title TEXT,
  alt_text TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  is_watermarked BOOLEAN DEFAULT false,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス用
  UNIQUE(file_hash, user_id) -- 同一ユーザー内での重複防止
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_image_metadata_user_id ON image_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_category ON image_metadata(category);
CREATE INDEX IF NOT EXISTS idx_image_metadata_related_id ON image_metadata(related_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_file_hash ON image_metadata(file_hash);
CREATE INDEX IF NOT EXISTS idx_image_metadata_created_at ON image_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_metadata_is_public ON image_metadata(is_public) WHERE is_public = true;

-- アクセス統計テーブル
CREATE TABLE IF NOT EXISTS image_access_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_metadata_id UUID NOT NULL REFERENCES image_metadata(id) ON DELETE CASCADE,
  
  -- アクセス情報
  access_count BIGINT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  bandwidth_used BIGINT DEFAULT 0, -- 転送量（bytes）
  
  -- 月次統計
  monthly_stats JSONB DEFAULT '{}', -- {2024-01: {count: 100, bandwidth: 1024000}, ...}
  
  -- パフォーマンス統計
  avg_load_time_ms INTEGER,
  cache_hit_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 画像最適化ジョブキュー
CREATE TABLE IF NOT EXISTS image_optimization_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_metadata_id UUID NOT NULL REFERENCES image_metadata(id) ON DELETE CASCADE,
  
  -- ジョブ情報
  job_type TEXT NOT NULL CHECK (job_type IN ('resize', 'compress', 'format_convert', 'watermark')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5, -- 1(high) - 10(low)
  
  -- 処理パラメータ
  source_url TEXT NOT NULL,
  target_params JSONB NOT NULL, -- {width: 800, height: 600, quality: 85, format: 'webp'}
  target_url TEXT,
  
  -- 処理結果
  processing_time_ms INTEGER,
  compression_ratio DECIMAL(5,2),
  error_message TEXT,
  
  -- スケジューリング
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_image_optimization_queue_status ON image_optimization_queue(status);
CREATE INDEX IF NOT EXISTS idx_image_optimization_queue_priority ON image_optimization_queue(priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_image_optimization_queue_created_at ON image_optimization_queue(created_at);

-- CDN キャッシュ管理テーブル
CREATE TABLE IF NOT EXISTS image_cache_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_metadata_id UUID NOT NULL REFERENCES image_metadata(id) ON DELETE CASCADE,
  
  -- キャッシュ情報
  cache_key TEXT NOT NULL,
  cache_status TEXT NOT NULL CHECK (cache_status IN ('miss', 'hit', 'stale', 'expired')),
  cache_provider TEXT NOT NULL DEFAULT 'vercel', -- 'vercel', 'cloudflare', 'custom'
  
  -- パフォーマンス
  hit_count BIGINT DEFAULT 0,
  miss_count BIGINT DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  last_miss_at TIMESTAMPTZ,
  
  -- TTL管理
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(cache_key, cache_provider)
);

-- RLS (Row Level Security) 設定
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_access_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_optimization_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_cache_status ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can view their own image metadata"
  ON image_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image metadata"
  ON image_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image metadata"
  ON image_metadata FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image metadata"
  ON image_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- パブリック画像は誰でも閲覧可能
CREATE POLICY "Public images are viewable by everyone"
  ON image_metadata FOR SELECT
  USING (is_public = true);

-- アクセス統計は所有者のみ
CREATE POLICY "Users can view their own image stats"
  ON image_access_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM image_metadata 
      WHERE image_metadata.id = image_access_stats.image_metadata_id 
      AND image_metadata.user_id = auth.uid()
    )
  );

-- 最適化キューは所有者のみ
CREATE POLICY "Users can manage their own optimization jobs"
  ON image_optimization_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM image_metadata 
      WHERE image_metadata.id = image_optimization_queue.image_metadata_id 
      AND image_metadata.user_id = auth.uid()
    )
  );

-- キャッシュ状況は所有者のみ
CREATE POLICY "Users can view their own cache status"
  ON image_cache_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM image_metadata 
      WHERE image_metadata.id = image_cache_status.image_metadata_id 
      AND image_metadata.user_id = auth.uid()
    )
  );

-- トリガー：updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_image_metadata_updated_at 
  BEFORE UPDATE ON image_metadata 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_access_stats_updated_at 
  BEFORE UPDATE ON image_access_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_optimization_queue_updated_at 
  BEFORE UPDATE ON image_optimization_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_cache_status_updated_at 
  BEFORE UPDATE ON image_cache_status 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- パフォーマンス監視用関数
CREATE OR REPLACE FUNCTION get_image_performance_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_images BIGINT,
  total_storage_mb DECIMAL,
  avg_compression_ratio DECIMAL,
  cache_hit_rate DECIMAL,
  popular_categories TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(im.*) as total_images,
    ROUND(SUM(im.original_size) / (1024.0 * 1024.0), 2) as total_storage_mb,
    ROUND(AVG(
      CASE 
        WHEN (im.processed_sizes->>'web')::BIGINT > 0 
        THEN (1.0 - (im.processed_sizes->>'web')::BIGINT::DECIMAL / im.original_size) * 100
        ELSE 0
      END
    ), 2) as avg_compression_ratio,
    ROUND(
      COALESCE(
        AVG(ics.hit_count::DECIMAL / NULLIF(ics.hit_count + ics.miss_count, 0)) * 100,
        0
      ), 2
    ) as cache_hit_rate,
    ARRAY_AGG(DISTINCT im.category) as popular_categories
  FROM image_metadata im
  LEFT JOIN image_cache_status ics ON im.id = ics.image_metadata_id
  WHERE (p_user_id IS NULL OR im.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 古い最適化ジョブクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_completed_optimization_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM image_optimization_queue
  WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '7 days';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;