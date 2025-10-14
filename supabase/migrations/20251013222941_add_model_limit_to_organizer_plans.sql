-- Migration: 20251013222941_add_model_limit_to_organizer_plans
-- Description: 運営者向けサブスクリプションプランに所属モデル上限（modelLimit）を追加
-- Date: 2025-10-13

-- 運営者向けプランのtype_specific_featuresにmodelLimitを追加

-- フリープラン: 所属モデル上限 3名
UPDATE subscription_plans 
SET type_specific_features = jsonb_set(
  type_specific_features, 
  '{modelLimit}', 
  '3'
)
WHERE id = 'organizer_free';

-- スタンダードプラン: 所属モデル上限 15名
UPDATE subscription_plans 
SET type_specific_features = jsonb_set(
  type_specific_features, 
  '{modelLimit}', 
  '15'
)
WHERE id = 'organizer_standard';

-- プロフェッショナルプラン: 所属モデル上限 無制限（-1）
UPDATE subscription_plans 
SET type_specific_features = jsonb_set(
  type_specific_features, 
  '{modelLimit}', 
  '-1'
)
WHERE id = 'organizer_professional';

-- 更新日時を現在時刻に設定
UPDATE subscription_plans 
SET updated_at = NOW()
WHERE user_type = 'organizer';


