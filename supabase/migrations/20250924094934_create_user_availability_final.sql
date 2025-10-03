-- Migration: 049_create_user_availability_final
-- Description: ユーザー空き時間管理テーブル（EXCLUDE制約版）
-- Date: 2025-09-24

-- 必要なエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ユーザー可用性管理テーブル（汎用設計）
CREATE TABLE user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- 日付・時間管理
  available_date DATE NOT NULL,
  start_time_minutes INTEGER NOT NULL, -- 0-1439 (24時間 × 60分)
  end_time_minutes INTEGER NOT NULL,
  
  -- 設定タイプ・メタ情報
  availability_type TEXT DEFAULT 'manual' CHECK (
    availability_type IN ('manual', 'recurring_copy', 'bulk_set')
  ),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- 作成・更新日時
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約・バリデーション
  CONSTRAINT valid_time_range CHECK (start_time_minutes < end_time_minutes),
  CONSTRAINT valid_time_bounds CHECK (
    start_time_minutes >= 0 AND start_time_minutes < 1440 AND
    end_time_minutes > 0 AND end_time_minutes <= 1440
  ),
  
  -- 重複防止（同じユーザー・同じ日・重複する時間帯は不可）
  EXCLUDE USING gist (
    user_id WITH =,
    available_date WITH =,
    int4range(start_time_minutes, end_time_minutes) WITH &&
  ) WHERE (is_active = true)
);

-- 通常のインデックス（パフォーマンス最適化）
CREATE INDEX idx_user_availability_user_date 
ON user_availability(user_id, available_date);

CREATE INDEX idx_user_availability_date_range 
ON user_availability(available_date, start_time_minutes, end_time_minutes);

CREATE INDEX idx_user_availability_active
ON user_availability(user_id, is_active, available_date)
WHERE is_active = true;

-- 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_user_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_availability_updated_at
  BEFORE UPDATE ON user_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_user_availability_updated_at();

-- 重複チェック関数
CREATE OR REPLACE FUNCTION check_availability_overlap(
  p_user_id UUID,
  p_date DATE,
  p_start_minutes INTEGER,
  p_end_minutes INTEGER,
  p_exclude_id UUID DEFAULT NULL
) RETURNS TABLE(
  has_overlap BOOLEAN,
  overlap_details JSONB
) AS $$
DECLARE
  overlap_count INTEGER;
  overlap_records JSONB[];
BEGIN
  -- 重複するレコードの検索（編集時は自分のレコードを除外）
  SELECT 
    COUNT(*),
    array_agg(
      jsonb_build_object(
        'id', id,
        'start_minutes', start_time_minutes,
        'end_minutes', end_time_minutes,
        'notes', notes
      )
    )
  INTO overlap_count, overlap_records
  FROM user_availability
  WHERE user_id = p_user_id
    AND available_date = p_date
    AND is_active = true
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND int4range(start_time_minutes, end_time_minutes) && 
        int4range(p_start_minutes, p_end_minutes);
  
  RETURN QUERY SELECT 
    (overlap_count > 0) AS has_overlap,
    jsonb_build_object(
      'overlap_count', overlap_count,
      'requested_time', p_start_minutes || '-' || p_end_minutes,
      'overlapping_slots', COALESCE(overlap_records, ARRAY[]::jsonb[])
    ) AS overlap_details;
END;
$$ LANGUAGE plpgsql;

-- 運営との重複確認関数（モデル専用）
CREATE OR REPLACE FUNCTION get_organizer_schedule_overlap(
  p_model_id UUID,
  p_date DATE
) RETURNS TABLE(
  organizer_id UUID,
  organizer_name TEXT,
  overlap_slots JSONB[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    array_agg(
      jsonb_build_object(
        'start_minutes', ua.start_time_minutes,
        'end_minutes', ua.end_time_minutes,
        'notes', ua.notes,
        'overlap_type', CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_availability model_ua
            WHERE model_ua.user_id = p_model_id
            AND model_ua.available_date = p_date
            AND model_ua.is_active = true
            AND int4range(model_ua.start_time_minutes, model_ua.end_time_minutes) @> 
                int4range(ua.start_time_minutes, ua.end_time_minutes)
          ) THEN 'complete'
          ELSE 'partial'
        END
      )
    )
  FROM organizer_models om
  JOIN profiles p ON p.id = om.organizer_id  
  JOIN user_availability ua ON ua.user_id = om.organizer_id
  WHERE om.model_id = p_model_id
    AND ua.available_date = p_date
    AND ua.is_active = true
    AND om.is_active = true
  GROUP BY p.id, p.display_name;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) ポリシー
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

-- ユーザー自身のデータのみアクセス可能
CREATE POLICY "Users can manage own availability" 
ON user_availability FOR ALL USING (
  user_id = auth.uid()
);

-- 運営は所属モデルの空き時間を閲覧可能（編集不可）
CREATE POLICY "Organizers can view model availability" 
ON user_availability FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organizer_models om
    WHERE om.model_id = user_availability.user_id
    AND om.organizer_id = auth.uid()
    AND om.is_active = true
  )
);

COMMENT ON TABLE user_availability IS 'ユーザー空き時間管理（全ユーザータイプ対応）';
COMMENT ON COLUMN user_availability.start_time_minutes IS '開始時間（分単位: 0-1439）';
COMMENT ON COLUMN user_availability.end_time_minutes IS '終了時間（分単位: 0-1439）';
COMMENT ON COLUMN user_availability.availability_type IS '設定タイプ（manual/recurring_copy/bulk_set）';

