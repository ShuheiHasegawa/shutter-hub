import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotoSessionBookingForm } from '@/components/photo-sessions/PhotoSessionBookingForm';
import { WaitlistForm } from '@/components/photo-sessions/WaitlistForm';
import { PhotoSessionReviewWrapper } from '@/components/reviews/PhotoSessionReviewWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { getTranslations } from 'next-intl/server';

interface PhotoSessionDetailPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function PhotoSessionDetailPage({
  params,
}: PhotoSessionDetailPageProps) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations('photoSessions');

  // 撮影会情報を取得
  const { data: session, error } = await supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:profiles!photo_sessions_organizer_id_fkey(
        id,
        display_name,
        email,
        avatar_url
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !session) {
    notFound();
  }

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ユーザーの予約情報を取得（レビュー投稿権限チェック用）
  let userBooking = null;
  let canWriteReview = false;

  if (user) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('photo_session_id', id)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .single();

    userBooking = booking;

    // 撮影会が終了していて、参加していて、まだレビューを書いていない場合のみレビュー投稿可能
    const now = new Date();
    const endTime = new Date(session.end_time);
    const hasParticipated = !!booking;
    const sessionEnded = endTime < now;

    if (hasParticipated && sessionEnded) {
      // 既存のレビューをチェック
      const { data: existingReview } = await supabase
        .from('photo_session_reviews')
        .select('id')
        .eq('photo_session_id', id)
        .eq('reviewer_id', user.id)
        .single();

      canWriteReview = !existingReview;
    }
  }

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">{t('status.ended')}</Badge>;
    }
    if (isOngoing) {
      return <Badge variant="default">{t('status.ongoing')}</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline">{t('status.upcoming')}</Badge>;
    }
    return null;
  };

  const getAvailabilityBadge = () => {
    const available = session.max_participants - session.current_participants;
    if (available <= 0) {
      return <Badge variant="destructive">{t('availability.full')}</Badge>;
    }
    if (available <= 2) {
      return <Badge variant="secondary">{t('availability.fewLeft')}</Badge>;
    }
    return <Badge variant="outline">{t('availability.available')}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/photo-sessions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('list.title')}に戻る
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-2xl">{session.title}</CardTitle>
                <div className="flex gap-2">
                  {getStatusBadge()}
                  {!session.is_published && (
                    <Badge variant="outline">{t('status.unpublished')}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {session.description && (
                <div>
                  <h3 className="font-semibold mb-2">
                    {t('form.descriptionLabel')}
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {session.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div>{formatDateLocalized(startDate, locale, 'long')}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeLocalized(startDate, locale)} -{' '}
                      {formatTimeLocalized(endDate, locale)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div>{session.location}</div>
                    {session.address && (
                      <div className="text-sm text-muted-foreground">
                        {session.address}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div>
                      {session.current_participants}/{session.max_participants}
                      人
                    </div>
                    {getAvailabilityBadge()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    {session.price_per_person === 0
                      ? '無料'
                      : `¥${session.price_per_person.toLocaleString()}`}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">主催者</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {session.organizer.avatar_url ? (
                      <img
                        src={session.organizer.avatar_url}
                        alt={
                          session.organizer.display_name ||
                          session.organizer.email
                        }
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {session.organizer.display_name ||
                        session.organizer.email}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* レビューセクション */}
          <PhotoSessionReviewWrapper
            photoSessionId={session.id}
            bookingId={userBooking?.id}
            canWriteReview={canWriteReview}
          />
        </div>

        {/* 予約・キャンセル待ちフォーム */}
        <div className="space-y-6">
          {session.current_participants < session.max_participants ? (
            <PhotoSessionBookingForm session={session} />
          ) : (
            <WaitlistForm photoSessionId={session.id} />
          )}
        </div>
      </div>
    </div>
  );
}
