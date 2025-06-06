import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, MapPin, Camera, Users } from 'lucide-react';
import type { InstantBooking } from '@/types/instant-photo';

// 拡張された予約型定義
interface ExtendedBooking extends InstantBooking {
  instant_photo_requests?: {
    id: string;
    guest_name: string;
    guest_phone: string;
    guest_email?: string;
    party_size: number;
    location_address: string;
    location_landmark?: string;
    request_type: string;
    urgency: string;
    duration: number;
    special_requests?: string;
    status: string;
    created_at: string;
  };
  profiles?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
  };
}

interface PageProps {
  params: {
    locale: string;
    bookingId: string;
  };
  searchParams: {
    guestPhone?: string;
  };
}

// 予約情報を取得
async function getBookingDetails(
  bookingId: string,
  guestPhone?: string
): Promise<{
  booking: ExtendedBooking | null;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // 予約情報を取得
    const { data: booking, error: bookingError } = await supabase
      .from('instant_bookings')
      .select(
        `
        *,
        instant_photo_requests!inner (
          id,
          guest_name,
          guest_phone,
          guest_email,
          party_size,
          location_address,
          location_landmark,
          request_type,
          urgency,
          duration,
          special_requests,
          status,
          created_at
        ),
        profiles!photographer_id (
          id,
          display_name,
          avatar_url,
          bio
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { booking: null, error: '予約が見つかりません' };
    }

    // ゲストの電話番号が一致するかチェック（セキュリティ）
    if (
      guestPhone &&
      booking.instant_photo_requests?.guest_phone !== guestPhone
    ) {
      return { booking: null, error: 'アクセス権限がありません' };
    }

    // 決済ステータスチェック
    if (booking.payment_status === 'paid') {
      return { booking: null, error: '既に決済が完了しています' };
    }

    return { booking: booking as ExtendedBooking };
  } catch (error) {
    console.error('予約情報取得エラー:', error);
    return { booking: null, error: 'データの取得に失敗しました' };
  }
}

// 予約詳細表示コンポーネント
function BookingDetails({ booking }: { booking: ExtendedBooking }) {
  const request = booking.instant_photo_requests;
  const photographer = booking.profiles;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          撮影予約詳細
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">ゲスト情報</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">お名前:</span>{' '}
                {request?.guest_name}
              </p>
              <p>
                <span className="text-gray-600">電話番号:</span>{' '}
                {request?.guest_phone}
              </p>
              {request?.guest_email && (
                <p>
                  <span className="text-gray-600">メール:</span>{' '}
                  {request.guest_email}
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">カメラマン情報</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">お名前:</span>{' '}
                {photographer?.display_name || 'カメラマン'}
              </p>
              {photographer?.bio && (
                <p className="text-gray-600 text-xs">{photographer.bio}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* 撮影詳細 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">撮影詳細</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-500" />
              <span>撮影タイプ:</span>
              <Badge variant="outline">
                {request?.request_type === 'portrait'
                  ? 'ポートレート'
                  : request?.request_type === 'couple'
                    ? 'カップル・友人'
                    : request?.request_type === 'family'
                      ? 'ファミリー'
                      : 'グループ'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span>参加人数:</span>
              <span className="font-medium">{request?.party_size}名</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>撮影時間:</span>
              <span className="font-medium">{request?.duration}分</span>
            </div>

            <div className="flex items-center gap-2">
              <span>緊急度:</span>
              <Badge
                variant={
                  request?.urgency === 'now'
                    ? 'destructive'
                    : request?.urgency === 'within_30min'
                      ? 'default'
                      : 'secondary'
                }
              >
                {request?.urgency === 'now'
                  ? '今すぐ'
                  : request?.urgency === 'within_30min'
                    ? '30分以内'
                    : '1時間以内'}
              </Badge>
            </div>
          </div>

          {/* 場所情報 */}
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
            <div>
              <span className="text-gray-600">撮影場所:</span>
              <p className="font-medium">{request?.location_address}</p>
              {request?.location_landmark && (
                <p className="text-gray-600 text-xs">
                  目印: {request.location_landmark}
                </p>
              )}
            </div>
          </div>

          {/* 特別なリクエスト */}
          {request?.special_requests && (
            <div className="text-sm">
              <span className="text-gray-600">特別なリクエスト:</span>
              <p className="mt-1 p-2 bg-gray-50 rounded text-gray-800">
                {request.special_requests}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// メインページコンポーネント
export default async function InstantPaymentPage({
  params,
  searchParams,
}: PageProps) {
  const { booking, error } = await getBookingDetails(
    params.bookingId,
    searchParams.guestPhone
  );

  if (error || !booking) {
    redirect(
      `/instant?error=${encodeURIComponent(error || '予約が見つかりません')}`
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">エスクロー決済</h1>
        <p className="text-gray-600 mt-2">
          撮影の安全な決済を行います。決済は一時的に預託され、撮影完了・写真受取確認後にカメラマンに支払われます。
        </p>
      </div>

      {/* 予約詳細 */}
      <BookingDetails booking={booking} />

      {/* 決済フォーム準備中 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔒 エスクロー決済
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            安全なエスクロー決済システムの統合準備中です...
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              💡
              決済は一時的に預託され、写真受取確認後にカメラマンに支払われます
            </p>
          </div>
          <p className="text-sm text-gray-500">予約ID: {params.bookingId}</p>
        </CardContent>
      </Card>
    </div>
  );
}
