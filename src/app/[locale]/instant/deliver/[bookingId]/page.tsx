import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotoDeliveryForm } from '@/components/instant/PhotoDeliveryForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Camera, Users } from 'lucide-react';
import type { InstantBooking } from '@/types/instant-photo';

interface PageProps {
  params: {
    locale: string;
    bookingId: string;
  };
}

// 予約情報を取得（カメラマン認証付き）
async function getBookingForPhotographer(bookingId: string): Promise<{
  booking: InstantBooking | null;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { booking: null, error: '認証が必要です' };
    }

    // 予約情報を取得（カメラマン本人のもののみ）
    const { data: booking, error: bookingError } = await supabase
      .from('instant_bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('photographer_id', user.id)
      .single();

    if (bookingError || !booking) {
      return { booking: null, error: '予約が見つかりません' };
    }

    return { booking: booking as InstantBooking };
  } catch (error) {
    console.error('予約情報取得エラー:', error);
    return { booking: null, error: 'データの取得に失敗しました' };
  }
}

export default async function PhotoDeliveryPage({ params }: PageProps) {
  const { booking, error } = await getBookingForPhotographer(params.bookingId);

  if (error || !booking) {
    redirect(
      `/dashboard?error=${encodeURIComponent(error || '予約が見つかりません')}`
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">写真配信</h1>
        <p className="text-gray-600 mt-2">
          撮影した写真をゲストに配信してください。配信後、ゲストの受取確認をお待ちください。
        </p>
      </div>

      {/* 予約詳細 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            撮影詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-500" />
              <span>予約ID:</span>
              <span className="font-mono text-xs">{booking.id}</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span>ステータス:</span>
              <Badge variant="outline">{booking.payment_status}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>合計金額:</span>
              <span className="font-medium">
                ¥{booking.total_amount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>あなたの収益:</span>
              <span className="font-medium text-green-600">
                ¥{booking.photographer_earnings.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 写真配信フォーム */}
      <PhotoDeliveryForm
        booking={booking}
        onSuccess={() => {
          // 配信成功時の処理
          window.location.href = `/dashboard?success=${encodeURIComponent('写真配信が完了しました')}`;
        }}
        onError={(error: string) => {
          console.error('配信エラー:', error);
        }}
      />
    </div>
  );
}
