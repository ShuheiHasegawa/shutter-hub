-- Migration: 20251104084733_add_rating_block_system
-- Description: 評価システムを3段階化し、悪い評価ユーザーのブロック機能を追加
-- Date: 2025-11-04

-- ========================================================================
-- 1. 評価レベルenum型の作成
-- ========================================================================

CREATE TYPE rating_level AS ENUM ('good', 'normal', 'bad');

-- ========================================================================
-- 2. photo_session_reviewsテーブルにrating_levelカラム追加
-- ========================================================================

ALTER TABLE photo_session_reviews
ADD COLUMN rating_level rating_level;

-- 既存データの移行（overall_ratingから変換）
-- 1-2点 = bad, 3点 = normal, 4-5点 = good
UPDATE photo_session_reviews
SET rating_level = CASE
  WHEN overall_rating <= 2 THEN 'bad'::rating_level
  WHEN overall_rating = 3 THEN 'normal'::rating_level
  WHEN overall_rating >= 4 THEN 'good'::rating_level
END
WHERE rating_level IS NULL;

-- NOT NULL制約を追加
ALTER TABLE photo_session_reviews
ALTER COLUMN rating_level
SET
    NOT NULL;

-- ========================================================================
-- 3. user_reviewsテーブルにrating_levelカラム追加
-- ========================================================================

ALTER TABLE user_reviews ADD COLUMN rating_level rating_level;

-- 既存データの移行
UPDATE user_reviews
SET rating_level = CASE
  WHEN overall_rating <= 2 THEN 'bad'::rating_level
  WHEN overall_rating = 3 THEN 'normal'::rating_level
  WHEN overall_rating >= 4 THEN 'good'::rating_level
END
WHERE rating_level IS NULL;

-- NOT NULL制約を追加
ALTER TABLE user_reviews ALTER COLUMN rating_level SET NOT NULL;

-- ========================================================================
-- 4. photo_sessionsテーブルにブロックフラグ追加
-- ========================================================================

ALTER TABLE photo_sessions
ADD COLUMN block_users_with_bad_ratings BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN photo_sessions.block_users_with_bad_ratings IS '撮影会参加レビューが1つでも悪い評価を受けたユーザーの予約を受け付けない';

-- ========================================================================
-- 5. インデックス追加（パフォーマンス最適化）
-- ========================================================================

-- 悪い評価のチェック用インデックス
CREATE INDEX idx_user_reviews_reviewee_rating_level ON user_reviews (reviewee_id, rating_level)
WHERE
    rating_level = 'bad'
    AND status = 'published';

CREATE INDEX idx_photo_session_reviews_reviewer_rating_level ON photo_session_reviews (reviewer_id, rating_level)
WHERE
    rating_level = 'bad'
    AND status = 'published';