-- Migration: 20251211000001_optimize_photo_session_search
-- Description: Enable pg_trgm extension and add GIN indexes for faster text search
-- Created: 2025-12-11

-- Enable pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for partial match search optimization
-- location column (used in "Activity Location" filter)
CREATE INDEX IF NOT EXISTS idx_photo_sessions_location_trgm ON photo_sessions USING gin (location gin_trgm_ops);

-- title and description columns (used in Keyword filter)
CREATE INDEX IF NOT EXISTS idx_photo_sessions_title_trgm ON photo_sessions USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_description_trgm ON photo_sessions USING gin (description gin_trgm_ops);

-- Comment on migration
COMMENT ON INDEX idx_photo_sessions_location_trgm IS 'GIN index for faster location search';
COMMENT ON INDEX idx_photo_sessions_title_trgm IS 'GIN index for faster title search';
COMMENT ON INDEX idx_photo_sessions_description_trgm IS 'GIN index for faster description search';
