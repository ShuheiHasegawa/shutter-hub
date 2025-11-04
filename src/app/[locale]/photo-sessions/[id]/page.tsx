import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotoSessionDetail } from '@/components/photo-sessions/PhotoSessionDetail';
import { LoadingCard } from '@/components/ui/loading-card';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { logger } from '@/lib/utils/logger';

export default async function PhotoSessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 撮影会情報を取得
  const { data: session, error } = await supabase
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

  if (error || !session) {
    notFound();
  }

  // 撮影枠情報を取得
  const { data: slots, error: slotsError } = await supabase
    .from('photo_session_slots')
    .select('*')
    .eq('photo_session_id', id)
    .eq('is_active', true)
    .order('slot_number');

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

  if (slotsError) {
    logger.error('[PhotoSessionPage] スロット取得エラー:', slotsError);
  }

  return (
    <AuthenticatedLayout>
      <div>
        <Suspense fallback={<LoadingCard />}>
          <PhotoSessionDetail session={session} slots={slots || []} />
        </Suspense>
      </div>
    </AuthenticatedLayout>
  );
}
