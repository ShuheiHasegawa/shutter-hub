-- Fix studio_photos table schema to match code expectations
-- Created: 2025-08-05

-- Drop existing table if it exists (this will lose data, only for development)
DROP TABLE IF EXISTS studio_photos CASCADE;

-- Recreate with correct schema
CREATE TABLE studio_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_filename TEXT,
  alt_text TEXT,
  caption TEXT,
  category TEXT CHECK (category IN (
    'exterior', 'interior', 'equipment', 'lighting_setup', 'sample_work', 'other'
  )) DEFAULT 'other',
  photo_type TEXT DEFAULT 'general',
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_studio_photos_studio_id ON studio_photos(studio_id);
CREATE INDEX idx_studio_photos_category ON studio_photos(category);
CREATE INDEX idx_studio_photos_display_order ON studio_photos(display_order);

-- Enable RLS
ALTER TABLE studio_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view studio photos" ON studio_photos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload photos" ON studio_photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Photo uploaders can manage their photos" ON studio_photos
  FOR ALL USING (uploaded_by = auth.uid());

-- Add comments
COMMENT ON TABLE studio_photos IS 'スタジオ写真 - スタジオの内部・設備写真';
COMMENT ON COLUMN studio_photos.image_url IS '画像URL';
COMMENT ON COLUMN studio_photos.category IS '写真カテゴリ（外観、内観、設備等）';
COMMENT ON COLUMN studio_photos.display_order IS '表示順序（低い値ほど前に表示）';
