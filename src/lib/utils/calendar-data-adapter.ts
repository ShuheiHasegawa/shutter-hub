/**
 * 既存の予定データをカレンダー表示用に変換するアダプター
 */

import type { UpcomingEvent } from '@/app/actions/dashboard-stats';
import type { PhotoSessionCalendarData } from '@/app/actions/photo-sessions-calendar';

/**
 * UpcomingEventをPhotoSessionCalendarDataに変換する
 * 既存の「今後の予定」データをカレンダーで再利用するため
 */
export function adaptUpcomingEventsToCalendarData(
  events: UpcomingEvent[]
): PhotoSessionCalendarData[] {
  return events
    .filter(event => event.type === 'photo_session') // 撮影会のみを対象
    .map(event => ({
      id: event.id,
      title: event.title,
      start_time: event.startTime,
      // end_timeは推定値（2時間後）を使用
      end_time: new Date(
        new Date(event.startTime).getTime() + 2 * 60 * 60 * 1000
      ).toISOString(),
      // booking_typeはUpcomingEventには含まれないため、デフォルト値
      booking_type: 'first_come' as const,
      // current_participants, max_participantsも推定値
      current_participants: event.participantsCount || 0,
      max_participants: event.participantsCount || 10, // デフォルト値
      is_full: false, // UpcomingEventには満席情報がないため
    }));
}

/**
 * カレンダー用のFeatureオブジェクトに変換する
 * PhotoSessionCalendarコンポーネント用
 */
export function transformEventsToCalendarFeatures(
  events: UpcomingEvent[],
  getStatusLabel: (eventType: string, status?: string) => string
) {
  return events
    .filter(event => event.type === 'photo_session')
    .map(event => ({
      id: event.id,
      name: event.title,
      startAt: event.startTime,
      endAt: new Date(
        new Date(event.startTime).getTime() + 2 * 60 * 60 * 1000
      ).toISOString(),
      style: {
        color: getEventStatusColor(event),
      },
      extra: {
        location: event.location,
        organizerName: event.organizerName,
        participantsCount: event.participantsCount,
        status: event.status,
        statusLabel: getStatusLabel(event.type, event.status),
      },
    }));
}

/**
 * イベントの状態に応じて色を決定する
 */
function getEventStatusColor(event: UpcomingEvent): string {
  // statusに基づく色分け
  switch (event.status) {
    case 'hosting':
      return '#8B5CF6'; // purple - 主催中
    case 'confirmed':
      return '#10B981'; // green - 参加確定
    case 'pending':
      return '#F59E0B'; // orange - 承認待ち
    default:
      return '#3B82F6'; // blue - その他
  }
}

/**
 * UpcomingEventとPhotoSessionCalendarDataを統合する
 * 重複を排除し、より完全なデータセットを作成
 */
export function mergeCalendarData(
  upcomingEvents: UpcomingEvent[],
  calendarSessions: PhotoSessionCalendarData[]
): PhotoSessionCalendarData[] {
  // UpcomingEventをPhotoSessionCalendarData形式に変換
  const adaptedEvents = adaptUpcomingEventsToCalendarData(upcomingEvents);

  // IDベースで重複を排除（calendarSessionsを優先）
  const mergedMap = new Map<string, PhotoSessionCalendarData>();

  // まずadaptedEventsを追加
  adaptedEvents.forEach(event => {
    mergedMap.set(event.id, event);
  });

  // calendarSessionsで上書き（より詳細なデータのため）
  calendarSessions.forEach(session => {
    mergedMap.set(session.id, session);
  });

  return Array.from(mergedMap.values()).sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
}
