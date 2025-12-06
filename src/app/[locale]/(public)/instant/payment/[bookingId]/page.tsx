import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { EscrowPaymentSection } from '@/components/instant/EscrowPaymentSection';
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
import { logger } from '@/lib/utils/logger';
import type { ExtendedBooking } from '@/types/instant-photo';

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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id <= currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  step.id < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function PaymentPage({ params }: PageProps) {
  const { bookingId } = await params;
  const supabase = await createClient();

  // 予約情報を取得
  const { data: bookingData, error: bookingError } = await supabase
    .from('instant_bookings')
    .select(
      `
      *,
      request:instant_photo_requests(*)
    `
    )
    .eq('id', bookingId)
    .single();

  if (bookingError || !bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">予約情報が見つかりません</h1>
          <p className="text-sm">
            bookingId: <code className="px-1 py-0.5 rounded">{bookingId}</code>
          </p>
          {bookingError?.message && (
            <p className="text-xs text-red-600 break-all">
              {bookingError.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // カメラマン情報を別途取得
  let photographer = null;
  if (bookingData.photographer_id) {
    const { data: photographerData, error: photographerError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, bio, is_verified')
      .eq('id', bookingData.photographer_id)
      .single();
    if (photographerError) {
      logger.error('photographerData fetch error:', photographerError);
    }
    photographer = photographerData;
  }

  const booking = {
    ...bookingData,
    photographer,
  } as ExtendedBooking;

  // セキュリティチェック: ゲストの電話番号が一致するかを確認
  // 実際の実装では、セッション或いはワンタイムトークンでの認証が必要
  const guestPhone = booking.request?.guest_phone;
  if (!guestPhone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">ゲスト情報が不足しています</h1>
          <p className="text-sm text-muted-foreground">
            この予約にはゲストの電話番号 (guest_phone)
            が設定されていないため、決済ページを開けません。
          </p>
          <p className="text-xs text-muted-foreground">
            bookingId:{' '}
            <code className="px-1 py-0.5 bg-muted rounded">{bookingId}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="container mx-auto px-4 max-w-4xl py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">エスクロー決済</h1>
          <p className="text-muted-foreground">
            安全な取引のため、写真受取確認後に決済が完了されます
          </p>
        </div>

        {/* ステップインジケーター */}
        <PaymentStepIndicator currentStep={1} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側: 予約詳細 */}
          <div className="lg:col-span-2 space-y-6">
            {/* エスクロー説明 */}
            <Alert className="border-primary/20 bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
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
                  {booking.photographer?.avatar_url ? (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden">
                      <Image
                        src={booking.photographer.avatar_url}
                        alt={booking.photographer.display_name || 'カメラマン'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">
                      {booking.photographer?.display_name || '未割り当て'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>📷 即座撮影対応</span>
                      {booking.photographer?.is_verified && (
                        <Badge variant="secondary">認証済み</Badge>
                      )}
                    </div>
                    {booking.photographer?.bio && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {booking.photographer.bio}
                      </p>
                    )}
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
                    <label className="text-sm font-medium text-muted-foreground">
                      ゲスト名
                    </label>
                    <p>{booking.request?.guest_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      参加人数
                    </label>
                    <p>{booking.request?.party_size}名</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      撮影タイプ
                    </label>
                    <p>
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
                    <label className="text-sm font-medium text-muted-foreground">
                      撮影時間
                    </label>
                    <p>{booking.request?.duration}分</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    撮影場所
                  </label>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p>
                      {booking.request?.location_address ||
                        `${booking.request?.location_lat}, ${booking.request?.location_lng}`}
                    </p>
                  </div>
                  {booking.request?.location_landmark && (
                    <p className="text-sm text-muted-foreground ml-6">
                      📍 {booking.request.location_landmark}
                    </p>
                  )}
                </div>

                {booking.request?.special_requests && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        特別なリクエスト
                      </label>
                      <p className="mt-1">{booking.request.special_requests}</p>
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
                <EscrowPaymentSection
                  booking={booking}
                  bookingId={bookingId}
                  guestPhone={guestPhone}
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
                    <span>¥{booking.total_amount.toLocaleString()}</span>
                  </div>

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
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span>エスクロー保護</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>72時間自動確認</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>満足保証</span>
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
                <p className="text-muted-foreground">
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
