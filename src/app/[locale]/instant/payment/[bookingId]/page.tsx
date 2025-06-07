import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EscrowPaymentForm } from '@/components/instant/EscrowPaymentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Camera,
  Users,
  MapPin,
  Shield,
  CheckCircle,
  CreditCard,
  Info,
} from 'lucide-react';
import type { ExtendedBooking } from '@/types/instant-photo';

interface PageProps {
  params: Promise<{
    locale: string;
    bookingId: string;
  }>;
}

// ステップインジケーターコンポーネント
function PaymentStepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, title: '決済', description: 'エスクロー決済' },
    { id: 2, title: '撮影', description: '写真撮影実行' },
    { id: 3, title: '配信', description: '写真受け渡し' },
    { id: 4, title: '完了', description: '取引完了' },
  ];

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.id <= currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function PaymentPage({ params }: PageProps) {
  const { bookingId } = await params;
  const supabase = await createClient();

  // 予約情報とカメラマン情報を取得
  const { data: bookingData, error: bookingError } = await supabase
    .from('instant_bookings')
    .select(
      `
      *,
      request:instant_photo_requests(*),
      photographer:profiles!instant_bookings_photographer_id_fkey(*)
    `
    )
    .eq('id', bookingId)
    .single();

  if (bookingError || !bookingData) {
    redirect('/instant');
  }

  const booking = bookingData as ExtendedBooking;

  // セキュリティチェック: ゲストの電話番号が一致するかを確認
  // 実際の実装では、セッション或いはワンタイムトークンでの認証が必要
  const guestPhone = booking.request?.guest_phone;
  if (!guestPhone) {
    redirect('/instant');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            エスクロー決済
          </h1>
          <p className="text-gray-600">
            安全な取引のため、写真受取確認後に決済が完了されます
          </p>
        </div>

        {/* ステップインジケーター */}
        <PaymentStepIndicator currentStep={1} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側: 予約詳細 */}
          <div className="lg:col-span-2 space-y-6">
            {/* エスクロー説明 */}
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="font-medium mb-2">エスクロー決済とは？</div>
                <div className="text-sm space-y-1">
                  <p>• お支払いは一時的に預託され、撮影完了まで保護されます</p>
                  <p>• 写真を受け取り、満足いただいた後に決済が確定します</p>
                  <p>
                    • 問題がある場合は、72時間以内にサポートにご連絡ください
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* カメラマン情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  担当カメラマン
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <Camera className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">
                      {booking.photographer?.display_name || '匿名カメラマン'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>
                        ⭐{' '}
                        {booking.photographer?.average_rating?.toFixed(1) ||
                          'N/A'}
                      </span>
                      <span>📷 即座撮影対応</span>
                      <Badge variant="secondary">認証済み</Badge>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">
                      プロフェッショナルカメラマンによる高品質な撮影をお約束します。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 撮影詳細 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  撮影詳細
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      ゲスト名
                    </label>
                    <p className="text-gray-900">
                      {booking.request?.guest_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      参加人数
                    </label>
                    <p className="text-gray-900">
                      {booking.request?.party_size}名
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      撮影タイプ
                    </label>
                    <p className="text-gray-900">
                      {booking.request?.request_type === 'portrait' &&
                        'ポートレート'}
                      {booking.request?.request_type === 'couple' &&
                        'カップル・友人'}
                      {booking.request?.request_type === 'family' &&
                        'ファミリー'}
                      {booking.request?.request_type === 'group' && 'グループ'}
                      {booking.request?.request_type === 'landscape' && '風景'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      撮影時間
                    </label>
                    <p className="text-gray-900">
                      {booking.request?.duration}分
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    撮影場所
                  </label>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <p className="text-gray-900">
                      {booking.request?.location_address ||
                        `${booking.request?.location_lat}, ${booking.request?.location_lng}`}
                    </p>
                  </div>
                  {booking.request?.location_landmark && (
                    <p className="text-sm text-gray-600 ml-6">
                      📍 {booking.request.location_landmark}
                    </p>
                  )}
                </div>

                {booking.request?.special_requests && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        特別なリクエスト
                      </label>
                      <p className="text-gray-900 mt-1">
                        {booking.request.special_requests}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 決済フォーム */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  決済情報
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EscrowPaymentForm
                  booking={booking}
                  guestPhone={guestPhone}
                  onSuccess={paymentId => {
                    // 決済成功後の処理
                    window.location.href = `/instant/payment/${bookingId}/success?payment=${paymentId}`;
                  }}
                  onError={error => {
                    console.error('決済エラー:', error);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* 右側: 料金サマリー */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">料金内訳</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>基本料金</span>
                    <span>
                      ¥
                      {(
                        booking.total_amount -
                        booking.rush_fee -
                        booking.holiday_fee -
                        booking.night_fee
                      ).toLocaleString()}
                    </span>
                  </div>

                  {booking.rush_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>緊急料金</span>
                      <span>¥{booking.rush_fee.toLocaleString()}</span>
                    </div>
                  )}

                  {booking.holiday_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>休日料金</span>
                      <span>¥{booking.holiday_fee.toLocaleString()}</span>
                    </div>
                  )}

                  {booking.night_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>夜間料金</span>
                      <span>¥{booking.night_fee.toLocaleString()}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between font-medium">
                    <span>合計金額</span>
                    <span className="text-lg">
                      ¥{booking.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">エスクロー保護</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700">72時間自動確認</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-700">満足保証</span>
                  </div>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    決済完了後、カメラマンが撮影を開始します。写真は撮影完了後24時間以内に配信されます。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* サポート情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">サポート</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-gray-600">
                  ご不明な点がございましたら、お気軽にお問い合わせください。
                </p>
                <div className="space-y-1">
                  <p>📧 support@shutterhub.jp</p>
                  <p>📞 03-1234-5678</p>
                  <p>🕒 平日 9:00-18:00</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
