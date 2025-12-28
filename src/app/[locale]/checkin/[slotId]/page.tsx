import { createClient } from '@/lib/supabase/server';
import { checkInToSlot } from '@/app/actions/checkin';
import { CheckInResult } from '@/app/actions/checkin';
import { CheckInPageClient } from '@/components/checkin/CheckInPageClient';
import { getTranslations } from 'next-intl/server';
import { requireAuthForAction } from '@/lib/auth/server-actions';

interface CheckInPageProps {
  params: Promise<{ locale: string; slotId: string }>;
  searchParams: Promise<{ action?: string }>;
}

export default async function CheckInPage({
  params,
  searchParams,
}: CheckInPageProps) {
  const { locale, slotId } = await params;
  const { action } = await searchParams;
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

  // actionパラメータがない場合は、チェックイン状態を表示するだけ
  // QRコードスキャン時のみactionパラメータ付きでアクセスされる
  if (!action || action !== 'scan') {
    // 認証ユーザーを取得（運営者がアクセスする場合もあるため、認証は必須ではない）
    const authResult = await requireAuthForAction();
    let booking = null;

    if (authResult.success) {
      // 認証済みユーザーの場合、そのユーザーの予約を取得
      const { data: userBooking } = await supabase
        .from('bookings')
        .select('checked_in_at, checked_out_at')
        .eq('slot_id', slotId)
        .eq('user_id', authResult.data.user.id)
        .eq('status', 'confirmed')
        .maybeSingle();

      booking = userBooking;
    } else {
      // 未認証の場合は予約を取得しない（運営者がアクセスする場合など）
      // この場合は予約が見つからない状態として扱う
    }

    return (
      <CheckInPageClient
        result={
          booking
            ? {
                success: true,
                message: booking.checked_out_at
                  ? t('checkedOut')
                  : booking.checked_in_at
                    ? t('checkedInStatus')
                    : t('notCheckedIn'),
                type: booking.checked_out_at
                  ? 'already_completed'
                  : booking.checked_in_at
                    ? 'checkin'
                    : undefined,
                checked_in_at: booking.checked_in_at,
                checked_out_at: booking.checked_out_at,
              }
            : {
                success: false,
                message: t('bookingNotFound'),
              }
        }
        slot={slot}
        locale={locale}
      />
    );
  }

  // action=scanの場合のみチェックイン処理を実行
  const result: CheckInResult = await checkInToSlot(slotId);

  return <CheckInPageClient result={result} slot={slot} locale={locale} />;
}
