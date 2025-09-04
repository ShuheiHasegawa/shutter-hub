-- Migration: 20250904222727_create_subscription_system
-- Description: サブスクリプションシステム基盤構築（Phase 1: 基本仕組み優先）
-- Date: 2025-09-04

-- =============================================================================
-- サブスクリプションプランテーブル
-- =============================================================================

-- サブスクリプションプランテーブル
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY, -- 例: 'model_basic', 'photographer_pro'
  name TEXT NOT NULL, -- 例: 'モデル ベーシックプラン'
  user_type user_type NOT NULL, -- 'model', 'photographer', 'organizer'
  tier TEXT NOT NULL, -- 'free', 'basic', 'premium', 'pro', 'business', 'professional'
  price INTEGER NOT NULL, -- 月額料金（円）
  stripe_price_id TEXT, -- Stripe Price ID（freeプランはNULL）
  base_features JSONB NOT NULL, -- 共通機能設定
  type_specific_features JSONB NOT NULL, -- ユーザータイプ特化機能
  is_active BOOLEAN DEFAULT TRUE, -- プランの有効性
  display_order INTEGER DEFAULT 0, -- 表示順序
  description TEXT, -- プラン説明
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  UNIQUE(user_type, tier),
  CHECK (price >= 0),
  CHECK (tier IN ('free', 'basic', 'premium', 'pro', 'business', 'professional'))
);

-- =============================================================================
-- ユーザーサブスクリプションテーブル
-- =============================================================================

-- ユーザーサブスクリプションテーブル
CREATE TABLE user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES subscription_plans(id) NOT NULL,
  
  -- Stripe連携情報
  stripe_subscription_id TEXT UNIQUE, -- Stripe Subscription ID
  stripe_customer_id TEXT, -- Stripe Customer ID
  stripe_payment_method_id TEXT, -- デフォルト支払い方法
  
  -- サブスクリプション状態
  status TEXT DEFAULT 'active' NOT NULL,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- メタデータ
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  UNIQUE(user_id), -- 1ユーザー1サブスクリプション
  CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing', 'incomplete'))
);

-- =============================================================================
-- サブスクリプション変更履歴テーブル
-- =============================================================================

-- サブスクリプション変更履歴テーブル
CREATE TABLE subscription_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  
  -- 変更内容
  change_type TEXT NOT NULL, -- 'upgrade', 'downgrade', 'cancel', 'reactivate', 'user_type_change'
  from_plan_id TEXT REFERENCES subscription_plans(id),
  to_plan_id TEXT REFERENCES subscription_plans(id),
  
  -- 変更理由・詳細
  change_reason TEXT,
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  proration_amount INTEGER, -- 日割り計算額（円）
  
  -- Stripe関連
  stripe_invoice_id TEXT,
  stripe_proration_date TIMESTAMP WITH TIME ZONE,
  
  -- メタデータ
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CHECK (change_type IN ('upgrade', 'downgrade', 'cancel', 'reactivate', 'user_type_change', 'plan_switch'))
);

-- =============================================================================
-- 使用量追跡テーブル（Phase 1: 基本機能制限用）
-- =============================================================================

-- 使用量追跡テーブル
CREATE TABLE subscription_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  
  -- 使用量データ
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  usage_data JSONB NOT NULL, -- 使用量の詳細データ
  
  -- 制限チェック用
  limits_data JSONB NOT NULL, -- その期間の制限値
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  UNIQUE(user_id, period_start, period_end)
);

-- =============================================================================
-- インデックス設定
-- =============================================================================

-- パフォーマンス最適化用インデックス
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- 複合インデックス（よく使われる組み合わせ）
CREATE INDEX idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX idx_subscription_plans_type_tier ON subscription_plans(user_type, tier);
CREATE INDEX idx_subscription_changes_user_date ON subscription_changes(user_id, effective_date DESC);

-- 部分インデックス（アクティブなサブスクリプションのみ）
CREATE INDEX idx_active_subscriptions ON user_subscriptions(user_id, plan_id) 
WHERE status = 'active';

-- JSONB用のGINインデックス
CREATE INDEX idx_subscription_plans_features ON subscription_plans USING GIN (base_features);
CREATE INDEX idx_subscription_plans_type_features ON subscription_plans USING GIN (type_specific_features);

-- =============================================================================
-- RLS (Row Level Security) ポリシー
-- =============================================================================

-- subscription_plans テーブル（全員読み取り可能、管理者のみ更新可能）
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがプラン情報を閲覧可能
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 管理者のみプラン管理可能
CREATE POLICY "Admins can manage subscription plans" ON subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'organizer' -- 管理者権限は別途実装予定
    )
  );

-- user_subscriptions テーブル
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のサブスクリプション情報のみ閲覧・更新可能
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理者は全てのサブスクリプション情報にアクセス可能
CREATE POLICY "Admins can manage all subscriptions" ON user_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'organizer' -- 管理者権限は別途実装予定
    )
  );

-- subscription_changes テーブル
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;

-- 読み取り専用（ユーザーは自分の履歴のみ閲覧可能）
CREATE POLICY "Users can view own subscription changes" ON subscription_changes
  FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全ての履歴にアクセス可能
CREATE POLICY "Admins can view all subscription changes" ON subscription_changes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'organizer' -- 管理者権限は別途実装予定
    )
  );

-- subscription_usage テーブル
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の使用量データのみ閲覧可能
CREATE POLICY "Users can view own usage data" ON subscription_usage
  FOR SELECT USING (auth.uid() = user_id);

-- システムによる使用量データの挿入・更新
CREATE POLICY "System can manage usage data" ON subscription_usage
  FOR ALL USING (true); -- Server Actions経由での操作

-- =============================================================================
-- トリガー・関数
-- =============================================================================

-- updated_at自動更新トリガー
CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at 
  BEFORE UPDATE ON subscription_usage 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サブスクリプション変更履歴記録関数
CREATE OR REPLACE FUNCTION record_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- プラン変更時のみ履歴記録
  IF OLD.plan_id != NEW.plan_id THEN
    INSERT INTO subscription_changes (
      user_id, subscription_id, change_type, 
      from_plan_id, to_plan_id, effective_date
    ) VALUES (
      NEW.user_id, NEW.id, 
      CASE 
        WHEN NEW.plan_id LIKE '%premium%' OR NEW.plan_id LIKE '%pro%' THEN 'upgrade'
        WHEN NEW.plan_id LIKE '%free%' THEN 'downgrade'
        ELSE 'plan_switch'
      END,
      OLD.plan_id, NEW.plan_id, NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_subscription_changes
  AFTER UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION record_subscription_change();

-- ユーザーの現在のプラン取得関数
CREATE OR REPLACE FUNCTION get_user_current_plan(user_uuid UUID)
RETURNS TABLE(
  plan_id TEXT,
  plan_name TEXT,
  user_type user_type,
  tier TEXT,
  features JSONB,
  status TEXT,
  period_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    sp.user_type,
    sp.tier,
    sp.base_features || sp.type_specific_features AS features,
    COALESCE(us.status, 'free') AS status,
    us.current_period_end
  FROM profiles p
  LEFT JOIN user_subscriptions us ON p.id = us.user_id AND us.status = 'active'
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE p.id = user_uuid
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
