'use client';

import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

/**
 * 運営者向け機能制限フック
 * 運営者ユーザー専用の機能制限を型安全に提供
 */
export function useOrganizerFeatures() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const subscription = useSubscription();

  // 運営者ユーザーかどうかをチェック
  const isOrganizer = useMemo(() => {
    if (!user || !profile) return false;
    return profile.user_type === 'organizer';
  }, [user, profile]);

  // 撮影会作成数制限
  const sessionLimit = useMemo(() => {
    if (!subscription.currentPlan) return 3; // フリープランのデフォルト

    const typeFeatures = subscription.currentPlan.type_specific_features || {};
    const limit = typeFeatures.sessionLimit as number | undefined;

    if (limit === undefined) return 3;
    if (limit === -1) return Infinity; // 無制限
    return limit;
  }, [subscription.currentPlan]);

  // 高度な分析機能の利用可否
  const canUseAdvancedAnalytics = useMemo(() => {
    return subscription.hasFeature('advancedAnalytics');
  }, [subscription]);

  // マーケティングツール機能の利用可否
  const canUseMarketingTools = useMemo(() => {
    return subscription.hasFeature('marketingTools');
  }, [subscription]);

  // 参加者CRM機能の利用可否
  const canUseParticipantCRM = useMemo(() => {
    return subscription.hasFeature('participantCRM');
  }, [subscription]);

  // 収益レポート機能の利用可否
  const canUseRevenueReports = useMemo(() => {
    return subscription.hasFeature('revenueReports');
  }, [subscription]);

  // カスタムブランディング機能の利用可否
  const canUseCustomBranding = useMemo(() => {
    return subscription.hasFeature('customBranding');
  }, [subscription]);

  // APIアクセス機能の利用可否
  const canUseApiAccess = useMemo(() => {
    return subscription.hasFeature('apiAccess');
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

  // 撮影会作成数制限チェック
  const checkSessionCreationLimit = async (currentCount: number) => {
    return await subscription.checkLimit('sessionLimit', currentCount);
  };

  return {
    // データ
    isOrganizer,
    sessionLimit,
    isLoading: subscription.isLoading,
    error: subscription.error,
    currentPlan: subscription.currentPlan,

    // 機能フラグ
    canUseAdvancedAnalytics,
    canUseMarketingTools,
    canUseParticipantCRM,
    canUseRevenueReports,
    canUseCustomBranding,
    canUseApiAccess,
    canUsePremiumTemplates,
    canUseHighQualityExport,
    canUseUltraQualityExport,
    canUsePrioritySupport,

    // 関数
    checkSessionCreationLimit,

    // 便利なプロパティ
    isFreePlan: subscription.isFreePlan,
    isPaidUser: subscription.isPaidUser(),
  };
}
