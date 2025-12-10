-- Add prefecture and city columns to profiles table
-- This allows users to specify their activity location more precisely

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS prefecture TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Migrate existing location data to prefecture (extract prefecture from location string)
-- Note: This is a simple migration. The extractPrefecture function will be handled in the application layer.

-- Create index for faster filtering by prefecture
CREATE INDEX IF NOT EXISTS idx_profiles_prefecture ON profiles(prefecture);

-- Comment on columns
COMMENT ON COLUMN profiles.prefecture IS '活動拠点の都道府県';
COMMENT ON COLUMN profiles.city IS '活動拠点の市区町村';
