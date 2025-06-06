import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DeliveryConfirmationForm } from '@/components/instant/DeliveryConfirmationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Download, ExternalLink } from 'lucide-react';
import type { InstantBooking } from '@/types/instant-photo';

// 拡張型定義
interface ExtendedBooking extends InstantBooking {
  photo_deliveries?: Array<{
    id: string;
    delivery_method: string;
    photo_count: number;
    external_url?: string;
    external_service?: string;
    external_password?: string;
    photographer_message?: string;
    delivered_at: string;
  }>;
}

// 予約と配信情報を取得
async function getDeliveryDetails(bookingId: string): Promise<{
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
        photo_deliveries (
          id,
          delivery_method,
          photo_count,
          external_url,
          external_service,
          external_password,
          photographer_message,
          delivered_at
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { booking: null, error: '予約が見つかりません' };
    }

    // 配信されているかチェック
    if (!booking.photo_deliveries || booking.photo_deliveries.length === 0) {
      return { booking: null, error: 'まだ写真が配信されていません' };
    }

    return { booking: booking as ExtendedBooking };
  } catch (error) {
    console.error('配信情報取得エラー:', error);
    return { booking: null, error: 'データの取得に失敗しました' };
  }
}

export default async function DeliveryConfirmationPage({
  params,
}: {
  params: {
    locale: string;
    bookingId: string;
  };
}) {
  const { booking, error } = await getDeliveryDetails(params.bookingId);

  if (error || !booking) {
    redirect(
      `/instant?error=${encodeURIComponent(error || '予約が見つかりません')}`
    );
  }

  const delivery = booking.photo_deliveries?.[0];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">写真受取確認</h1>
        <p className="text-gray-600 mt-2">
          カメラマンから写真が配信されました。内容をご確認の上、受取確認とレビューをお願いします。
        </p>
      </div>

      {/* 配信詳細 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📷 配信された写真
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>写真枚数:</span>
              <span className="font-medium">{delivery?.photo_count}枚</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>配信日時:</span>
              <span className="font-medium">
                {delivery?.delivered_at
                  ? new Date(delivery.delivered_at).toLocaleString('ja-JP')
                  : '-'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>配信方法:</span>
              <Badge variant="outline">
                {delivery?.delivery_method === 'external_url'
                  ? '外部サービス'
                  : '直接アップロード'}
              </Badge>
            </div>

            {delivery?.external_service && (
              <div className="flex items-center gap-2">
                <span>サービス:</span>
                <Badge variant="secondary">{delivery.external_service}</Badge>
              </div>
            )}
          </div>

          {/* ダウンロードリンク */}
          {delivery?.external_url && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">写真ダウンロード</h4>
              <a
                href={delivery.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {delivery.delivery_method === 'external_url' ? (
                  <ExternalLink className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                写真をダウンロード
              </a>

              {delivery.external_password && (
                <p className="text-xs text-gray-600 mt-2">
                  パスワード:
                  <code className="bg-gray-100 px-1 rounded ml-1">
                    {delivery.external_password}
                  </code>
                </p>
              )}
            </div>
          )}

          {/* カメラマンからのメッセージ */}
          {delivery?.photographer_message && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">カメラマンからのメッセージ</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-700 text-sm">
                  {delivery.photographer_message}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 受取確認フォーム */}
      <DeliveryConfirmationForm
        booking={booking}
        onSuccess={() => {
          // 確認成功時の処理
          window.location.href = `/instant?success=${encodeURIComponent('受取確認が完了しました！ありがとうございました。')}`;
        }}
        onError={(error: string) => {
          console.error('確認エラー:', error);
        }}
      />
    </div>
  );
}
