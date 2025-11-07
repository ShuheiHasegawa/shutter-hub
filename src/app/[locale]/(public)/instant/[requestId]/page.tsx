import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getInstantPhotoRequest,
  checkPhotographerTimeout,
} from '@/app/actions/instant-photo';
import { InstantRequestDetailClient } from '@/components/instant/InstantRequestDetailClient';

interface PageProps {
  params: Promise<{
    locale: string;
    requestId: string;
  }>;
}

export default async function InstantRequestDetailPage({ params }: PageProps) {
  const { requestId } = await params;
  const supabase = await createClient();

  // リクエスト情報を取得
  const requestResult = await getInstantPhotoRequest(requestId);

  if (!requestResult.success || !requestResult.data) {
    redirect('/instant');
  }

  const request = requestResult.data;

  // タイムアウトチェック（ページ読み込み時）
  if (request.status === 'photographer_accepted') {
    await checkPhotographerTimeout(requestId);
    // タイムアウト処理後、最新状態を再取得
    const updatedResult = await getInstantPhotoRequest(requestId);
    if (updatedResult.success && updatedResult.data) {
      // タイムアウトでpendingに戻った場合は、最新のrequestを使用
      if (updatedResult.data.status === 'pending') {
        // タイムアウトでpendingに戻った場合の処理
      }
    }
  }

  // フォトグラファー情報を取得（承認待ちの場合）
  let photographer = null;
  if (
    request.status === 'photographer_accepted' &&
    request.pending_photographer_id
  ) {
    const { data: photographerProfile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, bio')
      .eq('id', request.pending_photographer_id)
      .single();

    if (photographerProfile) {
      // 平均評価を取得
      const { data: ratings } = await supabase
        .from('instant_bookings')
        .select('guest_rating')
        .eq('photographer_id', request.pending_photographer_id)
        .not('guest_rating', 'is', null);

      const averageRating =
        ratings && ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.guest_rating || 0), 0) /
            ratings.length
          : undefined;

      photographer = {
        id: photographerProfile.id,
        display_name: photographerProfile.display_name,
        avatar_url: photographerProfile.avatar_url,
        bio: photographerProfile.bio,
        average_rating: averageRating,
      };
    }
  }

  return (
    <InstantRequestDetailClient
      initialRequest={request}
      photographer={photographer}
    />
  );
}
