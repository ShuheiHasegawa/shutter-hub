'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';
import {
  createEscrowPayment,
  confirmEscrowPayment,
} from '@/app/actions/instant-payment';
import type { InstantBooking, EscrowPayment } from '@/types/instant-photo';

interface EscrowPaymentFormProps {
  booking: InstantBooking;
  guestPhone: string;
  onSuccess?: (escrowPayment: EscrowPayment) => void;
  onError?: (error: string) => void;
}

export function EscrowPaymentForm({
  booking,
  guestPhone,
  onSuccess,
  onError,
}: EscrowPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // エスクロー決済を初期化
  useEffect(() => {
    const initializePayment = async () => {
      try {
        const result = await createEscrowPayment(booking.id, guestPhone);
        if (result.success && result.data) {
          setClientSecret(result.data.clientSecret);
        } else {
          setErrorMessage(
            result.error || 'エスクロー決済の初期化に失敗しました'
          );
          setPaymentStatus('error');
        }
      } catch (error) {
        console.error('エスクロー決済初期化エラー:', error);
        setErrorMessage('予期しないエラーが発生しました');
        setPaymentStatus('error');
      }
    };

    initializePayment();
  }, [booking.id, guestPhone]);

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setErrorMessage('決済システムの準備ができていません');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('カード情報が入力されていません');
      }

      // PaymentIntentを確認（エスクロー）
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (error) {
        setErrorMessage(error.message || '決済に失敗しました');
        setPaymentStatus('error');
        onError?.(error.message || '決済に失敗しました');
      } else if (paymentIntent?.status === 'requires_capture') {
        // エスクロー成功（手動キャプチャ待ち）
        const confirmResult = await confirmEscrowPayment(paymentIntent.id);
        if (confirmResult.success && confirmResult.data) {
          setPaymentStatus('success');
          onSuccess?.(confirmResult.data);
        } else {
          setErrorMessage(
            confirmResult.error || 'エスクロー確認に失敗しました'
          );
          setPaymentStatus('error');
          onError?.(confirmResult.error || 'エスクロー確認に失敗しました');
        }
      }
    } catch (error) {
      console.error('決済処理エラー:', error);
      setErrorMessage('予期しないエラーが発生しました');
      setPaymentStatus('error');
      onError?.('予期しないエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          安全なエスクロー決済
        </CardTitle>
        <p className="text-sm text-gray-600">
          決済は一時的に預託され、写真受取確認後にカメラマンに支払われます
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* エスクロー決済の説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-medium text-blue-900 mb-2">
                エスクロー決済とは？
              </h4>
              <ul className="space-y-1 text-blue-800">
                <li>• 決済金額は一時的に預託されます</li>
                <li>• 写真を受け取り、満足したら「受取確認」をタップ</li>
                <li>• 確認後にカメラマンに支払いが実行されます</li>
                <li>• 満足できない場合は争議申請が可能です</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 料金詳細 */}
        <div className="space-y-3">
          <h4 className="font-medium">決済詳細</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>撮影料金</span>
              <span>
                ¥
                {(booking.total_amount - booking.platform_fee).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>プラットフォーム手数料</span>
              <span>¥{booking.platform_fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>緊急料金</span>
              <span>¥{booking.rush_fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>休日料金</span>
              <span>¥{booking.holiday_fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>夜間料金</span>
              <span>¥{booking.night_fee.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>合計</span>
              <span>¥{booking.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 自動確認の説明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-medium text-yellow-900 mb-1">自動受取確認</h4>
              <p className="text-yellow-800">
                写真配信から72時間経過すると、自動的に受取確認となり決済が完了します。
              </p>
            </div>
          </div>
        </div>

        {/* 決済状況表示 */}
        {paymentStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              エスクロー決済が完了しました！撮影の準備が整いました。
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* 決済フォーム */}
        {paymentStatus !== 'success' && (
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                クレジットカード情報
              </label>
              <div className="border rounded-md p-3 bg-white">
                <CardElement options={cardElementOptions} />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!stripe || !clientSecret || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  決済処理中...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />¥
                  {booking.total_amount.toLocaleString()}を預託決済
                </>
              )}
            </Button>
          </form>
        )}

        {/* 取引フロー説明 */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">取引フロー</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
              >
                1
              </Badge>
              <span>エスクロー決済（現在のステップ）</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
              >
                2
              </Badge>
              <span>撮影実行</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
              >
                3
              </Badge>
              <span>写真配信（カメラマン）</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
              >
                4
              </Badge>
              <span>受取確認（ゲスト）</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
              >
                5
              </Badge>
              <span>決済完了・支払い実行</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
