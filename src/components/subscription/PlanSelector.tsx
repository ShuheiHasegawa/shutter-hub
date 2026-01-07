'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import {
  createSubscription,
  updateSubscription,
  getPlansForUserType,
  type SubscriptionPlan,
} from '@/app/actions/subscription-management';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { PlanChangeConfirmDialog } from './PlanChangeConfirmDialog';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanSelectorProps {
  userType: 'model' | 'photographer' | 'organizer';
}

/**
 * サブスクリプションプラン選択コンポーネント（Phase 1: 基本実装）
 */
export function PlanSelector({ userType }: PlanSelectorProps) {
  const { user } = useAuth();
  const {
    currentSubscription,
    isLoading: subscriptionLoading,
    error,
  } = useSubscription();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [planToChange, setPlanToChange] = useState<SubscriptionPlan | null>(
    null
  );

  // プラン一覧を取得（useCallback でメモ化）
  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const plans = await getPlansForUserType(userType);
      setAvailablePlans(plans);
      logger.debug('Plans loaded successfully', {
        userType,
        planCount: plans.length,
      });
    } catch (error) {
      logger.error('Error loading plans:', error);
      toast({
        title: 'エラー',
        description: 'プラン情報の読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setPlansLoading(false);
    }
  }, [userType, toast]);

  // プラン一覧を取得（初回のみ）
  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const isLoading = subscriptionLoading || plansLoading;

  /**
   * プラン選択処理（確認ダイアログ表示）
   */
  const handlePlanSelect = async (planId: string) => {
    if (!user) {
      toast({
        title: 'ログインが必要です',
        description: 'プランを選択するにはログインしてください',
        variant: 'destructive',
      });
      return;
    }

    const selectedPlanInfo = availablePlans.find(p => p.id === planId);
    if (!selectedPlanInfo) {
      toast({
        title: 'エラー',
        description: '選択されたプランが見つかりません',
        variant: 'destructive',
      });
      return;
    }

    // フリープランの場合は即座に適用（決済不要・確認不要）
    if (selectedPlanInfo.tier === 'free') {
      await handlePlanChange(selectedPlanInfo);
      return;
    }

    // 有料プランの場合は確認ダイアログを表示
    setPlanToChange(selectedPlanInfo);
    setConfirmDialogOpen(true);
  };

  /**
   * プラン変更実行処理
   */
  const handlePlanChange = async (plan: SubscriptionPlan) => {
    if (!user) return;

    setSelectedPlan(plan.id);
    setIsCreating(true);
    setConfirmDialogOpen(false);

    try {
      // 既存のサブスクリプションがあるかチェック
      const hasExistingSubscription =
        currentSubscription && currentSubscription.status === 'active';

      logger.info('Plan change initiated', {
        userId: user.id,
        planId: plan.id,
        hasExistingSubscription,
        currentPlanId: currentSubscription?.plan_id,
      });

      // フリープランの場合の簡易処理
      if (plan.tier === 'free') {
        if (hasExistingSubscription) {
          // 既存サブスクリプションをキャンセル
          // TODO: フリープランへのダウングレード処理を実装
          toast({
            title: 'プラン変更完了',
            description: 'フリープランに変更しました',
          });
        } else {
          toast({
            title: 'プラン変更完了',
            description: 'フリープランに変更しました',
          });
        }
        return;
      }

      // 既存のサブスクリプションがある場合は更新、ない場合は新規作成
      if (hasExistingSubscription) {
        logger.info('Updating existing subscription', {
          userId: user.id,
          currentPlanId: currentSubscription.plan_id,
          newPlanId: plan.id,
        });

        // 既存サブスクリプションを更新（プラン変更）
        const result = await updateSubscription(
          user.id,
          plan.id,
          'create_prorations'
        );

        // 詳細ログでresultの内容を確認
        logger.info('Subscription update result', {
          success: result.success,
          subscriptionId: result.subscriptionId,
          prorationAmount: result.prorationAmount,
          error: result.error,
        });

        if (result.success) {
          const prorationMessage =
            result.prorationAmount !== undefined
              ? result.prorationAmount > 0
                ? `追加請求額: `
                : result.prorationAmount < 0
                  ? `返金額: `
                  : ''
              : '';
          const prorationAmount =
            result.prorationAmount !== undefined
              ? Math.abs(result.prorationAmount)
              : 0;

          toast({
            title: 'プラン変更完了',
            description: (
              <span>
                {plan.name}に変更しました
                {prorationMessage && prorationAmount > 0 && (
                  <>
                    （{prorationMessage}
                    <FormattedPrice value={prorationAmount} format="simple" />）
                  </>
                )}
              </span>
            ),
          });

          // ページをリロードして最新状態を反映
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          logger.error('Subscription update failed', {
            error: result.error,
            planId: plan.id,
            userId: user.id,
          });

          toast({
            title: 'エラー',
            description: result.error || 'プラン変更に失敗しました',
            variant: 'destructive',
          });
        }
      } else {
        logger.info('Creating new subscription', {
          userId: user.id,
          planId: plan.id,
        });

        // 新規サブスクリプション作成
        const result = await createSubscription(user.id, plan.id);

        // 詳細ログでresultの内容を確認
        logger.info('Subscription creation result', {
          success: result.success,
          hasClientSecret: !!result.clientSecret,
          subscriptionId: result.subscriptionId,
          error: result.error,
        });

        if (result.success) {
          if (result.clientSecret) {
            // Stripe決済ページにリダイレクト
            logger.info('Redirecting to payment page', {
              clientSecret: result.clientSecret,
              planId: plan.id,
            });

            // 決済ページにリダイレクト
            window.location.href = `/subscription/payment?client_secret=${result.clientSecret}&plan_id=${plan.id}`;
          } else {
            // clientSecretがない場合（フリープラン等）
            toast({
              title: 'プラン変更完了',
              description: `${plan.name}に変更しました`,
            });

            // ページをリロードして最新状態を反映
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } else {
          logger.error('Subscription creation failed', {
            error: result.error,
            planId: plan.id,
            userId: user.id,
          });

          toast({
            title: 'エラー',
            description: result.error || 'プラン変更に失敗しました',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      logger.error('Error in plan change:', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      setSelectedPlan(null);
    }
  };

  /**
   * プランカードの表示アイコン
   */
  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'free':
        return null;
      case 'basic':
      case 'pro':
      case 'standard':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'premium':
      case 'business':
      case 'professional':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  /**
   * 機能リストの表示
   */
  const renderFeatureList = (plan: SubscriptionPlan) => {
    const features = [];

    // Phase 1: 基本機能のみ表示
    const baseFeatures = plan.base_features;

    if (baseFeatures.photobookLimit) {
      const limit =
        baseFeatures.photobookLimit === -1
          ? '無制限'
          : `${baseFeatures.photobookLimit}冊`;
      features.push(`フォトブック: ${limit}`);
    }

    if (baseFeatures.premiumTemplates === true) {
      features.push('プレミアムテンプレート利用可能');
    }

    if (baseFeatures.exportQuality !== 'standard') {
      features.push(
        `${baseFeatures.exportQuality === 'ultra' ? '最高' : '高'}品質エクスポート`
      );
    }

    if (baseFeatures.prioritySupport === true) {
      features.push('優先サポート');
    }

    // ユーザータイプ特化機能（Phase 1では主要なもののみ）
    const typeFeatures = plan.type_specific_features;

    if (userType === 'model') {
      if (typeFeatures.portfolioLimit) {
        const limit =
          typeFeatures.portfolioLimit === -1
            ? '無制限'
            : `${typeFeatures.portfolioLimit}枚`;
        features.push(`ポートフォリオ: ${limit}`);
      }
      if (
        typeof typeFeatures.priorityBookingTickets === 'number' &&
        typeFeatures.priorityBookingTickets > 0
      ) {
        features.push(
          `優先予約チケット: 月${typeFeatures.priorityBookingTickets}枚`
        );
      }
    }

    if (userType === 'photographer') {
      if (typeFeatures.clientManagement === true) {
        features.push('クライアント管理機能');
      }
      if (typeFeatures.watermarkRemoval === true) {
        features.push('透かし除去');
      }
    }

    if (userType === 'organizer') {
      if (typeof typeFeatures.sessionLimit === 'number') {
        const limit =
          typeFeatures.sessionLimit === -1
            ? '無制限'
            : `${typeFeatures.sessionLimit}件`;
        features.push(`撮影会作成: ${limit}`);
      }
      if (typeFeatures.advancedAnalytics === true) {
        features.push('高度な分析機能');
      }
    }

    // Phase 1では最大6つまで表示、最小4つは表示する
    const displayFeatures = features.slice(0, 6);

    // 最小4つの機能を確保（空の場合は基本機能を追加）
    while (displayFeatures.length < 4) {
      if (displayFeatures.length === features.length) {
        displayFeatures.push('基本機能利用可能');
      } else {
        break;
      }
    }

    return displayFeatures;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-[520px] flex flex-col">
              <CardHeader className="space-y-4 text-center">
                <Skeleton className="h-6 w-32 mx-auto" />
                <div className="space-y-1">
                  <Skeleton className="h-8 w-24 mx-auto" />
                  <Skeleton className="h-4 w-40 mx-auto" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <ul className="space-y-2 flex-1">
                  {[...Array(4)].map((_, j) => (
                    <li key={j} className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 flex-1" />
                    </li>
                  ))}
                </ul>
                <div className="pt-4 mt-auto">
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {userType === 'model' && 'モデル向けプラン'}
          {userType === 'photographer' && 'カメラマン向けプラン'}
          {userType === 'organizer' && '運営者向けプラン'}
        </h2>
        <p className="text-muted-foreground">
          あなたのニーズに最適なプランをお選びください
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {availablePlans.map(plan => {
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const isFreePlan = plan.tier === 'free';
          const isCurrentlyFreePlan =
            !currentSubscription || currentSubscription.plan?.tier === 'free';
          const features = renderFeatureList(plan);

          return (
            <Card
              key={plan.id}
              className={`relative transition-all duration-200 h-[520px] flex flex-col p-2 ${
                isCurrentPlan
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:shadow-md'
              }`}
            >
              {/* 人気プランバッジ */}
              {plan.tier === 'basic' ||
              plan.tier === 'pro' ||
              plan.tier === 'standard' ? (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  人気
                </Badge>
              ) : null}

              {/* 現在のプランバッジ */}
              {isCurrentPlan && (
                <Badge className="absolute -top-3 right-4 bg-green-500">
                  現在のプラン
                </Badge>
              )}

              <CardHeader className="text-center h-[200px] flex flex-col justify-start pt-6 pb-4">
                {/* プラン名（アイコン + タイトル） */}
                <div className="h-12 flex items-center justify-center mb-4">
                  <div className="flex items-center justify-center space-x-2">
                    {getPlanIcon(plan.tier)}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                </div>

                {/* 料金 */}
                <div className="h-16 flex items-center justify-center mb-4">
                  <div className="text-3xl font-bold">
                    {isFreePlan ? (
                      '無料'
                    ) : (
                      <>
                        <FormattedPrice value={plan.price} format="simple" />
                        <span className="text-sm font-normal text-muted-foreground">
                          /月
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 説明文 */}
                <div className="h-10 flex items-center justify-center">
                  {plan.description ? (
                    <CardDescription className="text-sm">
                      {plan.description}
                    </CardDescription>
                  ) : (
                    <div className="text-sm text-muted-foreground opacity-0">
                      &nbsp;
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col h-[280px] pb-6">
                {/* 機能リスト */}
                <div className="flex-1 flex flex-col justify-start mb-4">
                  <ul className="space-y-2">
                    {features.slice(0, 4).map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center space-x-2 text-sm h-6"
                      >
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="line-clamp-1">{feature}</span>
                      </li>
                    ))}
                    {/* 機能が4つ未満の場合、空のスペースを確保 */}
                    {features.length < 4 &&
                      Array.from({ length: 4 - features.length }).map(
                        (_, index) => (
                          <li
                            key={`empty-${index}`}
                            className="h-6 opacity-0"
                            aria-hidden="true"
                          >
                            <span>&nbsp;</span>
                          </li>
                        )
                      )}
                  </ul>
                </div>

                {/* アクションボタン */}
                <div className="pt-4 mt-auto">
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : 'cta'}
                    disabled={
                      isCurrentPlan ||
                      isCreating ||
                      (isFreePlan && isCurrentlyFreePlan)
                    }
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {isCreating && selectedPlan === plan.id
                      ? '処理中...'
                      : isCurrentPlan
                        ? '現在のプラン'
                        : isFreePlan && isCurrentlyFreePlan
                          ? '現在のプラン'
                          : isFreePlan
                            ? 'フリープランに変更'
                            : 'このプランを選択'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="text-center p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* プラン変更確認ダイアログ */}
      {planToChange && (
        <PlanChangeConfirmDialog
          isOpen={confirmDialogOpen}
          onClose={() => {
            setConfirmDialogOpen(false);
            setPlanToChange(null);
          }}
          onConfirm={() => {
            if (planToChange) {
              handlePlanChange(planToChange);
            }
          }}
          currentPlan={currentSubscription?.plan || null}
          newPlan={planToChange}
          isProcessing={isCreating}
        />
      )}
    </div>
  );
}
