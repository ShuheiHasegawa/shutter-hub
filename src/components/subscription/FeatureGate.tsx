'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Lock, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FeatureGateProps {
  /**
   * 機能が利用可能かどうか
   */
  hasAccess: boolean;

  /**
   * 機能名（表示用）
   */
  featureName: string;

  /**
   * 現在のプラン名
   */
  currentPlanName?: string;

  /**
   * 必要なプラン名（アップグレード先）
   */
  requiredPlanName?: string;

  /**
   * 機能の説明
   */
  description?: string;

  /**
   * 子要素（機能が利用可能な場合に表示）
   */
  children: ReactNode;

  /**
   * カスタムメッセージ
   */
  customMessage?: string;

  /**
   * アップグレードボタンを表示するか
   */
  showUpgradeButton?: boolean;

  /**
   * アップグレードボタンのクリックハンドラ
   */
  onUpgrade?: () => void;
}

/**
 * 機能制限ゲートコンポーネント
 * サブスクリプションプランに応じて機能の表示/非表示を制御
 */
export function FeatureGate({
  hasAccess,
  featureName,
  currentPlanName,
  requiredPlanName,
  description,
  children,
  customMessage,
  showUpgradeButton = true,
  onUpgrade,
}: FeatureGateProps) {
  const router = useRouter();

  // 機能が利用可能な場合は、子要素をそのまま表示
  if (hasAccess) {
    return <>{children}</>;
  }

  // 機能が利用不可能な場合は、ロック画面を表示
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/subscription');
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">
            {customMessage || `${featureName}は利用できません`}
          </CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {currentPlanName && (
            <p className="text-sm text-muted-foreground">
              現在のプラン:{' '}
              <span className="font-medium">{currentPlanName}</span>
            </p>
          )}
          {requiredPlanName && (
            <p className="text-sm text-muted-foreground">
              必要なプラン:{' '}
              <span className="font-medium">{requiredPlanName}</span>
            </p>
          )}
        </div>
      </CardContent>
      {showUpgradeButton && (
        <CardFooter>
          <Button onClick={handleUpgrade} variant="default" className="w-full">
            <Crown className="mr-2 h-4 w-4" />
            プランをアップグレード
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
