'use client';

import { CheckInResult } from '@/app/actions/checkin';
import { PhotoSessionSlot } from '@/types/photo-session';
import { PhotoSession } from '@/types/database';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, Clock, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeLocalized } from '@/lib/utils/date';
import Link from 'next/link';
import { CertificateGenerator } from './CertificateGenerator';

interface CheckInPageClientProps {
  result: CheckInResult;
  slot: PhotoSessionSlot & {
    photo_session: PhotoSession;
  };
  locale: string;
}

export function CheckInPageClient({
  result,
  slot,
  locale,
}: CheckInPageClientProps) {
  const t = useTranslations('checkin');

  const formatTime = (dateString: string) => {
    return formatDateTimeLocalized(new Date(dateString), locale);
  };

  const formatTimeOnly = (dateString: string) => {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            {result.success ? (
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
            )}
            <CardTitle className="text-2xl">{result.message}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* スロット情報 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                {slot.photo_session.title}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(slot.start_time)} -{' '}
                    {formatTimeOnly(slot.end_time)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{slot.photo_session.location}</span>
                </div>

                {slot.photo_session.address && (
                  <div className="text-muted-foreground ml-6">
                    {slot.photo_session.address}
                  </div>
                )}
              </div>
            </div>

            {/* チェックイン状態 */}
            {result.success && (
              <div className="space-y-2">
                {result.type === 'checkin' && result.checked_in_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span>
                      {t('checkedInAt')}: {formatTime(result.checked_in_at)}
                    </span>
                  </div>
                )}

                {result.type === 'checkout' && result.checked_out_at && (
                  <div className="space-y-2">
                    {result.checked_in_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span>
                          {t('checkedInAt')}: {formatTime(result.checked_in_at)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>
                        {t('checkedOutAt')}: {formatTime(result.checked_out_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* エラー時の説明 */}
            {!result.success && result.type === 'already_completed' && (
              <div className="text-sm text-muted-foreground">
                {result.checked_in_at && (
                  <p>
                    {t('checkedInAt')}: {formatTime(result.checked_in_at)}
                  </p>
                )}
                {result.checked_out_at && (
                  <p>
                    {t('checkedOutAt')}: {formatTime(result.checked_out_at)}
                  </p>
                )}
              </div>
            )}

            {/* 入場証明書（チェックイン成功時のみ） */}
            {result.success &&
              result.type === 'checkin' &&
              result.checked_in_at && (
                <div className="mt-6">
                  <CertificateGenerator
                    slot={slot}
                    checkedInAt={result.checked_in_at}
                    locale={locale}
                  />
                </div>
              )}

            {/* アクションボタン */}
            <div className="flex flex-col gap-2">
              {result.success && result.type === 'checkin' && (
                <Link
                  href={`/${locale}/photo-sessions/${slot.photo_session.id}`}
                >
                  <Button className="w-full" variant="default">
                    {t('viewSessionDetails')}
                  </Button>
                </Link>
              )}

              <Link href={`/${locale}/photo-sessions/${slot.photo_session.id}`}>
                <Button className="w-full" variant="outline">
                  {t('backToSession')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
