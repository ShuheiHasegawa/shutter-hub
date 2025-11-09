import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotoSessionReviewWrapper } from '@/components/reviews/PhotoSessionReviewWrapper';
import { LoadingCard } from '@/components/ui/loading-card';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Star } from 'lucide-react';
import { getPhotoSessionReviewByUser } from '@/app/actions/reviews';
import { logger } from '@/lib/utils/logger';

export default async function PhotoSessionReviewsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // 撮影会情報を取得
  const { data: session, error: sessionError } = await supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:organizer_id(
        id,
        email,
        display_name,
        avatar_url
      )
    `
    )
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (sessionError || !session) {
    notFound();
  }

  // ユーザーの予約を確認（確認済みのみ）
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id')
    .eq('photo_session_id', id)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .maybeSingle();

  // 予約取得エラー（予約がない場合は正常）
  if (bookingError && bookingError.code !== 'PGRST116') {
    // PGRST116は「データが見つからない」エラーなので正常
    // 他のエラーの場合はログに記録
    logger.error('予約取得エラー:', bookingError);
  }

  // レビュー可能かチェック
  const now = new Date();
  const endTime = new Date(session.end_time);
  const canWriteReview = !!booking && now >= endTime;

  // 既存のレビューを取得（編集用に全データを取得）
  const existingReviewResult = await getPhotoSessionReviewByUser(id, user.id);
  const existingReview = existingReviewResult.data;

  // 既存レビューがある場合は編集可能、ない場合は新規作成可能
  const canEditReview = canWriteReview && !!existingReview;
  const canWriteNewReview = canWriteReview && !existingReview;

  return (
    <AuthenticatedLayout>
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BackButton href={`/${locale}/photo-sessions/${id}`} />
              <Star className="h-5 w-5" />
              <CardTitle className="text-xl md:text-2xl">
                {session.title} - レビュー
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoadingCard />}>
              <PhotoSessionReviewWrapper
                photoSessionId={id}
                bookingId={booking?.id}
                canWriteReview={canWriteNewReview || canEditReview}
                existingReview={existingReview || undefined}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
