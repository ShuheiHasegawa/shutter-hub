'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ModelLimitCheck } from '@/lib/subscription-limits';

interface ModelLimitDisplayProps {
  limitCheck: ModelLimitCheck;
}

export function ModelLimitDisplay({ limitCheck }: ModelLimitDisplayProps) {
  const { currentCount, limit, isUnlimited, canInvite, remainingSlots } =
    limitCheck;

  // 使用率を計算
  const usagePercentage = isUnlimited ? 0 : (currentCount / limit) * 100;

  // 警告レベルを判定
  const getWarningLevel = () => {
    if (isUnlimited) return 'success';
    if (usagePercentage >= 100) return 'danger';
    if (usagePercentage >= 80) return 'warning';
    return 'normal';
  };

  const warningLevel = getWarningLevel();

  // アイコンを決定
  const getIcon = () => {
    switch (warningLevel) {
      case 'danger':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <Crown className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  // アラートのバリアントを決定
  const getAlertVariant = () => {
    switch (warningLevel) {
      case 'danger':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      case 'success':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Alert variant={getAlertVariant()}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">所属モデル制限</span>
              {isUnlimited ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  無制限
                </Badge>
              ) : (
                <Badge variant="outline">
                  {currentCount} / {limit} 名
                </Badge>
              )}
            </div>

            {!canInvite && (
              <Button
                variant="navigation"
                size="sm"
                onClick={() => {
                  window.location.href = '/subscription';
                }}
              >
                プランを変更
              </Button>
            )}
          </div>

          {!isUnlimited && (
            <div className="space-y-2">
              <Progress
                value={usagePercentage}
                className={`h-2 ${
                  usagePercentage >= 100
                    ? 'bg-red-500'
                    : usagePercentage >= 80
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                }`}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>使用中: {currentCount}名</span>
                <span>残り: {remainingSlots}名</span>
              </div>
            </div>
          )}

          <AlertDescription className="mt-2">
            {isUnlimited ? (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                プロフェッショナルプランをご利用中です。所属モデル数に制限はありません。
              </div>
            ) : canInvite ? (
              <span className="text-muted-foreground">
                あと {remainingSlots}名のモデルを招待できます。
              </span>
            ) : (
              <div className="space-y-2">
                <span className="text-red-700 dark:text-red-300">
                  所属モデル上限（{limit}名）に達しています。
                </span>
                <div className="text-sm text-muted-foreground">
                  より多くのモデルを管理するには、プランをアップグレードしてください。
                </div>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
