import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotoSessionDetail } from '@/components/photo-sessions/PhotoSessionDetail';
import { LoadingCard } from '@/components/ui/loading-card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

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

  // スロット情報を取得
  const { data: slots } = await supabase
    .from('photo_session_slots')
    .select('*')
    .eq('photo_session_id', id)
    .eq('is_active', true)
    .order('slot_number');

  return (
    <DashboardLayout>
      <div>
        <Suspense fallback={<LoadingCard />}>
          <PhotoSessionDetail session={session} slots={slots || []} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
