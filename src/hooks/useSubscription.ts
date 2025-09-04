'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getCurrentSubscription,
  getPlansForUserType,
  checkFeatureLimit,
  type SubscriptionPlan,
  type UserSubscription,
  type FeatureLimitCheck,
} from '@/app/actions/subscription-management';
import { logger } from '@/lib/utils/logger';

/**
 * サブスクリプション管理用のカスタムフック
 * Phase 1: 基本的なプラン管理と機能制限チェック
 */
export function useSubscription() {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] =
    useState<UserSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * サブスクリプション情報を読み込む
   */
  const loadSubscriptionData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 現在のサブスクリプション情報を取得
      const subscription = await getCurrentSubscription(user.id);
      setCurrentSubscription(subscription);

      // ユーザータイプに対応するプラン一覧を取得
      if (user.user_metadata?.user_type) {
        const plans = await getPlansForUserType(user.user_metadata.user_type);
        setAvailablePlans(plans);
      }

      logger.debug('Subscription data loaded', {
        userId: user.id,
        hasSubscription: !!subscription,
        planCount: availablePlans.length,
      });
    } catch (error) {
      logger.error('Error loading subscription data:', error);
      setError('サブスクリプション情報の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [user, availablePlans.length]);

  /**
   * 機能制限をチェックする
   */
  const checkLimit = useCallback(
    async (
      featureName: string,
      currentUsage: number = 0
    ): Promise<FeatureLimitCheck> => {
      if (!user) {
        return {
          allowed: false,
          current_usage: 0,
          limit: 0,
          remaining: 0,
          plan_name: 'ログインが必要です',
        };
      }

      try {
        return await checkFeatureLimit(user.id, featureName, currentUsage);
      } catch (error) {
        logger.error('Error checking feature limit:', error);
        return {
          allowed: false,
          current_usage: currentUsage,
          limit: 0,
          remaining: 0,
          plan_name: 'エラー',
        };
      }
    },
    [user]
  );

  /**
   * 現在のプランが特定の機能を利用可能かチェック
   */
  const hasFeature = useCallback(
    (featureName: string): boolean => {
      if (!currentSubscription?.plan) {
        return false;
      }

      const allFeatures = {
        ...currentSubscription.plan.base_features,
        ...currentSubscription.plan.type_specific_features,
      };

      return allFeatures[featureName] === true;
    },
    [currentSubscription]
  );

  /**
   * プレミアム機能かどうかをチェック
   */
  const isPremiumFeature = useCallback((featureName: string): boolean => {
    // Phase 1: 基本的な判定のみ
    const premiumFeatures = [
      'premiumTemplates',
      'reviewAnalytics',
      'clientManagement',
      'advancedAnalytics',
      'marketingTools',
      'commercialLicense',
    ];

    return premiumFeatures.includes(featureName);
  }, []);

  /**
   * 現在のプラン情報を取得
   */
  const getCurrentPlan = useCallback((): SubscriptionPlan | null => {
    return currentSubscription?.plan || null;
  }, [currentSubscription]);

  /**
   * ユーザーが有料プランかどうか
   */
  const isPaidUser = useCallback((): boolean => {
    return currentSubscription?.plan?.price > 0 || false;
  }, [currentSubscription]);

  // 初回データ読み込み
  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  return {
    // データ
    currentSubscription,
    availablePlans,
    isLoading,
    error,

    // 関数
    loadSubscriptionData,
    checkLimit,
    hasFeature,
    isPremiumFeature,
    getCurrentPlan,
    isPaidUser,

    // 便利なプロパティ
    currentPlan: getCurrentPlan(),
    isFreePlan: !isPaidUser(),
  };
}
