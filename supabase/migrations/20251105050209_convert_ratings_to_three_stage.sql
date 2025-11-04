-- Migration: 20251105050209_convert_ratings_to_three_stage
-- Description: 既存の評価データを1、3、5の3段階評価に変換し、詳細評価の制約も更新
-- Date: 2025-11-05

-- ========================================================================
-- 1. 既存データの変換（2→1、4→5、3→3、5→5）
-- ========================================================================

-- user_reviews: overall_ratingの変換
UPDATE user_reviews
SET overall_rating = CASE
    WHEN overall_rating = 2 THEN 1  -- 2点 → 1点（悪い）
    WHEN overall_rating = 4 THEN 5  -- 4点 → 5点（良い）
    WHEN overall_rating IN (1, 3, 5) THEN overall_rating  -- 既に正しい値はそのまま
    ELSE overall_rating
END
WHERE overall_rating IN (2, 4);

-- user_reviews: 詳細評価の変換（punctuality_rating, communication_rating, professionalism_rating, cooperation_rating）
UPDATE user_reviews
SET 
    punctuality_rating = CASE
        WHEN punctuality_rating = 2 THEN 1
        WHEN punctuality_rating = 4 THEN 5
        WHEN punctuality_rating IN (1, 3, 5) THEN punctuality_rating
        ELSE punctuality_rating
    END,
    communication_rating = CASE
        WHEN communication_rating = 2 THEN 1
        WHEN communication_rating = 4 THEN 5
        WHEN communication_rating IN (1, 3, 5) THEN communication_rating
        ELSE communication_rating
    END,
    professionalism_rating = CASE
        WHEN professionalism_rating = 2 THEN 1
        WHEN professionalism_rating = 4 THEN 5
        WHEN professionalism_rating IN (1, 3, 5) THEN professionalism_rating
        ELSE professionalism_rating
    END,
    cooperation_rating = CASE
        WHEN cooperation_rating = 2 THEN 1
        WHEN cooperation_rating = 4 THEN 5
        WHEN cooperation_rating IN (1, 3, 5) THEN cooperation_rating
        ELSE cooperation_rating
    END
WHERE 
    punctuality_rating IN (2, 4)
    OR communication_rating IN (2, 4)
    OR professionalism_rating IN (2, 4)
    OR cooperation_rating IN (2, 4);

-- photo_session_reviews: overall_ratingの変換
UPDATE photo_session_reviews
SET overall_rating = CASE
    WHEN overall_rating = 2 THEN 1  -- 2点 → 1点（悪い）
    WHEN overall_rating = 4 THEN 5  -- 4点 → 5点（良い）
    WHEN overall_rating IN (1, 3, 5) THEN overall_rating  -- 既に正しい値はそのまま
    ELSE overall_rating
END
WHERE overall_rating IN (2, 4);

-- photo_session_reviews: 詳細評価の変換（organization_rating, communication_rating, value_rating, venue_rating）
UPDATE photo_session_reviews
SET 
    organization_rating = CASE
        WHEN organization_rating = 2 THEN 1
        WHEN organization_rating = 4 THEN 5
        WHEN organization_rating IN (1, 3, 5) THEN organization_rating
        ELSE organization_rating
    END,
    communication_rating = CASE
        WHEN communication_rating = 2 THEN 1
        WHEN communication_rating = 4 THEN 5
        WHEN communication_rating IN (1, 3, 5) THEN communication_rating
        ELSE communication_rating
    END,
    value_rating = CASE
        WHEN value_rating = 2 THEN 1
        WHEN value_rating = 4 THEN 5
        WHEN value_rating IN (1, 3, 5) THEN value_rating
        ELSE value_rating
    END,
    venue_rating = CASE
        WHEN venue_rating = 2 THEN 1
        WHEN venue_rating = 4 THEN 5
        WHEN venue_rating IN (1, 3, 5) THEN venue_rating
        ELSE venue_rating
    END
WHERE 
    organization_rating IN (2, 4)
    OR communication_rating IN (2, 4)
    OR value_rating IN (2, 4)
    OR venue_rating IN (2, 4);

-- ========================================================================
-- 2. 詳細評価の制約を1、3、5のみに制限
-- ========================================================================

-- user_reviews: 既存の制約を削除
ALTER TABLE user_reviews
DROP CONSTRAINT IF EXISTS user_reviews_communication_rating_check;

ALTER TABLE user_reviews
DROP CONSTRAINT IF EXISTS user_reviews_cooperation_rating_check;

ALTER TABLE user_reviews
DROP CONSTRAINT IF EXISTS user_reviews_professionalism_rating_check;

ALTER TABLE user_reviews
DROP CONSTRAINT IF EXISTS user_reviews_punctuality_rating_check;

-- user_reviews: 新しい制約を追加（1、3、5のみ）
ALTER TABLE user_reviews
ADD CONSTRAINT user_reviews_communication_rating_check 
CHECK (communication_rating IS NULL OR communication_rating IN (1, 3, 5));

ALTER TABLE user_reviews
ADD CONSTRAINT user_reviews_cooperation_rating_check 
CHECK (cooperation_rating IS NULL OR cooperation_rating IN (1, 3, 5));

ALTER TABLE user_reviews
ADD CONSTRAINT user_reviews_professionalism_rating_check 
CHECK (professionalism_rating IS NULL OR professionalism_rating IN (1, 3, 5));

ALTER TABLE user_reviews
ADD CONSTRAINT user_reviews_punctuality_rating_check 
CHECK (punctuality_rating IS NULL OR punctuality_rating IN (1, 3, 5));

-- photo_session_reviews: 既存の制約を削除
ALTER TABLE photo_session_reviews
DROP CONSTRAINT IF EXISTS photo_session_reviews_communication_rating_check;

ALTER TABLE photo_session_reviews
DROP CONSTRAINT IF EXISTS photo_session_reviews_organization_rating_check;

ALTER TABLE photo_session_reviews
DROP CONSTRAINT IF EXISTS photo_session_reviews_value_rating_check;

ALTER TABLE photo_session_reviews
DROP CONSTRAINT IF EXISTS photo_session_reviews_venue_rating_check;

-- photo_session_reviews: 新しい制約を追加（1、3、5のみ）
ALTER TABLE photo_session_reviews
ADD CONSTRAINT photo_session_reviews_communication_rating_check 
CHECK (communication_rating IS NULL OR communication_rating IN (1, 3, 5));

ALTER TABLE photo_session_reviews
ADD CONSTRAINT photo_session_reviews_organization_rating_check 
CHECK (organization_rating IS NULL OR organization_rating IN (1, 3, 5));

ALTER TABLE photo_session_reviews
ADD CONSTRAINT photo_session_reviews_value_rating_check 
CHECK (value_rating IS NULL OR value_rating IN (1, 3, 5));

ALTER TABLE photo_session_reviews
ADD CONSTRAINT photo_session_reviews_venue_rating_check 
CHECK (venue_rating IS NULL OR venue_rating IN (1, 3, 5));

-- ========================================================================
-- 3. overall_ratingの制約確認（既に存在する場合はスキップ）
-- ========================================================================

-- user_reviews: overall_ratingの制約は既に存在するはずだが、念のため確認
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_user_review_overall_rating_values'
        AND conrelid = 'public.user_reviews'::regclass
    ) THEN
        ALTER TABLE user_reviews
        ADD CONSTRAINT check_user_review_overall_rating_values 
        CHECK (overall_rating IN (1, 3, 5));
    END IF;
END $$;

-- photo_session_reviews: overall_ratingの制約は既に存在するはずだが、念のため確認
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_overall_rating_values'
        AND conrelid = 'public.photo_session_reviews'::regclass
    ) THEN
        ALTER TABLE photo_session_reviews
        ADD CONSTRAINT check_overall_rating_values 
        CHECK (overall_rating IN (1, 3, 5));
    END IF;
END $$;

-- ========================================================================
-- 4. 古いoverall_rating_check制約の削除（1-5の範囲制約を削除）
-- ========================================================================

-- user_reviews: 古い範囲制約を削除（IN (1, 3, 5)の制約と競合するため）
ALTER TABLE user_reviews
DROP CONSTRAINT IF EXISTS user_reviews_overall_rating_check;

-- photo_session_reviews: 古い範囲制約を削除（IN (1, 3, 5)の制約と競合するため）
ALTER TABLE photo_session_reviews
DROP CONSTRAINT IF EXISTS photo_session_reviews_overall_rating_check;


