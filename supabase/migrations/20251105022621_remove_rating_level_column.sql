-- Migration: 20251105022621_remove_rating_level_column
-- Description: rating_levelカラムを削除し、overall_rating（1,3,5のみ）で管理するように変更
-- Date: 2025-11-05

-- ========================================================================
-- 1. 既存データのoverall_ratingを1,3,5に変換
-- ========================================================================

-- photo_session_reviews: rating_levelからoverall_ratingを更新
UPDATE photo_session_reviews
SET
    overall_rating = CASE
        WHEN rating_level = 'bad' THEN 1
        WHEN rating_level = 'normal' THEN 3
        WHEN rating_level = 'good' THEN 5
        ELSE overall_rating
    END
WHERE
    rating_level IS NOT NULL;

-- user_reviews: rating_levelからoverall_ratingを更新
UPDATE user_reviews
SET
    overall_rating = CASE
        WHEN rating_level = 'bad' THEN 1
        WHEN rating_level = 'normal' THEN 3
        WHEN rating_level = 'good' THEN 5
        ELSE overall_rating
    END
WHERE
    rating_level IS NOT NULL;

-- studio_evaluationsも確認（rating_levelがあれば変換）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studio_evaluations' AND column_name = 'rating_level'
  ) THEN
    UPDATE studio_evaluations
    SET overall_rating = CASE
      WHEN rating_level = 'bad' THEN 1
      WHEN rating_level = 'normal' THEN 3
      WHEN rating_level = 'good' THEN 5
      ELSE overall_rating
    END
    WHERE rating_level IS NOT NULL;
  END IF;
END $$;

-- ========================================================================
-- 2. インデックスの削除（rating_levelベース）
-- ========================================================================

DROP INDEX IF EXISTS idx_user_reviews_reviewee_rating_level;

DROP INDEX IF EXISTS idx_photo_session_reviews_reviewer_rating_level;

-- ========================================================================
-- 3. rating_levelカラムの削除
-- ========================================================================

ALTER TABLE photo_session_reviews DROP COLUMN IF EXISTS rating_level;

ALTER TABLE user_reviews DROP COLUMN IF EXISTS rating_level;

ALTER TABLE studio_evaluations DROP COLUMN IF EXISTS rating_level;

-- ========================================================================
-- 4. overall_ratingにCHECK制約を追加（1,3,5のみ許可）
-- ========================================================================

-- photo_session_reviews
ALTER TABLE photo_session_reviews
ADD CONSTRAINT check_overall_rating_values CHECK (overall_rating IN (1, 3, 5));

-- user_reviews
ALTER TABLE user_reviews
ADD CONSTRAINT check_user_review_overall_rating_values CHECK (overall_rating IN (1, 3, 5));

-- studio_evaluations（存在する場合）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'studio_evaluations'
  ) THEN
    ALTER TABLE studio_evaluations
    ADD CONSTRAINT check_studio_evaluation_overall_rating_values
    CHECK (overall_rating IN (1, 3, 5));
  END IF;
END $$;

-- ========================================================================
-- 5. 新しいインデックスの作成（overall_ratingベース）
-- ========================================================================

-- 悪い評価（overall_rating = 1）のチェック用インデックス
CREATE INDEX idx_user_reviews_reviewee_bad_rating ON user_reviews (reviewee_id, overall_rating)
WHERE
    overall_rating = 1
    AND status = 'published';

CREATE INDEX idx_photo_session_reviews_reviewer_bad_rating ON photo_session_reviews (reviewer_id, overall_rating)
WHERE
    overall_rating = 1
    AND status = 'published';

-- ========================================================================
-- 6. rating_level型（ENUM）の削除
-- ========================================================================

-- 型を使用している他のテーブルがないことを確認してから削除
DROP TYPE IF EXISTS rating_level;

-- ========================================================================
-- 7. トリガー関数の更新（rating_levelベースのものがあれば削除）
-- ========================================================================

DROP FUNCTION IF EXISTS update_review_rating_level () CASCADE;

DROP FUNCTION IF EXISTS update_studio_evaluation_rating_level () CASCADE;