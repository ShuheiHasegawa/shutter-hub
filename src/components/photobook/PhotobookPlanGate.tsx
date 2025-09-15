'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Crown, AlertTriangle, ArrowUp, Star } from 'lucide-react';
import Link from 'next/link';
import { PhotobookType, PlanLimitCheck } from '@/types/quick-photobook';
import { cn } from '@/lib/utils';

/**
 * プラン制限ゲートコンポーネント
 */
interface PlanGateProps {
  children: ReactNode;
  requiredType: PhotobookType;
  currentPlan: string;
  limitCheck: PlanLimitCheck;
  feature: string;
}

export function PhotobookPlanGate({
  children,
  requiredType,
  currentPlan,
  limitCheck,
  feature,
}: PlanGateProps) {
  // プラン制限チェック
  const isAllowed = limitCheck.allowed;
  const isQuickAllowed = requiredType === 'quick';
  const isAdvancedAllowed =
    requiredType === 'advanced' && !currentPlan.includes('free');

  // アクセス許可されている場合は子コンポーネントを表示
  if (isAllowed && (isQuickAllowed || isAdvancedAllowed)) {
    return <>{children}</>;
  }

  // 制限時の表示
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Lock className="h-5 w-5" />
          {feature} - プラン制限
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 制限理由 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {!isAllowed &&
              `${feature}の作成上限（${limitCheck.limit}）に達しています。`}
            {requiredType === 'advanced' &&
              currentPlan.includes('free') &&
              'アドバンスドフォトブック機能は有料プランでご利用いただけます。'}
          </AlertDescription>
        </Alert>

        {/* 現在の使用状況 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">現在の使用数</p>
            <Badge variant="outline">
              {limitCheck.current_usage} / {limitCheck.limit}
            </Badge>
          </div>
          <div>
            <p className="text-gray-600 mb-1">残り作成可能数</p>
            <Badge
              variant={limitCheck.remaining > 0 ? 'default' : 'destructive'}
            >
              {limitCheck.remaining}
            </Badge>
          </div>
        </div>

        {/* アップグレード案内 */}
        <div className="flex flex-col gap-3">
          <div className="text-center">
            <Crown className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">
              プランをアップグレードして制限を解除
            </h3>
            <p className="text-sm text-gray-600">
              より多くのフォトブックと高度な機能をご利用いただけます
            </p>
          </div>

          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/subscription">
                <ArrowUp className="h-4 w-4 mr-2" />
                プラン詳細
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/subscription">
                <Star className="h-4 w-4 mr-2" />
                アップグレード
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * フォトブック作成制限表示
 */
interface CreateLimitDisplayProps {
  limitCheck: PlanLimitCheck;
  photobookType: PhotobookType;
}

export function PhotobookCreateLimitDisplay({
  limitCheck,
  photobookType,
}: CreateLimitDisplayProps) {
  if (limitCheck.allowed) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-medium">作成可能</h3>
              <p className="text-sm">
                あと {limitCheck.remaining} 個のフォトブックを作成できます
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PhotobookPlanGate
      requiredType={photobookType}
      currentPlan={limitCheck.plan_name}
      limitCheck={limitCheck}
      feature="フォトブック作成"
    >
      <div>プラン制限により表示されません</div>
    </PhotobookPlanGate>
  );
}

/**
 * ページ数制限表示
 */
interface PageLimitDisplayProps {
  currentPages: number;
  maxPages: number;
  planName: string;
}

export function PhotobookPageLimitDisplay({
  currentPages,
  maxPages,
  planName,
}: PageLimitDisplayProps) {
  const remaining = maxPages - currentPages;
  const isNearLimit = remaining <= 2;
  const isAtLimit = remaining <= 0;

  return (
    <Card
      className={cn(
        'border',
        isAtLimit && 'border-red-200 bg-red-50',
        isNearLimit && !isAtLimit && 'border-yellow-200 bg-yellow-50',
        !isNearLimit && 'border-blue-200 bg-blue-50'
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={cn(
                'font-medium',
                isAtLimit && 'text-red-800',
                isNearLimit && !isAtLimit && 'text-yellow-800',
                !isNearLimit && 'text-blue-800'
              )}
            >
              ページ数制限
            </h3>
            <p
              className={cn(
                'text-sm',
                isAtLimit && 'text-red-700',
                isNearLimit && !isAtLimit && 'text-yellow-700',
                !isNearLimit && 'text-blue-700'
              )}
            >
              {currentPages} / {maxPages} ページ使用中
            </p>
          </div>

          <div className="text-right">
            <Badge
              variant={
                isAtLimit
                  ? 'destructive'
                  : isNearLimit
                    ? 'secondary'
                    : 'default'
              }
            >
              残り {remaining} ページ
            </Badge>
            <p className="text-xs text-gray-600 mt-1">{planName}</p>
          </div>
        </div>

        {isAtLimit && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-sm text-red-700 mb-3">
              ページ数の上限に達しています。さらに追加するにはプランのアップグレードが必要です。
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/subscription">プランをアップグレード</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
