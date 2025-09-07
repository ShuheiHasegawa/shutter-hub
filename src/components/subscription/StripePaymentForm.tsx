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
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, Check } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { type SubscriptionPlan } from '@/app/actions/subscription-management';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface StripePaymentFormProps {
  clientSecret: string;
  planInfo: SubscriptionPlan | null;
}

interface PaymentFormProps {
  clientSecret: string;
  planInfo: SubscriptionPlan | null;
}

/**
 * Stripe決済フォーム内部コンポーネント
 */
function PaymentForm({ clientSecret, planInfo }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
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
          setTimeout(() => {
            window.location.href = '/subscription?success=payment_completed';
          }, 2000);
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
          return_url: `${window.location.origin}/subscription?success=payment_completed`,
        },
        redirect: 'if_required',
      });

      if (error) {
        logger.error('Stripe payment error:', error);
        setMessage(error.message || '決済に失敗しました');
        setTimeout(() => {
          window.location.href = `/subscription?error=${encodeURIComponent(error.message || '決済に失敗しました')}`;
        }, 2000);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('決済が完了しました！');
        logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id });
        setTimeout(() => {
          window.location.href = '/subscription?success=payment_completed';
        }, 1000);
      }
    } catch (error) {
      logger.error('Payment submission error:', error);
      setMessage('予期しないエラーが発生しました');
      setTimeout(() => {
        window.location.href = `/subscription?error=${encodeURIComponent('予期しないエラーが発生しました')}`;
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* プラン情報表示 */}
      {planInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>お申し込み内容</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>プラン</span>
                <Badge variant="default">{planInfo.name}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>月額料金</span>
                <span className="text-lg font-bold">
                  ¥{planInfo.price.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>初回請求</span>
                <span>今すぐ</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>次回請求</span>
                <span>
                  {new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    : `¥${planInfo?.price.toLocaleString() || '---'}/月で開始`}
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
          <div className="flex items-center space-x-1">
            <Check className="h-3 w-3" />
            <span>いつでもキャンセル可能</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stripe Elements決済フォーム（Phase 1: 基本実装）
 */
export function StripePaymentForm({
  clientSecret,
  planInfo,
}: StripePaymentFormProps) {
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
      <PaymentForm clientSecret={clientSecret} planInfo={planInfo} />
    </Elements>
  );
}
