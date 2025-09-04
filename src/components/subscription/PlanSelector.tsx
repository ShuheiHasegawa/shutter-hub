'use client';

import { useState } from 'react';
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
  type SubscriptionPlan,
} from '@/app/actions/subscription-management';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';

interface PlanSelectorProps {
  userType: 'model' | 'photographer' | 'organizer';
}

/**
 * サブスクリプションプラン選択コンポーネント（Phase 1: 基本実装）
 */
export function PlanSelector({ userType }: PlanSelectorProps) {
  const { user } = useAuth();
  const { availablePlans, currentSubscription, isLoading } = useSubscription();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * プラン選択処理
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

    // フリープランの場合は即座に適用（決済不要）
    const selectedPlanInfo = availablePlans.find(p => p.id === planId);
    if (selectedPlanInfo?.tier === 'free') {
      toast({
        title: 'プラン変更完了',
        description: 'フリープランに変更しました',
      });
      return;
    }

    setSelectedPlan(planId);
    setIsCreating(true);

    try {
      logger.info('Creating subscription', { userId: user.id, planId });

      const result = await createSubscription(user.id, planId);

      if (result.success) {
        toast({
          title: 'サブスクリプション作成成功',
          description: '決済情報を入力してサブスクリプションを完了してください',
        });

        // 決済フローにリダイレクト（Phase 1では簡易実装）
        if (result.clientSecret) {
          // TODO: Stripe Elements決済フォームへリダイレクト
          logger.info('Payment required', {
            clientSecret: result.clientSecret,
          });
        }

        // Phase 1では基本的な処理のみ
        logger.info('Plan selected successfully', { planId });
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'サブスクリプションの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error in plan selection:', error);
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

    if (baseFeatures.premiumTemplates) {
      features.push('プレミアムテンプレート利用可能');
    }

    if (baseFeatures.exportQuality !== 'standard') {
      features.push(
        `${baseFeatures.exportQuality === 'ultra' ? '最高' : '高'}品質エクスポート`
      );
    }

    if (baseFeatures.prioritySupport) {
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
      if (typeFeatures.priorityBookingTickets > 0) {
        features.push(
          `優先予約チケット: 月${typeFeatures.priorityBookingTickets}枚`
        );
      }
    }

    if (userType === 'photographer') {
      if (typeFeatures.clientManagement) {
        features.push('クライアント管理機能');
      }
      if (typeFeatures.watermarkRemoval) {
        features.push('透かし除去');
      }
    }

    if (userType === 'organizer') {
      if (typeFeatures.sessionLimit) {
        const limit =
          typeFeatures.sessionLimit === -1
            ? '無制限'
            : `${typeFeatures.sessionLimit}件`;
        features.push(`撮影会作成: ${limit}`);
      }
      if (typeFeatures.advancedAnalytics) {
        features.push('高度な分析機能');
      }
    }

    return features.slice(0, 6); // Phase 1では最大6つまで表示
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-8 bg-gray-200 rounded"></div>
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </CardContent>
          </Card>
        ))}
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
          const features = renderFeatureList(plan);

          return (
            <Card
              key={plan.id}
              className={`relative transition-all duration-200 ${
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

              <CardHeader className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  {getPlanIcon(plan.tier)}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {isFreePlan ? (
                      '無料'
                    ) : (
                      <>
                        ¥{plan.price.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground">
                          /月
                        </span>
                      </>
                    )}
                  </div>
                  {plan.description && (
                    <CardDescription className="text-sm">
                      {plan.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 機能リスト */}
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center space-x-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* アクションボタン */}
                <div className="pt-4">
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={isCurrentPlan || isCreating}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {isCreating && selectedPlan === plan.id
                      ? '処理中...'
                      : isCurrentPlan
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
    </div>
  );
}
