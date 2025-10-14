/**
 * サブスクリプション制限チェック関数
 * 運営者のプランに応じた機能制限を管理する
 */

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

export interface SubscriptionLimits {
  photobookLimit: number;
  sessionLimit: number;
  modelLimit: number;
  storageLimit: number;
  advancedAnalytics: boolean;
  marketingTools: boolean;
  participantCRM: boolean;
  revenueReports: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

export interface ModelLimitCheck {
  currentCount: number;
  limit: number;
  isUnlimited: boolean;
  canInvite: boolean;
  remainingSlots: number;
}

/**
 * ユーザーの現在のサブスクリプション制限を取得する
 */
export async function getUserSubscriptionLimits(
  userId: string
): Promise<SubscriptionLimits | null> {
  try {
    const supabase = createClient();

    // ユーザーのサブスクリプション情報を取得
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select(
        `
        plan_id,
        status,
        subscription_plans (
          base_features,
          type_specific_features
        )
      `
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subscriptionError || !subscription) {
      logger.warn('アクティブなサブスクリプションが見つかりません:', {
        userId,
        error: subscriptionError,
      });
      return null;
    }

    const plan = Array.isArray(subscription.subscription_plans)
      ? subscription.subscription_plans[0]
      : subscription.subscription_plans;

    if (!plan) {
      logger.error('プラン情報が見つかりません:', {
        userId,
        planId: subscription.plan_id,
      });
      return null;
    }

    // 基本機能と特化機能をマージ
    const baseFeatures = plan.base_features || {};
    const typeSpecificFeatures = plan.type_specific_features || {};
    const allFeatures = { ...baseFeatures, ...typeSpecificFeatures };

    return {
      photobookLimit: allFeatures.photobookLimit || 0,
      sessionLimit: allFeatures.sessionLimit || 0,
      modelLimit: allFeatures.modelLimit || 0,
      storageLimit: allFeatures.storageLimit || 0,
      advancedAnalytics: allFeatures.advancedAnalytics || false,
      marketingTools: allFeatures.marketingTools || false,
      participantCRM: allFeatures.participantCRM || false,
      revenueReports: allFeatures.revenueReports || false,
      customBranding: allFeatures.customBranding || false,
      apiAccess: allFeatures.apiAccess || false,
    };
  } catch (error) {
    logger.error('サブスクリプション制限取得エラー:', error);
    return null;
  }
}

/**
 * 運営者の所属モデル制限をチェックする
 */
export async function checkModelLimit(
  organizerId: string
): Promise<ModelLimitCheck> {
  try {
    const supabase = createClient();

    // 現在の所属モデル数を取得
    const { count: currentCount, error: countError } = await supabase
      .from('organizer_models')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', organizerId)
      .eq('status', 'active');

    if (countError) {
      logger.error('所属モデル数取得エラー:', countError);
      throw new Error('所属モデル数の取得に失敗しました');
    }

    // サブスクリプション制限を取得
    const limits = await getUserSubscriptionLimits(organizerId);
    if (!limits) {
      // サブスクリプションがない場合はフリープランとして扱う
      return {
        currentCount: currentCount || 0,
        limit: 3, // フリープランのデフォルト制限
        isUnlimited: false,
        canInvite: (currentCount || 0) < 3,
        remainingSlots: Math.max(0, 3 - (currentCount || 0)),
      };
    }

    const modelLimit = limits.modelLimit;
    const isUnlimited = modelLimit === -1;
    const canInvite = isUnlimited || (currentCount || 0) < modelLimit;
    const remainingSlots = isUnlimited
      ? -1
      : Math.max(0, modelLimit - (currentCount || 0));

    return {
      currentCount: currentCount || 0,
      limit: modelLimit,
      isUnlimited,
      canInvite,
      remainingSlots,
    };
  } catch (error) {
    logger.error('モデル制限チェックエラー:', error);
    throw error;
  }
}

/**
 * 運営者が新しいモデルを招待できるかチェックする
 */
export async function canInviteModel(organizerId: string): Promise<{
  canInvite: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
  isUnlimited: boolean;
}> {
  try {
    const limitCheck = await checkModelLimit(organizerId);

    if (limitCheck.canInvite) {
      return {
        canInvite: true,
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        isUnlimited: limitCheck.isUnlimited,
      };
    }

    const reason = limitCheck.isUnlimited
      ? '予期しないエラーが発生しました'
      : `所属モデル上限（${limitCheck.limit}名）に達しています。より多くのモデルを管理するには、プランをアップグレードしてください。`;

    return {
      canInvite: false,
      reason,
      currentCount: limitCheck.currentCount,
      limit: limitCheck.limit,
      isUnlimited: limitCheck.isUnlimited,
    };
  } catch (error) {
    logger.error('招待可能チェックエラー:', error);
    return {
      canInvite: false,
      reason:
        'システムエラーが発生しました。しばらく時間をおいて再度お試しください。',
      currentCount: 0,
      limit: 0,
      isUnlimited: false,
    };
  }
}

/**
 * プラン名から表示用の制限情報を取得する
 */
export function getPlanLimitDisplay(planId: string): {
  modelLimit: string;
  sessionLimit: string;
} {
  switch (planId) {
    case 'organizer_free':
      return {
        modelLimit: '3名まで',
        sessionLimit: '3件まで',
      };
    case 'organizer_standard':
      return {
        modelLimit: '15名まで',
        sessionLimit: '20件まで',
      };
    case 'organizer_professional':
      return {
        modelLimit: '無制限',
        sessionLimit: '無制限',
      };
    default:
      return {
        modelLimit: '不明',
        sessionLimit: '不明',
      };
  }
}
