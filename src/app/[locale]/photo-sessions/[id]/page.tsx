import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotoSessionDetail } from '@/components/photo-sessions/PhotoSessionDetail';
import { LoadingCard } from '@/components/ui/loading-card';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { logger } from '@/lib/utils/logger';
import { getCurrentUser } from '@/lib/auth/server';

export default async function PhotoSessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // ユーザー情報を取得（認証チェック用）
  const user = await getCurrentUser();

  // 並列でデータを取得
  const [sessionResult, slotsResult, userBookingResult, studioResult] =
    await Promise.all([
      // 撮影会情報を取得
      supabase
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
        .single(),

      // 撮影枠情報を取得
      supabase
        .from('photo_session_slots')
        .select('*')
        .eq('photo_session_id', id)
        .eq('is_active', true)
        .order('slot_number'),

      // ユーザーの既存予約を取得（ログインしている場合のみ、複数予約対応）
      // スロット情報も含める
      user
        ? supabase
            .from('bookings')
            .select(
              `
              *,
              slot:photo_session_slots(
                id,
                slot_number,
                start_time,
                end_time,
                price_per_person
              )
            `
            )
            .eq('photo_session_id', id)
            .eq('user_id', user.id)
            .in('status', ['confirmed', 'pending'])
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),

      // スタジオ情報を取得
      supabase
        .from('photo_session_studios')
        .select(
          `
        studio_id,
        studios!inner(
          id,
          name
        )
      `
        )
        .eq('photo_session_id', id)
        .maybeSingle(),
    ]);

  // 撮影会情報のエラーチェック
  if (sessionResult.error || !sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data;
  const slots = slotsResult.data || [];
  const userBookings = userBookingResult.data || [];
  const studioData = studioResult.data;

  // 後方互換性のため、最初の予約をuserBookingとして保持
  const userBooking =
    Array.isArray(userBookings) && userBookings.length > 0
      ? userBookings[0]
      : null;

  // スタジオ情報を整形
  const studio = studioData?.studios
    ? Array.isArray(studioData.studios)
      ? {
          id: (studioData.studios[0] as { id: string; name: string })?.id,
          name: (studioData.studios[0] as { id: string; name: string })?.name,
        }
      : {
          id: (studioData.studios as { id: string; name: string }).id,
          name: (studioData.studios as { id: string; name: string }).name,
        }
    : null;

  // データ検証ログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && slots) {
    logger.debug('[PhotoSessionPage] スロットデータ検証:', {
      sessionId: id,
      slotsCount: slots.length,
      slots: slots.map(slot => ({
        id: slot.id,
        slot_number: slot.slot_number,
        current_participants: slot.current_participants,
        max_participants: slot.max_participants,
        isFull: slot.current_participants >= slot.max_participants,
      })),
    });
  }

  if (slotsResult.error) {
    logger.error('[PhotoSessionPage] スロット取得エラー:', slotsResult.error);
  }

  return (
    <AuthenticatedLayout>
      <div>
        <Suspense fallback={<LoadingCard />}>
          <PhotoSessionDetail
            session={session}
            slots={slots}
            userBooking={userBooking}
            studio={studio}
          />
        </Suspense>
      </div>
    </AuthenticatedLayout>
  );
}
