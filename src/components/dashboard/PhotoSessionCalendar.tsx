'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  CalendarProvider,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  CalendarHeader,
  CalendarBody,
  CalendarItem,
  type Feature,
} from '@/components/ui/shadcn-io/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// PhotoSessionの型（既存の型を使用）
type PhotoSessionData = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  booking_type:
    | 'first_come'
    | 'lottery'
    | 'management'
    | 'priority'
    | 'waitlist';
  current_participants: number;
  max_participants: number;
  is_full: boolean;
};

type PhotoSessionCalendarProps = {
  sessions: PhotoSessionData[];
};

/**
 * 撮影会の予約状況に応じて色を決定する
 */
const getSessionStatusColor = (session: PhotoSessionData): string => {
  if (session.is_full) return '#EF4444'; // red - 満席

  switch (session.booking_type) {
    case 'first_come':
      return '#10B981'; // green - 先着順（空きあり）
    case 'lottery':
      return '#3B82F6'; // blue - 抽選
    case 'management':
      return '#8B5CF6'; // purple - 管理抽選
    case 'priority':
      return '#F59E0B'; // orange - 優先予約
    case 'waitlist':
      return '#EF4444'; // red - キャンセル待ち
    default:
      return '#6B7280'; // gray - その他
  }
};

/**
 * 撮影会の状態ラベルを取得する
 */
const getSessionStatusLabel = (
  session: PhotoSessionData,
  t: (key: string) => string
): string => {
  if (session.is_full) return t('full');

  switch (session.booking_type) {
    case 'first_come':
      return t('firstCome');
    case 'lottery':
      return t('lottery');
    case 'management':
      return t('management');
    case 'priority':
      return t('priority');
    case 'waitlist':
      return t('waitlist');
    default:
      return t('unknown');
  }
};

/**
 * 撮影会データをカレンダー用Featureに変換する
 */
const transformSessionsToFeatures = (
  sessions: PhotoSessionData[],
  t: (key: string) => string
): Feature[] => {
  return sessions.map(session => ({
    id: session.id,
    name: session.title,
    startAt: new Date(session.start_time),
    endAt: new Date(session.end_time),
    status: {
      id: session.booking_type,
      name: getSessionStatusLabel(session, t),
      color: getSessionStatusColor(session),
    },
  }));
};

export function PhotoSessionCalendar({ sessions }: PhotoSessionCalendarProps) {
  const router = useRouter();
  const t = useTranslations('photoSessions');
  const tStatus = useTranslations('photoSessions.status');

  // 撮影会データをカレンダー用に変換
  const features = transformSessionsToFeatures(sessions, tStatus);

  // 年の範囲を計算（データが存在する年を含む）
  const currentYear = new Date().getFullYear();
  const sessionsYears = sessions.map(s => new Date(s.start_time).getFullYear());
  const minYear = Math.min(currentYear - 1, ...sessionsYears);
  const maxYear = Math.max(currentYear + 1, ...sessionsYears);

  /**
   * 撮影会アイテムクリック時の処理
   */
  const handleFeatureClick = (feature: Feature) => {
    router.push(`/photo-sessions/${feature.id}`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{t('calendar')}</CardTitle>
      </CardHeader>
      <CardContent>
        <CalendarProvider locale="ja-JP" startDay={0} className="w-full">
          <CalendarDate>
            {/* PC表示（md以上）: 横並びレイアウト */}
            <div className="hidden md:flex items-center justify-between gap-4 mb-4">
              <CalendarDatePicker>
                <div className="flex items-center gap-2">
                  <CalendarYearPicker end={maxYear} start={minYear} />
                  <CalendarMonthPicker />
                </div>
              </CalendarDatePicker>
              <CalendarDatePagination />
            </div>

            {/* モバイル表示（md未満）: コンパクトレイアウト */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDatePicker>
                  <div className="w-20 [&_button]:!w-20 [&_button]:!min-w-20 [&_button]:text-xs [&_button]:px-2 [&_button]:py-1 [&_button]:h-7">
                    <CalendarYearPicker end={maxYear} start={minYear} />
                  </div>
                </CalendarDatePicker>
                <CalendarDatePicker>
                  <div className="w-20 [&_button]:!w-20 [&_button]:!min-w-20 [&_button]:text-xs [&_button]:px-2 [&_button]:py-1 [&_button]:h-7">
                    <CalendarMonthPicker />
                  </div>
                </CalendarDatePicker>
              </div>
              <div className="flex-shrink-0">
                <CalendarDatePagination />
              </div>
            </div>
          </CalendarDate>
          <CalendarHeader />
          <CalendarBody features={features} onFeatureClick={handleFeatureClick}>
            {({ feature }) => (
              <CalendarItem
                feature={feature}
                key={feature.id}
                className="hover:bg-accent/50 rounded px-1 py-0.5 transition-colors"
              />
            )}
          </CalendarBody>
        </CalendarProvider>

        {/* 凡例 */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>{tStatus('firstCome')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>{tStatus('lottery')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span>{tStatus('management')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span>{tStatus('priority')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>{tStatus('full')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-500" />
            <span>{tStatus('cancelled')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
