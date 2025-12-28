import { createClient } from '@/lib/supabase/server';
import { checkInToSlot } from '@/app/actions/checkin';
import { CheckInResult } from '@/app/actions/checkin';
import { CheckInPageClient } from '@/components/checkin/CheckInPageClient';
import { getTranslations } from 'next-intl/server';

interface CheckInPageProps {
  params: Promise<{ locale: string; slotId: string }>;
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { locale, slotId } = await params;
  const t = await getTranslations('checkin');
  const supabase = await createClient();

  // スロット情報を取得
  const { data: slot, error: slotError } = await supabase
    .from('photo_session_slots')
    .select(
      `
      *,
      photo_session:photo_sessions(
        id,
        title,
        location,
        address
      )
    `
    )
    .eq('id', slotId)
    .single();

  if (slotError || !slot) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{t('slotNotFound')}</h1>
          <p className="text-muted-foreground">
            {t('slotNotFoundDescription')}
          </p>
        </div>
      </div>
    );
  }

  // チェックイン処理を実行
  const result: CheckInResult = await checkInToSlot(slotId);

  return <CheckInPageClient result={result} slot={slot} locale={locale} />;
}
