'use client';

import { useState, useEffect, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import type {
  ExtendedBooking,
  EscrowPaymentFormProps,
  EscrowPayment,
} from '@/types/instant-photo';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EscrowPaymentSectionProps {
  booking: ExtendedBooking;
  bookingId: string;
  guestPhone: string;
}

// ローディング表示コンポーネント
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      <span className="ml-2 text-gray-600">決済システムを読み込み中...</span>
    </div>
  );
}

export function EscrowPaymentSection({
  booking,
  bookingId,
  guestPhone,
}: EscrowPaymentSectionProps) {
  const router = useRouter();
  const [FormComponent, setFormComponent] =
    useState<ComponentType<EscrowPaymentFormProps> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // クライアントサイドでのみコンポーネントを読み込む
  useEffect(() => {
    let isMounted = true;

    const loadComponent = async () => {
      try {
        logger.info('EscrowPaymentForm の読み込み開始...');
        // 動的にEscrowPaymentFormをインポート（default exportを使用）
        const paymentModule = await import(
          '@/components/instant/EscrowPaymentForm'
        );
        logger.info('EscrowPaymentForm モジュール読み込み完了:', {
          hasDefault: !!paymentModule.default,
          hasNamed: !!paymentModule.EscrowPaymentForm,
        });
        if (isMounted) {
          // default exportを優先、なければnamed exportを使用
          const Component =
            paymentModule.default || paymentModule.EscrowPaymentForm;
          if (Component) {
            setFormComponent(() => Component);
            logger.info('EscrowPaymentForm コンポーネント設定完了');
          } else {
            setLoadError('決済フォームコンポーネントが見つかりません');
            logger.error(
              'EscrowPaymentForm: コンポーネントがエクスポートされていません'
            );
          }
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('EscrowPaymentForm の読み込みに失敗しました:', error);
        if (isMounted) {
          setLoadError(
            `決済システムの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
          );
          setIsLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSuccess = (escrowPayment: EscrowPayment) => {
    // 決済成功後の処理（クライアント側でのみ実行）
    const paymentId = escrowPayment.id;
    try {
      router.push(`/instant/payment/${bookingId}/success?payment=${paymentId}`);
    } catch {
      // router が使えない場合のフォールバック
      window.location.href = `/instant/payment/${bookingId}/success?payment=${paymentId}`;
    }
  };

  const handleError = (message: string) => {
    logger.error('決済エラー:', message);
  };

  // エラー状態の表示
  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {loadError}
          <br />
          <button
            onClick={() => window.location.reload()}
            className="mt-2 underline hover:no-underline"
          >
            ページを再読み込みする
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !FormComponent) {
    return <LoadingSpinner />;
  }

  return (
    <FormComponent
      booking={booking}
      guestPhone={guestPhone}
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
