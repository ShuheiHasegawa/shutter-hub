-- Migration: 20250904222728_insert_initial_subscription_plans
-- Description: サブスクリプションプラン初期データ投入（Phase 1: 基本プランのみ）
-- Date: 2025-09-04

-- =============================================================================
-- Phase 1: 基本プラン定義（詳細機能は後回し）
-- =============================================================================

-- モデル向けプラン
INSERT INTO subscription_plans (id, name, user_type, tier, price, stripe_price_id, base_features, type_specific_features, display_order, description) VALUES
('model_free', 'モデル フリープラン', 'model', 'free', 0, NULL, 
 '{"photobookLimit": 2, "premiumTemplates": false, "exportQuality": "standard", "prioritySupport": false, "storageLimit": 1000}',
 '{"portfolioLimit": 10, "priorityBookingTickets": 0, "reviewAnalytics": false, "profileBoost": false, "premiumBadge": false}',
 0, '基本機能を無料でご利用いただけます'),

('model_basic', 'モデル ベーシックプラン', 'model', 'basic', 680, 'price_1S3dE9Cd2Jufj36iMEXaqD7N',
 '{"photobookLimit": 10, "premiumTemplates": true, "exportQuality": "high", "prioritySupport": false, "storageLimit": 3000}',
 '{"portfolioLimit": 50, "priorityBookingTickets": 2, "reviewAnalytics": true, "profileBoost": true, "premiumBadge": false}',
 1, 'ポートフォリオ拡張と優先予約機能'),

('model_premium', 'モデル プレミアムプラン', 'model', 'premium', 1280, 'price_1S3dEECd2Jufj36iRTPOFd2k',
 '{"photobookLimit": -1, "premiumTemplates": true, "exportQuality": "ultra", "prioritySupport": true, "storageLimit": 10000}',
 '{"portfolioLimit": -1, "priorityBookingTickets": 5, "reviewAnalytics": true, "profileBoost": true, "premiumBadge": true}',
 2, '無制限利用とプレミアムサポート');

-- カメラマン向けプラン
INSERT INTO subscription_plans (id, name, user_type, tier, price, stripe_price_id, base_features, type_specific_features, display_order, description) VALUES
('photographer_free', 'カメラマン フリープラン', 'photographer', 'free', 0, NULL,
 '{"photobookLimit": 3, "premiumTemplates": false, "exportQuality": "standard", "prioritySupport": false, "storageLimit": 1000}',
 '{"clientManagement": false, "advancedPortfolio": false, "commercialLicense": false, "watermarkRemoval": false, "brandingCustomization": false}',
 0, '基本機能を無料でご利用いただけます'),

('photographer_pro', 'カメラマン プロプラン', 'photographer', 'pro', 980, 'price_1S3dEJCd2Jufj36iwtGgnsiU',
 '{"photobookLimit": 20, "premiumTemplates": true, "exportQuality": "high", "prioritySupport": false, "storageLimit": 5000}',
 '{"clientManagement": true, "advancedPortfolio": true, "commercialLicense": false, "watermarkRemoval": true, "brandingCustomization": false}',
 1, 'クライアント管理と透かし除去機能'),

('photographer_business', 'カメラマン ビジネスプラン', 'photographer', 'business', 1980, 'price_1S3dEOCd2Jufj36ik7EtX3Hg',
 '{"photobookLimit": -1, "premiumTemplates": true, "exportQuality": "ultra", "prioritySupport": true, "storageLimit": 20000}',
 '{"clientManagement": true, "advancedPortfolio": true, "commercialLicense": true, "watermarkRemoval": true, "brandingCustomization": true}',
 2, '商用利用とブランディング機能');

-- 運営者向けプラン
INSERT INTO subscription_plans (id, name, user_type, tier, price, stripe_price_id, base_features, type_specific_features, display_order, description) VALUES
('organizer_free', '運営者 フリープラン', 'organizer', 'free', 0, NULL,
 '{"photobookLimit": 3, "premiumTemplates": false, "exportQuality": "standard", "prioritySupport": false, "storageLimit": 1000}',
 '{"sessionLimit": 3, "advancedAnalytics": false, "marketingTools": false, "participantCRM": false, "revenueReports": false}',
 0, '基本機能を無料でご利用いただけます'),

('organizer_standard', '運営者 スタンダードプラン', 'organizer', 'standard', 1480, 'price_1S3dEUCd2Jufj36ipGmfpuYL',
 '{"photobookLimit": 15, "premiumTemplates": true, "exportQuality": "high", "prioritySupport": false, "storageLimit": 5000}',
 '{"sessionLimit": 20, "advancedAnalytics": true, "marketingTools": false, "participantCRM": true, "revenueReports": true}',
 1, '分析機能とCRM機能'),

('organizer_professional', '運営者 プロフェッショナルプラン', 'organizer', 'professional', 2980, 'price_1S3dEZCd2Jufj36iluefbRXc',
 '{"photobookLimit": -1, "premiumTemplates": true, "exportQuality": "ultra", "prioritySupport": true, "storageLimit": 50000}',
 '{"sessionLimit": -1, "advancedAnalytics": true, "marketingTools": true, "participantCRM": true, "revenueReports": true, "customBranding": true, "apiAccess": true}',
 2, 'マーケティングツールとAPI機能');

-- =============================================================================
-- Phase 1: 基本的な権限チェック関数
-- =============================================================================

-- 機能制限チェック関数（Phase 1: 基本機能のみ）
CREATE OR REPLACE FUNCTION check_feature_limit(
  user_uuid UUID,
  feature_name TEXT,
  current_usage INTEGER DEFAULT 0
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_usage_count INTEGER,
  limit_value INTEGER,
  remaining INTEGER,
  plan_name TEXT
) AS $$
DECLARE
  user_plan RECORD;
  feature_limit INTEGER;
BEGIN
  -- ユーザーの現在のプラン情報を取得
  SELECT * INTO user_plan FROM get_user_current_plan(user_uuid);
  
  -- プランが見つからない場合はフリープランとして扱う
  IF user_plan IS NULL THEN
    SELECT sp.* INTO user_plan 
    FROM subscription_plans sp 
    JOIN profiles p ON p.user_type = sp.user_type
    WHERE p.id = user_uuid AND sp.tier = 'free'
    LIMIT 1;
  END IF;
  
  -- 機能制限値を取得
  SELECT COALESCE(
    (user_plan.features->feature_name)::INTEGER,
    0
  ) INTO feature_limit;
  
  -- -1は無制限を意味
  IF feature_limit = -1 THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      current_usage,
      -1,
      999999,
      user_plan.plan_name;
  ELSE
    RETURN QUERY SELECT 
      (current_usage < feature_limit)::BOOLEAN,
      current_usage,
      feature_limit,
      GREATEST(0, feature_limit - current_usage),
      user_plan.plan_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 使用量記録関数
CREATE OR REPLACE FUNCTION record_feature_usage(
  user_uuid UUID,
  feature_name TEXT,
  increment_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_period_start TIMESTAMP WITH TIME ZONE;
  current_period_end TIMESTAMP WITH TIME ZONE;
  existing_usage RECORD;
BEGIN
  -- 現在の課金期間を計算
  current_period_start := date_trunc('month', NOW());
  current_period_end := current_period_start + INTERVAL '1 month';
  
  -- 既存の使用量レコードを確認
  SELECT * INTO existing_usage 
  FROM subscription_usage 
  WHERE user_id = user_uuid 
    AND period_start = current_period_start 
    AND period_end = current_period_end;
  
  IF existing_usage IS NULL THEN
    -- 新規レコード作成
    INSERT INTO subscription_usage (
      user_id, period_start, period_end, 
      usage_data, limits_data
    ) VALUES (
      user_uuid, current_period_start, current_period_end,
      jsonb_build_object(feature_name, increment_amount),
      '{}'::JSONB
    );
  ELSE
    -- 既存レコード更新
    UPDATE subscription_usage 
    SET 
      usage_data = jsonb_set(
        usage_data, 
        ARRAY[feature_name], 
        to_jsonb(COALESCE((usage_data->>feature_name)::INTEGER, 0) + increment_amount)
      ),
      updated_at = NOW()
    WHERE id = existing_usage.id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
