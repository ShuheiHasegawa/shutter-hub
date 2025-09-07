'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, CreditCard, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { cancelSubscription } from '@/app/actions/subscription-management';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { logger } from '@/lib/utils/logger';

/**
 * 現在のサブスクリプション状況を表示するコンポーネント（Phase 1: 基本実装）
 */
export function SubscriptionStatus() {
  const { currentSubscription, currentPlan, isLoading } = useSubscription();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState(false);

  /**
   * サブスクリプションキャンセル処理
   */
  const handleCancel = async () => {
    if (!currentSubscription) return;

    setIsCancelling(true);

    try {
      const result = await cancelSubscription(
        currentSubscription.user_id,
        true
      );

      if (result.success) {
        toast({
          title: 'キャンセル予約完了',
          description: '次回請求日にプランが終了します',
        });
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'キャンセルに失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // フリーユーザーまたはサブスクリプションなしの場合
  if (!currentSubscription || !currentPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>現在の利用状況</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>プラン</span>
              <Badge variant="default">フリープラン</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              基本機能を無料でご利用いただいています。
              より多くの機能をご利用になりたい場合は、有料プランをご検討ください。
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 有料サブスクリプションの場合
  const isFreePlan = currentPlan.price === 0;
  const periodEnd = currentSubscription.current_period_end
    ? new Date(currentSubscription.current_period_end)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>現在のサブスクリプション</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* プラン情報 */}
        <div className="flex items-center justify-between">
          <span>プラン</span>
          <div className="flex items-center space-x-2">
            <Badge variant={isFreePlan ? 'outline' : 'default'}>
              {currentPlan.name}
            </Badge>
            {currentSubscription.cancel_at_period_end && (
              <Badge variant="destructive">キャンセル予定</Badge>
            )}
          </div>
        </div>

        {/* 料金情報 */}
        {!isFreePlan && (
          <div className="flex items-center justify-between">
            <span>月額料金</span>
            <span className="font-medium">
              ¥{currentPlan.price.toLocaleString()}
            </span>
          </div>
        )}

        {/* ステータス */}
        <div className="flex items-center justify-between">
          <span>ステータス</span>
          <Badge
            variant={
              currentSubscription.status === 'active'
                ? 'default'
                : currentSubscription.status === 'past_due'
                  ? 'destructive'
                  : 'outline'
            }
          >
            {currentSubscription.status === 'active' && 'アクティブ'}
            {currentSubscription.status === 'past_due' && '支払い遅延'}
            {currentSubscription.status === 'cancelled' && 'キャンセル済み'}
            {currentSubscription.status === 'trialing' && 'トライアル中'}
          </Badge>
        </div>

        {/* 次回請求日 */}
        {periodEnd && !currentSubscription.cancel_at_period_end && (
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4" />
              <span>次回請求日</span>
            </span>
            <span className="font-medium">
              {periodEnd.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* キャンセル予定の場合 */}
        {currentSubscription.cancel_at_period_end && periodEnd && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {periodEnd.toLocaleDateString('ja-JP')} にプランが終了します
            </span>
          </div>
        )}

        {/* アクションボタン（Phase 1: 基本的なキャンセルのみ）*/}
        {!isFreePlan && !currentSubscription.cancel_at_period_end && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
              className="text-red-600 hover:text-red-700"
            >
              {isCancelling ? 'キャンセル中...' : 'プランをキャンセル'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              次回請求日にプランが終了します（即座には終了しません）
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
