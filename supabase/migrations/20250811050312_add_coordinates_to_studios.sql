-- Migration: 20250811050312_add_coordinates_to_studios
-- Description: スタジオテーブルに緯度経度カラムを追加（地図機能対応）
-- Date: 2025-01-11

-- スタジオテーブルに緯度経度カラムを追加
ALTER TABLE public.studios 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- 緯度経度に対するインデックスを作成（地理的検索の高速化）
CREATE INDEX idx_studios_coordinates ON public.studios USING btree (latitude, longitude);

-- 緯度経度の範囲制約（有効な地球上の座標のみ許可）
ALTER TABLE public.studios 
ADD CONSTRAINT studios_latitude_range 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.studios 
ADD CONSTRAINT studios_longitude_range 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- コメント追加
COMMENT ON COLUMN public.studios.latitude IS 'スタジオの緯度（MapPicker使用）';
COMMENT ON COLUMN public.studios.longitude IS 'スタジオの経度（MapPicker使用）';
