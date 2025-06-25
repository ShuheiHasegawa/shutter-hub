'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActionSheet, ActionButton } from '@/components/ui/action-sheet';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  X,
} from 'lucide-react';
import { StripeProvider } from './StripeProvider';
import { PaymentForm } from './PaymentForm';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PhotoSession {
  id: string;
  title: string;
  description: string | null;
  location: string;
  address: string | null;
  start_time: string;
  end_time: string;
  max_participants: number;
  price_per_person: number;
  organizer: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface PaymentBookingFormProps {
  photoSession: PhotoSession;
  onBookingSuccess?: () => void;
  onBookingError?: (error: string) => void;
  onCancel?: () => void;
}

export function PaymentBookingForm({
  photoSession,
  onBookingSuccess,
  onBookingError,
  onCancel,
}: PaymentBookingFormProps) {
  const [step, setStep] = useState<'booking' | 'payment' | 'success'>(
    'booking'
  );
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // 予約作成
  const handleCreateBooking = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createPhotoSessionBooking(
        photoSession.id,
        'current_user'
      ); // TODO: 実際のユーザーIDを取得

      if (result.success && result.bookingId) {
        setBookingId(result.bookingId);
        setStep('payment');
        setShowActionSheet(false);
      } else {
        setError(result.error || '予約の作成に失敗しました');
        onBookingError?.(result.error || '予約の作成に失敗しました');
      }
    } catch (error) {
      console.error('予約作成エラー:', error);
      setError('予期しないエラーが発生しました');
      onBookingError?.('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 決済成功
  const handlePaymentSuccess = () => {
    setStep('success');
    onBookingSuccess?.();
  };

  // 決済エラー
  const handlePaymentError = (error: string) => {
    setError(error);
    onBookingError?.(error);
  };

  // キャンセル処理
  const handleCancel = () => {
    setShowActionSheet(false);
    onCancel?.();
  };

  // 予約確認用のアクションボタン
  const bookingActions: ActionButton[] = [
    {
      id: 'cancel',
      label: 'キャンセル',
      variant: 'outline',
      onClick: handleCancel,
      icon: <X className="h-4 w-4" />,
      className: 'border-gray-300 text-gray-700 hover:bg-gray-50',
    },
    {
      id: 'confirm',
      label: '予約して決済に進む',
      variant: 'default',
      onClick: handleCreateBooking,
      loading: isLoading,
      icon: <CreditCard className="h-4 w-4" />,
      className: 'bg-blue-600 hover:bg-blue-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 撮影会情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            撮影会詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{photoSession.title}</h3>
            {photoSession.description && (
              <p className="text-muted-foreground mt-1">
                {photoSession.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(photoSession.start_time), 'PPP', {
                  locale: ja,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(photoSession.start_time), 'HH:mm', {
                  locale: ja,
                })}{' '}
                -
                {format(new Date(photoSession.end_time), 'HH:mm', {
                  locale: ja,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{photoSession.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>最大{photoSession.max_participants}名</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-lg font-semibold">参加費用</span>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ¥{photoSession.price_per_person.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">1名あたり</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ステップ表示 */}
      <div className="flex items-center justify-center space-x-4">
        <div
          className={`flex items-center gap-2 ${step === 'booking' ? 'text-blue-600' : step === 'payment' || step === 'success' ? 'text-success' : 'text-gray-400'}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'booking' ? 'bg-blue-100 text-blue-600' : step === 'payment' || step === 'success' ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'}`}
          >
            {step === 'payment' || step === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              '1'
            )}
          </div>
          <span className="text-sm font-medium">予約確認</span>
        </div>

        <div
          className={`w-8 h-0.5 ${step === 'payment' || step === 'success' ? 'bg-success' : 'bg-gray-300'}`}
        />

        <div
          className={`flex items-center gap-2 ${step === 'payment' ? 'text-blue-600' : step === 'success' ? 'text-success' : 'text-gray-400'}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'payment' ? 'bg-blue-100 text-blue-600' : step === 'success' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
          >
            {step === 'success' ? <CheckCircle className="h-4 w-4" /> : '2'}
          </div>
          <span className="text-sm font-medium">決済</span>
        </div>

        <div
          className={`w-8 h-0.5 ${step === 'success' ? 'bg-green-600' : 'bg-gray-300'}`}
        />

        <div
          className={`flex items-center gap-2 ${step === 'success' ? 'text-green-600' : 'text-gray-400'}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'success' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
          >
            {step === 'success' ? <CheckCircle className="h-4 w-4" /> : '3'}
          </div>
          <span className="text-sm font-medium">完了</span>
        </div>
      </div>

      {/* ステップコンテンツ */}
      {step === 'booking' && (
        <Card>
          <CardHeader>
            <CardTitle>予約確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              この撮影会に参加しますか？決済完了後、予約が確定されます。
            </p>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">注意事項</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  •
                  決済完了後のキャンセルは、撮影会のキャンセルポリシーに従います
                </li>
                <li>
                  •
                  撮影開始24時間前までのキャンセルは手数料が発生する場合があります
                </li>
                <li>• 天候等による中止の場合は全額返金されます</li>
              </ul>
            </div>

            {/* ActionSheetを使った予約確認ボタン */}
            <ActionSheet
              trigger={
                <Button className="w-full" size="lg">
                  予約を確認する
                </Button>
              }
              title="予約の確認"
              description="この撮影会への参加を確定しますか？"
              actions={bookingActions}
              open={showActionSheet}
              onOpenChange={setShowActionSheet}
            />
          </CardContent>
        </Card>
      )}

      {step === 'payment' && bookingId && (
        <StripeProvider>
          <PaymentForm
            bookingId={bookingId}
            photoSessionId={photoSession.id}
            amount={photoSession.price_per_person}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </StripeProvider>
      )}

      {step === 'success' && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">予約が完了しました！</h3>
            <p className="text-muted-foreground mb-6">
              決済が正常に処理され、撮影会への参加が確定しました。
              確認メールをお送りしましたのでご確認ください。
            </p>

            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  次のステップ
                </h4>
                <ul className="text-sm text-green-800 space-y-1 text-left">
                  <li>• 撮影会の詳細情報をメールで確認してください</li>
                  <li>• 当日の持ち物や注意事項をご確認ください</li>
                  <li>• ご質問がある場合は主催者にお問い合わせください</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  予約一覧を見る
                </Button>
                <Button className="flex-1">撮影会詳細を見る</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
