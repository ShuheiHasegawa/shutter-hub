'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Lock,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { createPaymentIntent, confirmPayment } from '@/app/actions/payments';
import { calculateTotalFees } from '@/lib/stripe/config';
import type { PaymentFormData, PaymentResult } from '@/types/payment';

interface PaymentFormProps {
  bookingId: string;
  photoSessionId: string;
  amount: number;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: string) => void;
}

export function PaymentForm({
  bookingId,
  photoSessionId,
  amount,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [, setPaymentIntentId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PaymentFormData>({
    payment_method: 'card',
    payment_timing: 'prepaid',
    billing_details: {
      name: '',
      email: '',
    },
  });

  // 料金計算
  const fees = calculateTotalFees(amount);

  // PaymentIntentを作成
  useEffect(() => {
    const createIntent = async () => {
      try {
        const result = await createPaymentIntent({
          amount,
          currency: 'jpy',
          payment_method_types: ['card'],
          metadata: {
            booking_id: bookingId,
            photo_session_id: photoSessionId,
            user_id: 'current_user', // TODO: 実際のユーザーIDを取得
            payment_timing: formData.payment_timing,
          },
        });

        if (result.success && result.client_secret) {
          setClientSecret(result.client_secret);
          setPaymentIntentId(result.payment_intent_id!);
        } else {
          setError(result.error || '決済の準備に失敗しました');
          onError?.(result.error || '決済の準備に失敗しました');
        }
      } catch (error) {
        console.error('PaymentIntent作成エラー:', error);
        setError('決済の準備中にエラーが発生しました');
        onError?.('決済の準備中にエラーが発生しました');
      }
    };

    createIntent();
  }, [bookingId, photoSessionId, amount, formData.payment_timing, onError]);

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('決済システムの準備ができていません');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('カード情報が入力されていません');
      }

      // 決済を確認
      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: formData.billing_details?.name || '',
              email: formData.billing_details?.email || '',
            },
          },
        });

      if (stripeError) {
        setError(stripeError.message || '決済に失敗しました');
        onError?.(stripeError.message || '決済に失敗しました');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // データベースの決済ステータスを更新
        const confirmResult = await confirmPayment(paymentIntent.id);

        if (confirmResult.success) {
          onSuccess?.(confirmResult);
        } else {
          setError(confirmResult.error || '決済の確認に失敗しました');
          onError?.(confirmResult.error || '決済の確認に失敗しました');
        }
      }
    } catch (error) {
      console.error('決済エラー:', error);
      setError('決済処理中にエラーが発生しました');
      onError?.('決済処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // カード要素のスタイル
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          決済情報
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 料金内訳 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">料金内訳</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>撮影料金</span>
              <span>¥{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>プラットフォーム手数料 (10%)</span>
              <span>¥{fees.platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>決済手数料 (3.6%)</span>
              <span>¥{fees.stripeFee.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>お支払い金額</span>
              <span>¥{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>主催者受取額</span>
              <span>¥{fees.organizerPayout.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 決済フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 請求先情報 */}
          <div className="space-y-4">
            <h4 className="font-medium">請求先情報</h4>

            <div>
              <Label htmlFor="name">お名前 *</Label>
              <Input
                id="name"
                type="text"
                value={formData.billing_details?.name || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    billing_details: {
                      ...prev.billing_details,
                      name: e.target.value,
                    },
                  }))
                }
                placeholder="山田 太郎"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">メールアドレス *</Label>
              <Input
                id="email"
                type="email"
                value={formData.billing_details?.email || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    billing_details: {
                      ...prev.billing_details,
                      email: e.target.value,
                    },
                  }))
                }
                placeholder="example@email.com"
                required
              />
            </div>
          </div>

          <Separator />

          {/* カード情報 */}
          <div className="space-y-4">
            <h4 className="font-medium">カード情報</h4>

            <div className="p-3 border rounded-md">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {/* セキュリティ情報 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="h-4 w-4" />
            <span>SSL暗号化により安全に処理されます</span>
          </div>

          {/* 決済ボタン */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!stripe || !clientSecret || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                決済処理中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />¥
                {amount.toLocaleString()}を支払う
              </>
            )}
          </Button>

          {/* 注意事項 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• 決済完了後、予約が確定されます</p>
            <p>• キャンセルポリシーは撮影会詳細をご確認ください</p>
            <p>• 領収書はメールで送信されます</p>
          </div>
        </form>

        {/* 対応決済方法 */}
        <div className="pt-4 border-t">
          <div className="text-sm text-gray-600 mb-2">対応決済方法</div>
          <div className="flex gap-2">
            <Badge variant="outline">Visa</Badge>
            <Badge variant="outline">Mastercard</Badge>
            <Badge variant="outline">JCB</Badge>
            <Badge variant="outline">American Express</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
