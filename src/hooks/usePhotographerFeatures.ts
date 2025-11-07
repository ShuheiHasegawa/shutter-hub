'use client';

import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';
import { useProfile } from './useSimpleProfile';

/**
 * カメラマン向け機能制限フック
 * カメラマンユーザー専用の機能制限を型安全に提供
 */
export function usePhotographerFeatures() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const subscription = useSubscription();

  // カメラマンユーザーかどうかをチェック
  const isPhotographer = useMemo(() => {
    if (!user || !profile) return false;
    return profile.user_type === 'photographer';
  }, [user, profile]);

  // クライアント管理機能の利用可否
  const canUseClientManagement = useMemo(() => {
    return subscription.hasFeature('clientManagement');
  }, [subscription]);

  // 高度なポートフォリオ機能の利用可否
  const canUseAdvancedPortfolio = useMemo(() => {
    return subscription.hasFeature('advancedPortfolio');
  }, [subscription]);

  // 商用ライセンス機能の利用可否
  const canUseCommercialLicense = useMemo(() => {
    return subscription.hasFeature('commercialLicense');
  }, [subscription]);

  // 透かし除去機能の利用可否
  const canRemoveWatermark = useMemo(() => {
    return subscription.hasFeature('watermarkRemoval');
  }, [subscription]);

  // ブランディングカスタマイズ機能の利用可否
  const canCustomizeBranding = useMemo(() => {
    return subscription.hasFeature('brandingCustomization');
  }, [subscription]);

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

  // 優先サポート利用可否
  const canUsePrioritySupport = useMemo(() => {
    return subscription.hasFeature('prioritySupport');
  }, [subscription]);

  return {
    // データ
    isPhotographer,
    isLoading: subscription.isLoading,
    error: subscription.error,
    currentPlan: subscription.currentPlan,

    // 機能フラグ
    canUseClientManagement,
    canUseAdvancedPortfolio,
    canUseCommercialLicense,
    canRemoveWatermark,
    canCustomizeBranding,
    canUsePremiumTemplates,
    canUseHighQualityExport,
    canUseUltraQualityExport,
    canUsePrioritySupport,

    // 便利なプロパティ
    isFreePlan: subscription.isFreePlan,
    isPaidUser: subscription.isPaidUser(),
  };
}
