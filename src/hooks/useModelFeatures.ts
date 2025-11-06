'use client';

import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

/**
 * モデル向け機能制限フック
 * モデルユーザー専用の機能制限を型安全に提供
 */
export function useModelFeatures() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const subscription = useSubscription();

  // モデルユーザーかどうかをチェック
  const isModel = useMemo(() => {
    if (!user || !profile) return false;
    return profile.user_type === 'model';
  }, [user, profile]);

  // ポートフォリオ写真アップロード制限
  const portfolioLimit = useMemo(() => {
    if (!subscription.currentPlan) return 10; // フリープランのデフォルト

    const typeFeatures = subscription.currentPlan.type_specific_features || {};
    const limit = typeFeatures.portfolioLimit as number | undefined;

    if (limit === undefined) return 10;
    if (limit === -1) return Infinity; // 無制限
    return limit;
  }, [subscription.currentPlan]);

  // 優先予約チケット数
  const priorityBookingTickets = useMemo(() => {
    if (!subscription.currentPlan) return 0;

    const typeFeatures = subscription.currentPlan.type_specific_features || {};
    const tickets = typeFeatures.priorityBookingTickets as number | undefined;

    return tickets ?? 0;
  }, [subscription.currentPlan]);

  // 評価分析機能の利用可否
  const canAccessReviewAnalytics = useMemo(() => {
    return subscription.hasFeature('reviewAnalytics');
  }, [subscription]);

  // プロフィール強化機能の利用可否
  const canUseProfileBoost = useMemo(() => {
    return subscription.hasFeature('profileBoost');
  }, [subscription]);

  // プレミアムバッジ表示の可否
  const canShowPremiumBadge = useMemo(() => {
    return subscription.hasFeature('premiumBadge');
  }, [subscription]);

  // プライベートギャラリー機能の利用可否
  const canUsePrivateGallery = useMemo(() => {
    // フリープランでは利用不可、Basic以上で利用可能
    return subscription.isPaidUser();
  }, [subscription]);

  // ポートフォリオ写真アップロード制限チェック
  const checkPortfolioUploadLimit = async (currentCount: number) => {
    return await subscription.checkLimit('portfolioLimit', currentCount);
  };

  // 優先予約チケット使用可否チェック
  const canUsePriorityBooking = useMemo(() => {
    return priorityBookingTickets > 0;
  }, [priorityBookingTickets]);

  // プレミアムテンプレート利用可否
  const canUsePremiumTemplates = useMemo(() => {
    return subscription.hasFeature('premiumTemplates');
  }, [subscription]);

  // 高品質エクスポート利用可否
  const canUseHighQualityExport = useMemo(() => {
    const exportQuality = subscription.currentPlan?.base_features
      ?.exportQuality as string | undefined;
    return exportQuality === 'high' || exportQuality === 'ultra';
  }, [subscription.currentPlan]);

  // 最高品質エクスポート利用可否
  const canUseUltraQualityExport = useMemo(() => {
    const exportQuality = subscription.currentPlan?.base_features
      ?.exportQuality as string | undefined;
    return exportQuality === 'ultra';
  }, [subscription.currentPlan]);

  return {
    // データ
    isModel,
    portfolioLimit,
    priorityBookingTickets,
    isLoading: subscription.isLoading,
    error: subscription.error,
    currentPlan: subscription.currentPlan,

    // 機能フラグ
    canAccessReviewAnalytics,
    canUseProfileBoost,
    canShowPremiumBadge,
    canUsePrivateGallery,
    canUsePriorityBooking,
    canUsePremiumTemplates,
    canUseHighQualityExport,
    canUseUltraQualityExport,

    // 関数
    checkPortfolioUploadLimit,

    // 便利なプロパティ
    isFreePlan: subscription.isFreePlan,
    isPaidUser: subscription.isPaidUser(),
  };
}
