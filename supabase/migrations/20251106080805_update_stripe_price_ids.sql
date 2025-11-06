-- Migration: 20251106080805_update_stripe_price_ids
-- Description: Stripe Price IDを実際のStripe Price IDに更新
-- Date: 2025-11-06

-- =============================================================================
-- Stripe Price ID更新（実際のStripe Price IDに合わせる）
-- =============================================================================

-- モデル向けプラン
UPDATE subscription_plans
SET stripe_price_id = 'price_1S4UkKCd2Jufj36inzI49x8c'
WHERE id = 'model_basic' AND stripe_price_id != 'price_1S4UkKCd2Jufj36inzI49x8c';

UPDATE subscription_plans
SET stripe_price_id = 'price_1S4UkQCd2Jufj36ir6P2n3va'
WHERE id = 'model_premium' AND stripe_price_id != 'price_1S4UkQCd2Jufj36ir6P2n3va';

-- カメラマン向けプラン
UPDATE subscription_plans
SET stripe_price_id = 'price_1S4UkVCd2Jufj36iIjDuS0z3'
WHERE id = 'photographer_pro' AND stripe_price_id != 'price_1S4UkVCd2Jufj36iIjDuS0z3';

UPDATE subscription_plans
SET stripe_price_id = 'price_1S4UkbCd2Jufj36iAJxnqH7V'
WHERE id = 'photographer_business' AND stripe_price_id != 'price_1S4UkbCd2Jufj36iAJxnqH7V';

-- 運営者向けプラン
UPDATE subscription_plans
SET stripe_price_id = 'price_1S4UkmCd2Jufj36iUaexS6nx'
WHERE id = 'organizer_standard' AND stripe_price_id != 'price_1S4UkmCd2Jufj36iUaexS6nx';

UPDATE subscription_plans
SET stripe_price_id = 'price_1S4UkrCd2Jufj36iHDnjC4j4'
WHERE id = 'organizer_professional' AND stripe_price_id != 'price_1S4UkrCd2Jufj36iHDnjC4j4';

-- 更新確認用コメント
-- 更新されるPrice ID:
-- - model_basic: price_1S4UkKCd2Jufj36inzI49x8c (680円)
-- - model_premium: price_1S4UkQCd2Jufj36ir6P2n3va (1280円)
-- - photographer_pro: price_1S4UkVCd2Jufj36iIjDuS0z3 (980円)
-- - photographer_business: price_1S4UkbCd2Jufj36iAJxnqH7V (1980円)
-- - organizer_standard: price_1S4UkmCd2Jufj36iUaexS6nx (1480円)
-- - organizer_professional: price_1S4UkrCd2Jufj36iHDnjC4j4 (2980円)


