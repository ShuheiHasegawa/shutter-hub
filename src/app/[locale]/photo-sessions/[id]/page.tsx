import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotoSessionDetail } from '@/components/photo-sessions/PhotoSessionDetail';
import { LoadingCard } from '@/components/ui/loading-card';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { logger } from '@/lib/utils/logger';
import { getCurrentUser } from '@/lib/auth/server';
import {
  formatStudioData,
  fetchSlotBookingCounts,
  getUserBookingFromList,
  logSlotsDebugInfo,
} from '@/lib/photo-sessions';

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
      // 撮影会情報を取得（is_publishedフィルタなしで取得）
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

  // アクセス権限チェック: 公開済み OR 開催者自身のみアクセス可能
  const isOrganizer = user?.id === session.organizer_id;
  if (!session.is_published && !isOrganizer) {
    // 未公開かつ開催者でない場合は404を返す
    notFound();
  }
  const slots = slotsResult.data || [];
  const userBookings = userBookingResult.data || [];
  const studioData = studioResult.data;

  // データ整形（ヘルパー関数を使用）
  const userBooking = getUserBookingFromList(userBookings);
  const studio = formatStudioData(studioData);

  // スロット予約数取得（ヘルパー関数を使用）
  const slotBookingCounts = await fetchSlotBookingCounts(supabase, id, slots);

  // 開発環境ログ（ヘルパー関数を使用）
  logSlotsDebugInfo(id, slots);

  if (slotsResult.error) {
    logger.error('[PhotoSessionPage] スロット取得エラー:', slotsResult.error);
  }

  return (
    <AuthenticatedLayout allowPublic={true}>
      <div>
        <Suspense fallback={<LoadingCard />}>
          <PhotoSessionDetail
            session={session}
            slots={slots}
            userBooking={userBooking}
            studio={studio}
            slotBookingCounts={slotBookingCounts}
          />
        </Suspense>
      </div>
    </AuthenticatedLayout>
  );
}
