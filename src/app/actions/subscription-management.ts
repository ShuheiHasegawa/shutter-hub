'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';
import { logger } from '@/lib/utils/logger';
import type Stripe from 'stripe';

// サブスクリプション関連の型定義
export interface SubscriptionPlan {
  id: string;
  name: string;
  user_type: 'model' | 'photographer' | 'organizer';
  tier: string;
  price: number;
  stripe_price_id: string | null;
  base_features: Record<string, unknown>;
  type_specific_features: Record<string, unknown>;
  description: string | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan?: SubscriptionPlan;
}

export interface FeatureLimitCheck {
  allowed: boolean;
  current_usage: number;
  limit: number;
  remaining: number;
  plan_name: string;
}

/**
 * ユーザータイプに対応するサブスクリプションプランを取得する
 */
export async function getPlansForUserType(
  userType: 'model' | 'photographer' | 'organizer'
): Promise<SubscriptionPlan[]> {
  try {
    const supabase = await createClient();

    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('user_type', userType)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Error fetching subscription plans:', error);
      throw new Error('プラン情報の取得に失敗しました');
    }

    return plans || [];
  } catch (error) {
    logger.error('Error in getPlansForUserType:', error);
    throw error;
  }
}

/**
 * ユーザーの現在のサブスクリプション情報を取得する
 */
export async function getCurrentSubscription(
  userId: string
): Promise<UserSubscription | null> {
  try {
    const supabase = await createClient();

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(
        `
        *,
        plan:subscription_plans(*)
      `
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = No rows found
      logger.error('Error fetching user subscription:', error);
      throw new Error('サブスクリプション情報の取得に失敗しました');
    }

    return subscription || null;
  } catch (error) {
    logger.error('Error in getCurrentSubscription:', error);
    return null;
  }
}

/**
 * 機能制限をチェックする（Phase 1: 基本機能のみ）
 */
export async function checkFeatureLimit(
  userId: string,
  featureName: string,
  currentUsage: number = 0
): Promise<FeatureLimitCheck> {
  try {
    const supabase = await createClient();

    // データベース関数を使用して制限チェック
    const { data: result, error } = await supabase.rpc('check_feature_limit', {
      user_uuid: userId,
      feature_name: featureName,
      current_usage: currentUsage,
    });

    if (error) {
      logger.error('Error checking feature limit:', error);
      // エラー時はフリープランの制限を適用
      return {
        allowed: currentUsage < 3, // 基本的な制限
        current_usage: currentUsage,
        limit: 3,
        remaining: Math.max(0, 3 - currentUsage),
        plan_name: 'フリープラン（エラー時）',
      };
    }

    if (result && result.length > 0) {
      const check = result[0];
      return {
        allowed: check.allowed,
        current_usage: check.current_usage_count,
        limit: check.limit_value,
        remaining: check.remaining,
        plan_name: check.plan_name,
      };
    }

    // デフォルトの制限
    return {
      allowed: currentUsage < 3,
      current_usage: currentUsage,
      limit: 3,
      remaining: Math.max(0, 3 - currentUsage),
      plan_name: 'フリープラン',
    };
  } catch (error) {
    logger.error('Error in checkFeatureLimit:', error);
    return {
      allowed: false,
      current_usage: currentUsage,
      limit: 0,
      remaining: 0,
      plan_name: 'エラー',
    };
  }
}

/**
 * 機能使用量を記録する
 */
export async function recordFeatureUsage(
  userId: string,
  featureName: string,
  incrementAmount: number = 1
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc('record_feature_usage', {
      user_uuid: userId,
      feature_name: featureName,
      increment_amount: incrementAmount,
    });

    if (error) {
      logger.error('Error recording feature usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in recordFeatureUsage:', error);
    return false;
  }
}

/**
 * Stripe Customer作成またはIDを取得する
 */
export async function createOrGetStripeCustomer(
  userId: string,
  userEmail: string,
  userName?: string
): Promise<string> {
  try {
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    // 既存のCustomerを検索
    const existingCustomers = await stripe.customers.search({
      query: `metadata['user_id']:'${userId}'`,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0].id;
    }

    // 新規Customer作成
    const customer = await stripe.customers.create({
      email: userEmail,
      name: userName || undefined,
      metadata: {
        user_id: userId,
        created_at: new Date().toISOString(),
      },
    });

    logger.info('Stripe customer created', {
      customerId: customer.id,
      userId,
    });

    return customer.id;
  } catch (error) {
    logger.error('Error creating Stripe customer:', error);
    throw new Error('Stripe顧客の作成に失敗しました');
  }
}

/**
 * サブスクリプション作成（Phase 1: 基本実装）
 */
export async function createSubscription(
  userId: string,
  planId: string,
  paymentMethodId?: string
): Promise<{
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  error?: string;
}> {
  try {
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    const supabase = await createClient();

    // プラン情報取得
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      logger.error('Plan not found:', { planId, error: planError });
      return { success: false, error: 'プランが見つかりません' };
    }

    if (!plan.stripe_price_id) {
      logger.error('No Stripe price ID for plan:', { planId });
      return { success: false, error: 'このプランは決済対象外です' };
    }

    // ユーザー情報取得
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('email, display_name, user_type')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      logger.error('User not found:', { userId, error: userError });
      return { success: false, error: 'ユーザー情報が見つかりません' };
    }

    // ユーザータイプとプランの整合性チェック
    if (userProfile.user_type !== plan.user_type) {
      logger.error('Plan type mismatch:', {
        userType: userProfile.user_type,
        planType: plan.user_type,
      });
      return {
        success: false,
        error: 'このプランはあなたのユーザータイプに対応していません',
      };
    }

    // Stripe Customer作成/取得
    const customerId = await createOrGetStripeCustomer(
      userId,
      userProfile.email,
      userProfile.display_name || undefined
    );

    // Subscription作成
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: plan.stripe_price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        user_id: userId,
        plan_id: planId,
        user_type: plan.user_type,
      },
    };

    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Phase 1: データベース保存はWebhookで処理
    // 決済完了後にWebhookでuser_subscriptionsテーブルに保存される

    // latest_invoiceとpayment_intentの詳細ログ
    logger.info('Subscription created with details', {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      latest_invoice: subscription.latest_invoice,
      expand: subscriptionParams.expand,
    });

    // Stripe APIレスポンス全体をログ出力（デバッグ用）
    logger.info('Full subscription object', {
      subscription: JSON.stringify(subscription, null, 2),
    });

    const invoice = subscription.latest_invoice as unknown as {
      payment_intent?: { client_secret?: string };
    };
    const paymentIntent = invoice?.payment_intent;
    const clientSecret = paymentIntent?.client_secret;

    logger.info('Payment intent details', {
      hasInvoice: !!invoice,
      hasPaymentIntent: !!paymentIntent,
      clientSecret: clientSecret ? 'present' : 'missing',
    });

    if (!clientSecret) {
      logger.warn(
        'Client secret not found in subscription, creating separate Payment Intent',
        {
          invoice,
          paymentIntent,
          subscriptionStatus: subscription.status,
        }
      );

      // 代替方法: 別途Payment Intentを作成
      try {
        const paymentIntentParams = {
          amount: plan.price * 100, // 円をセント単位に変換
          currency: 'jpy',
          customer: customerId,
          setup_future_usage: 'off_session' as const,
          metadata: {
            subscription_id: subscription.id,
            user_id: userId,
            plan_id: planId,
          },
        };

        const separatePaymentIntent =
          await stripe.paymentIntents.create(paymentIntentParams);

        logger.info('Separate Payment Intent created', {
          paymentIntentId: separatePaymentIntent.id,
          clientSecret: separatePaymentIntent.client_secret
            ? 'present'
            : 'missing',
        });

        return {
          success: true,
          subscriptionId: subscription.id,
          clientSecret: separatePaymentIntent.client_secret || undefined,
        };
      } catch (paymentIntentError) {
        logger.error(
          'Failed to create separate Payment Intent',
          paymentIntentError
        );

        // サブスクリプションをキャンセル
        await stripe.subscriptions.cancel(subscription.id);

        return {
          success: false,
          error: 'Payment Intent作成に失敗しました',
        };
      }
    }

    logger.info('Subscription created successfully', {
      subscriptionId: subscription.id,
      userId,
      planId,
      hasClientSecret: !!clientSecret,
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
    };
  } catch (error) {
    logger.error('Error creating subscription:', error);
    return {
      success: false,
      error: 'サブスクリプションの作成に失敗しました',
    };
  }
}

/**
 * サブスクリプションキャンセル
 */
export async function cancelSubscription(
  userId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    const supabase = await createClient();

    // 現在のサブスクリプション取得
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      logger.error('Active subscription not found:', {
        userId,
        error: subError,
      });
      return {
        success: false,
        error: 'アクティブなサブスクリプションが見つかりません',
      };
    }

    if (!subscription.stripe_subscription_id) {
      logger.error('No Stripe subscription ID:', {
        userId,
        subscriptionId: subscription.id,
      });
      return { success: false, error: 'Stripe連携情報が見つかりません' };
    }

    // Stripeでキャンセル
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: cancelAtPeriodEnd,
      metadata: {
        cancelled_by_user: 'true',
        cancelled_at: new Date().toISOString(),
      },
    });

    // データベース更新
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: cancelAtPeriodEnd,
        cancelled_at: cancelAtPeriodEnd ? null : new Date().toISOString(),
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      logger.error('Error updating subscription in database:', updateError);
      return { success: false, error: 'データベース更新に失敗しました' };
    }

    logger.info('Subscription cancelled successfully', {
      subscriptionId: subscription.id,
      userId,
      cancelAtPeriodEnd,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    return {
      success: false,
      error: 'サブスクリプションのキャンセルに失敗しました',
    };
  }
}
