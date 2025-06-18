'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StripeProvider } from '@/components/payments/StripeProvider';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { CreditCard, TestTube } from 'lucide-react';

export default function TestPaymentPage() {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // テスト用の予約を作成
  const createTestBooking = async () => {
    setIsCreatingBooking(true);
    setError(null);

    try {
      // テスト用のダミー予約IDを生成（実際のDBは使用しない）
      const testBookingId = `test-booking-${Date.now()}`;

      // テスト用なので直接bookingIdを設定
      setBookingId(testBookingId);
      return;

      // 以下は実際のDB使用時のコード（コメントアウト）
      /*
      const testPhotoSessionId = 'test-session-id';
      const testUserId = 'test-user-id';

      const result = await createPhotoSessionBooking(
        testPhotoSessionId,
        testUserId
      );

      if (result.success && result.bookingId) {
        setBookingId(result.bookingId);
      } else {
        setError(result.error || 'テスト予約の作成に失敗しました');
      }
      */
    } catch (error) {
      console.error('テスト予約作成エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  return (
    <div>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Stripe決済テスト
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">
                ⚠️ テスト環境
              </h4>
              <p className="text-sm text-yellow-700">
                これはStripe決済システムのテストページです。実際の決済は発生せず、UIとフローのテストのみ行われます。
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">テスト用カード番号</h4>
              <div className="rounded-lg p-3 text-sm font-mono bg-gray-100 text-gray-500">
                <div>カード番号: 4242 4242 4242 4242</div>
                <div>有効期限: 12/34</div>
                <div>CVC: 123</div>
                <div>郵便番号: 12345</div>
              </div>
              <p className="text-xs text-gray-600">
                ※
                このテストでは実際のStripe決済は行われず、UIフローのみテストされます
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>
                  ✅ 決済テストが成功しました！Webhookが正常に動作しています。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {!bookingId && !success && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={createTestBooking}
                disabled={isCreatingBooking}
                className="w-full"
                size="lg"
              >
                {isCreatingBooking ? 'テスト予約作成中...' : 'テスト決済を開始'}
              </Button>
            </CardContent>
          </Card>
        )}

        {bookingId && !success && (
          <StripeProvider>
            <PaymentForm
              bookingId={bookingId}
              photoSessionId="test-session-id"
              amount={5000} // 5000円のテスト
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </StripeProvider>
        )}

        {success && (
          <Card>
            <CardContent className="text-center py-8">
              <CreditCard className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">テスト決済完了！</h3>
              <p className="text-muted-foreground mb-4">
                Stripe Webhookが正常に動作し、決済処理が完了しました。
              </p>
              <Button
                onClick={() => {
                  setBookingId(null);
                  setSuccess(false);
                  setError(null);
                }}
                variant="outline"
              >
                もう一度テスト
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Webhook確認方法</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Stripe CLIでWebhookリスニング</h4>
              <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-sm font-mono">
                stripe listen --forward-to localhost:3000/api/webhooks/stripe
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. 環境変数設定</h4>
              <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-sm font-mono">
                STRIPE_WEBHOOK_SECRET=whsec_57443120d029db7610f4584b66559ae7627b799906a8605714289e38d63704ba
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. ログ確認</h4>
              <p className="text-sm text-muted-foreground">
                決済完了後、ターミナルでWebhookイベントが受信されることを確認してください。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
