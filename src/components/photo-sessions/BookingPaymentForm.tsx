'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Check } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { confirmPayment } from '@/app/actions/payments';
import { toast } from 'sonner';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface BookingPaymentFormProps {
  clientSecret: string;
  bookingId: string;
  amount: number;
  photoSessionId: string;
  onPaymentSuccess?: () => void;
}

interface PaymentFormInternalProps {
  clientSecret: string;
  bookingId: string;
  amount: number;
  photoSessionId: string;
  onPaymentSuccess?: () => void;
}

/**
 * Stripe決済フォーム内部コンポーネント
 */
function PaymentFormInternal({
  clientSecret,
  bookingId: _bookingId,
  amount,
  photoSessionId,
  onPaymentSuccess,
}: PaymentFormInternalProps) {
  const stripe = useStripe();
  const elements = useElements();
  // const router = useRouter(); // 将来の拡張用
  // const t = useTranslations('photoSessions'); // 将来の拡張用
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe || !clientSecret) return;

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage('決済が完了しました！');
          handlePaymentSuccess();
          break;
        case 'processing':
          setMessage('決済を処理中です...');
          break;
        case 'requires_payment_method':
          setMessage('決済情報を入力してください');
          break;
        default:
          setMessage('予期しないエラーが発生しました');
          break;
      }
    });
  }, [stripe, clientSecret]);

  const handlePaymentSuccess = async () => {
    try {
      // PaymentIntent IDを抽出（clientSecretから）
      const paymentIntentId = clientSecret.split('_secret_')[0];

      // 決済を確認して予約を確定
      const result = await confirmPayment(paymentIntentId);
      if (result.success) {
        toast.success('予約が確定しました！');
        // コールバックを呼び出して完了ステップに遷移
        onPaymentSuccess?.();
      } else {
        toast.error(result.error || '決済の確認に失敗しました');
      }
    } catch (error) {
      logger.error('Payment confirmation error:', error);
      toast.error('決済の確認に失敗しました');
    }
  };

  // PaymentElementの変更を監視
  const handleElementChange = (event: {
    complete: boolean;
    error?: { message: string };
  }) => {
    setIsComplete(event.complete);
    setElementError(event.error?.message || null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/ja/photo-sessions/${photoSessionId}?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        logger.error('Stripe payment error:', error);
        setMessage(error.message || '決済に失敗しました');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('決済が完了しました！');
        logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id });
        // 決済成功時は即座に確認処理を実行
        await handlePaymentSuccess();
      }
    } catch (error) {
      logger.error('Payment submission error:', error);
      setMessage('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 決済フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>決済情報</CardTitle>
          <CardDescription>
            安全な決済処理のため、カード情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <PaymentElement
                options={{
                  layout: 'tabs',
                  defaultValues: {
                    billingDetails: {
                      name: '',
                      email: '',
                    },
                  },
                }}
                onChange={handleElementChange}
              />

              {/* リアルタイムバリデーション状態表示 */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <span>
                    {isComplete
                      ? 'カード情報入力完了'
                      : 'カード情報を入力してください'}
                  </span>
                </div>
                {elementError && (
                  <span className="text-red-500">
                    ⚠️ 入力内容を確認してください
                  </span>
                )}
              </div>
            </div>

            {/* バリデーションエラー表示 */}
            {elementError && (
              <div className="text-center p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                {elementError}
              </div>
            )}

            {/* 決済メッセージ表示 */}
            {message && (
              <div
                className={`text-center p-3 rounded-lg text-sm ${
                  message.includes('完了') || message.includes('成功')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : message.includes('エラー') || message.includes('失敗')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!stripe || isLoading || !isComplete || !!elementError}
              size="lg"
              variant="cta"
            >
              {isLoading
                ? '決済処理中...'
                : !isComplete
                  ? 'カード情報を入力してください'
                  : elementError
                    ? 'カード情報に誤りがあります'
                    : `¥${amount.toLocaleString()}を支払う`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* セキュリティ情報 */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>SSL暗号化による安全な決済</span>
        </div>
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Check className="h-3 w-3" />
            <span>PCI DSS準拠</span>
          </div>
          <div className="flex items-center space-x-1">
            <Check className="h-3 w-3" />
            <span>Stripe決済</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 予約用Stripe決済フォーム
 */
export function BookingPaymentForm({
  clientSecret,
  bookingId,
  amount,
  photoSessionId,
  onPaymentSuccess,
}: BookingPaymentFormProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#6F5091',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: '"Inter", "Noto Sans JP", system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px',
      },
    },
  };

  return (
    <Elements options={options} stripe={stripePromise}>
      <PaymentFormInternal
        clientSecret={clientSecret}
        bookingId={bookingId}
        amount={amount}
        photoSessionId={photoSessionId}
        onPaymentSuccess={onPaymentSuccess}
      />
    </Elements>
  );
}
