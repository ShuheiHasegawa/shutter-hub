'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Calendar } from 'lucide-react';
import { type SubscriptionPlan } from '@/app/actions/subscription-management';

interface PlanChangeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: SubscriptionPlan | null;
  newPlan: SubscriptionPlan;
  isProcessing: boolean;
}

/**
 * プラン変更確認ダイアログ（Phase 1: 基本実装）
 */
export function PlanChangeConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isProcessing,
}: PlanChangeConfirmDialogProps) {
  const isUpgrade = newPlan.price > (currentPlan?.price ?? 0);
  const isDowngrade = newPlan.price < (currentPlan?.price ?? 0);
  const priceDifference = Math.abs(newPlan.price - (currentPlan?.price ?? 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isUpgrade ? (
              <CreditCard className="h-5 w-5 text-blue-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            )}
            <span>プラン変更の確認</span>
          </DialogTitle>
          <DialogDescription>
            {isUpgrade && 'アップグレード'}
            {isDowngrade && 'ダウングレード'}
            {!isUpgrade && !isDowngrade && 'プラン変更'}
            の内容をご確認ください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現在のプラン */}
          <div className="flex items-center justify-between p-3 rounded-lg">
            <div>
              <p className="text-sm font-medium">現在のプラン</p>
              <p className="text-lg">{currentPlan?.name || 'フリープラン'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">月額</p>
              <p className="text-lg font-bold">
                {currentPlan?.price
                  ? `¥${currentPlan.price.toLocaleString()}`
                  : '無料'}
              </p>
            </div>
          </div>

          {/* 矢印 */}
          <div className="text-center">
            <div className="text-2xl">↓</div>
          </div>

          {/* 新しいプラン */}
          <div className="flex items-center justify-between p-3 rounded-lg border-2 border-blue-200">
            <div>
              <p className="text-sm font-medium">新しいプラン</p>
              <p className="text-lg font-bold">{newPlan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">月額</p>
              <p className="text-lg font-bold">
                {newPlan.price > 0
                  ? `¥${newPlan.price.toLocaleString()}`
                  : '無料'}
              </p>
            </div>
          </div>

          {/* 料金変更の詳細 */}
          {priceDifference > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800">
                  料金変更について
                </p>
              </div>

              {isUpgrade ? (
                <div className="space-y-1 text-sm text-yellow-800">
                  <p>
                    • 月額料金が{' '}
                    <strong>¥{priceDifference.toLocaleString()}</strong>{' '}
                    増加します
                  </p>
                  <p>• 次回請求日から新料金が適用されます</p>
                  <p>• 日割り計算による追加請求が発生する場合があります</p>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-yellow-800">
                  <p>
                    • 月額料金が{' '}
                    <strong>¥{priceDifference.toLocaleString()}</strong>{' '}
                    減少します
                  </p>
                  <p>• 現在の請求期間終了時に新プランに変更されます</p>
                  <p>• 既に支払い済みの料金の返金はありません</p>
                </div>
              )}
            </div>
          )}

          {/* 決済方法の注意 */}
          {newPlan.price > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">
                  決済について
                </p>
              </div>
              <div className="space-y-1 text-sm text-blue-800">
                <p>• 有料プランの契約には決済方法の登録が必要です</p>
                <p>• Stripe決済画面で安全にお支払いいただけます</p>
                <p>• 初回は決済情報入力が必要になります</p>
              </div>
            </div>
          )}

          {/* 機能変更の概要 */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-800 mb-2">
              利用可能になる機能
            </p>
            <div className="space-y-1 text-sm text-green-700">
              {newPlan.tier !== 'free' && (
                <>
                  <p>• プレミアムテンプレート利用</p>
                  <p>• 高品質エクスポート</p>
                  {newPlan.user_type === 'model' && <p>• 優先予約チケット</p>}
                  {newPlan.user_type === 'photographer' && (
                    <p>• クライアント管理機能</p>
                  )}
                  {newPlan.user_type === 'organizer' && <p>• 高度な分析機能</p>}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            キャンセル
          </Button>
          <Button onClick={onConfirm} disabled={isProcessing} variant="cta">
            {isProcessing
              ? '処理中...'
              : isUpgrade
                ? `¥${newPlan.price.toLocaleString()}/月で開始`
                : 'プランを変更'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
