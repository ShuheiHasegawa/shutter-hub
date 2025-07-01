'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSpacer,
} from '@/components/ui/action-bar';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
  CreditCard,
  Calendar,
  ShieldCheckIcon,
  CalendarPlus,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { PhotoSessionSlot } from '@/types/photo-session';
import { OrganizerManagementPanel } from './OrganizerManagementPanel';
import { PhotoSessionGroupChat } from './PhotoSessionGroupChat';
import { PhotoSessionDocuments } from './PhotoSessionDocuments';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { Price } from '@/components/ui/formatted-display';

import {
  getPhotoSessionParticipants,
  checkUserParticipation,
  type PhotoSessionParticipant,
} from '@/app/actions/photo-session-participants';
import { usePhotoSessionBooking } from '@/hooks/usePhotoSessionBooking';

import { SlotBookingFlow } from './SlotBookingFlow';

interface PhotoSessionDetailProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
}

// Googleカレンダーイベント作成関数
const createGoogleCalendarEvent = (
  title: string,
  startTime: Date,
  endTime: Date,
  location: string,
  description?: string
) => {
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`,
    location: location,
    details: description || '',
  });

  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  window.open(url, '_blank');
};

export function PhotoSessionDetail({
  session,
  slots,
}: PhotoSessionDetailProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [participants, setParticipants] = useState<PhotoSessionParticipant[]>(
    []
  );
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);

  // 予約状態を管理するhook
  const { canBook: canBookFromHook, isLoading: bookingLoading } =
    usePhotoSessionBooking(session);

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  // 開催者判定
  const isOrganizer = user?.id === session.organizer_id;

  // URLパラメータから予約フローの状態を取得
  const bookingStep = searchParams.get('step');
  const isInBookingFlow = !!bookingStep;

  // 参加者データを取得
  useEffect(() => {
    const loadParticipantsData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [participantsData, userParticipation] = await Promise.all([
          getPhotoSessionParticipants(session.id),
          checkUserParticipation(session.id, user.id),
        ]);

        setParticipants(participantsData);
        setIsParticipant(userParticipation);
      } catch (error) {
        console.error('Error loading participants data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadParticipantsData();
  }, [session.id, user]);

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">終了</Badge>;
    }
    if (isOngoing) {
      return <Badge variant="default">開催中</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline">予定</Badge>;
    }
    return null;
  };

  // 予約方式の日本語化
  const getBookingTypeLabel = (bookingType: string) => {
    const bookingTypes: Record<string, string> = {
      first_come: '先着順',
      lottery: '抽選',
      admin_lottery: '管理抽選',
      priority: '優先予約',
      waitlist: 'キャンセル待ち',
    };
    return bookingTypes[bookingType] || bookingType;
  };

  const hasSlots = slots && slots.length > 0;

  // 予約可能状態の判定（hookの結果を使用）
  const canBook = !isOrganizer && canBookFromHook;
  const available = session.max_participants - session.current_participants;
  const isFull = available === 0;

  // Googleカレンダー追加ハンドラー
  const handleAddToGoogleCalendar = () => {
    if (hasSlots && slots.length > 0) {
      // 撮影枠がある場合、参加者は予約した枠のみ、開催者は全体の時間
      if (isOrganizer) {
        // 開催者の場合、全体の撮影会時間でカレンダー追加
        createGoogleCalendarEvent(
          `【開催】${session.title}`,
          startDate,
          endDate,
          session.location,
          `撮影会の開催\n\n場所: ${session.location}\n${session.address ? `住所: ${session.address}\n` : ''}主催者: ${session.organizer.display_name || session.organizer.email}\n\n${session.description || ''}`
        );
      } else if (isParticipant) {
        // 参加者の場合、予約した枠の時間（実装上は全体時間）
        // TODO: 実際の予約枠情報を取得して、その時間を使用する
        createGoogleCalendarEvent(
          `【参加】${session.title}`,
          startDate,
          endDate,
          session.location,
          `撮影会への参加\n\n場所: ${session.location}\n${session.address ? `住所: ${session.address}\n` : ''}主催者: ${session.organizer.display_name || session.organizer.email}\n\n${session.description || ''}`
        );
      } else {
        // 未参加者の場合、全体時間で参考として追加
        createGoogleCalendarEvent(
          `【予定】${session.title}`,
          startDate,
          endDate,
          session.location,
          `撮影会の予定\n\n場所: ${session.location}\n${session.address ? `住所: ${session.address}\n` : ''}主催者: ${session.organizer.display_name || session.organizer.email}\n\n${session.description || ''}`
        );
      }
    } else {
      // 通常の撮影会の場合
      const prefix = isOrganizer
        ? '【開催】'
        : isParticipant
          ? '【参加】'
          : '【予定】';
      createGoogleCalendarEvent(
        `${prefix}${session.title}`,
        startDate,
        endDate,
        session.location,
        `撮影会${isOrganizer ? 'の開催' : isParticipant ? 'への参加' : 'の予定'}\n\n場所: ${session.location}\n${session.address ? `住所: ${session.address}\n` : ''}主催者: ${session.organizer.display_name || session.organizer.email}\n\n${session.description || ''}`
      );
    }
  };

  // アクションバーのボタン設定
  const getActionBarButtons = (): ActionBarButton[] => {
    if (isOrganizer || !user) {
      return [];
    }

    // 予約できない場合は無効化されたボタンを表示
    if (!canBook) {
      return [
        {
          id: 'cannot-book',
          label: '予約不可',
          variant: 'secondary',
          onClick: () => {}, // 何もしない
          disabled: true,
          icon: <Calendar className="h-4 w-4" />,
          className: 'bg-gray-400 text-gray-600 cursor-not-allowed',
        },
      ];
    }

    if (hasSlots) {
      return [
        {
          id: 'select-slot',
          label: bookingLoading ? '確認中...' : '時間枠を選択',
          variant: 'default',
          onClick: () => {
            router.push(`?step=select`, { scroll: false });
          },
          disabled: bookingLoading,
          icon: <Calendar className="h-4 w-4" />,
          className: 'bg-blue-600 hover:bg-blue-700',
        },
      ];
    } else {
      return [
        {
          id: 'book-now',
          label: bookingLoading
            ? '確認中...'
            : isFull
              ? 'キャンセル待ち'
              : '予約する',
          variant: 'default',
          onClick: () => {
            router.push(`?step=select`, { scroll: false });
          },
          disabled: bookingLoading,
          icon: <CreditCard className="h-4 w-4" />,
          className: 'bg-blue-600 hover:bg-blue-700',
        },
      ];
    }
  };

  // 予約フロー表示中は予約フローコンポーネントのみ表示
  if (isInBookingFlow && user) {
    return <SlotBookingFlow session={session} slots={slots} userId={user.id} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* 開催者ヘッダー（主催者の場合、最上部に表示） */}
      {isOrganizer && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-blue-900">
                    開催者管理パネル
                  </CardTitle>
                  <p className="text-sm text-blue-700">
                    あなたが主催する撮影会の管理画面です
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                主催者
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* 開催者向け撮影会情報（ヘッダー直下） */}
      {isOrganizer && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              <div className="flex items-center gap-2">
                {/* Googleカレンダー追加ボタン */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">カレンダーに追加</span>
                  <span className="sm:hidden">追加</span>
                </Button>
                {getStatusBadge()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.description && (
              <div>
                <h3 className="font-semibold mb-2">撮影会について</h3>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {session.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">開催詳細</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {formatDateLocalized(startDate, 'ja', 'long')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTimeLocalized(startDate, 'ja')} -{' '}
                        {formatTimeLocalized(endDate, 'ja')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                    <span>{session.location}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <UsersIcon className="h-5 w-5 text-muted-foreground" />
                    <span>
                      {session.current_participants} /{' '}
                      {session.max_participants} 名
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CircleDollarSignIcon className="h-5 w-5 text-muted-foreground" />
                    <span>
                      <Price
                        value={session.price_per_person}
                        format="with-unit"
                        unit="/人"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>
                      予約方式:{' '}
                      {getBookingTypeLabel(
                        session.booking_type || 'first_come'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">主催者情報</h3>
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={session.organizer?.avatar_url || ''}
                      alt={session.organizer?.display_name || ''}
                    />
                    <AvatarFallback>
                      {session.organizer?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {session.organizer?.display_name}
                    </div>
                    <div className="text-sm text-muted-foreground">主催者</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 画像ギャラリー */}
            {session.image_urls && session.image_urls.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">撮影会画像</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {session.image_urls.map((image: string, index: number) => (
                    <div
                      key={index}
                      className="aspect-video rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={image}
                        alt={`撮影会画像 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 開催者管理機能（撮影会情報の後） */}
      {isOrganizer && (
        <OrganizerManagementPanel session={session} slots={slots} />
      )}

      {/* 参加者・未参加者向け撮影会情報 */}
      {!isOrganizer && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              <div className="flex items-center gap-2">
                {/* Googleカレンダー追加ボタン */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">カレンダーに追加</span>
                  <span className="sm:hidden">追加</span>
                </Button>
                {getStatusBadge()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.description && (
              <div>
                <h3 className="font-semibold mb-2">撮影会について</h3>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {session.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">開催詳細</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {formatDateLocalized(startDate, 'ja', 'long')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTimeLocalized(startDate, 'ja')} -{' '}
                        {formatTimeLocalized(endDate, 'ja')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                    <span>{session.location}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <UsersIcon className="h-5 w-5 text-muted-foreground" />
                    <span>
                      {session.current_participants} /{' '}
                      {session.max_participants} 名
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CircleDollarSignIcon className="h-5 w-5 text-muted-foreground" />
                    <span>
                      <Price
                        value={session.price_per_person}
                        format="with-unit"
                        unit="/人"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>
                      予約方式:{' '}
                      {getBookingTypeLabel(
                        session.booking_type || 'first_come'
                      )}
                    </span>
                  </div>
                  {user && !isOrganizer && (
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="h-5 w-5 text-muted-foreground" />
                      <span>
                        予約制限:{' '}
                        {session.allow_multiple_bookings
                          ? '複数予約可能'
                          : '1人1枠まで'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">主催者情報</h3>
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={session.organizer?.avatar_url || ''}
                      alt={session.organizer?.display_name || ''}
                    />
                    <AvatarFallback>
                      {session.organizer?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {session.organizer?.display_name}
                    </div>
                    <div className="text-sm text-muted-foreground">主催者</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 画像ギャラリー */}
            {session.image_urls && session.image_urls.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">撮影会画像</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {session.image_urls.map((image: string, index: number) => (
                    <div
                      key={index}
                      className="aspect-video rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={image}
                        alt={`撮影会画像 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 時間枠情報表示（参加者・未参加者のみ表示、開催者は管理パネルで確認済みのため非表示） */}
      {hasSlots && !isOrganizer && (
        <Card>
          <CardHeader>
            <CardTitle>撮影時間枠</CardTitle>
            <p className="text-sm text-muted-foreground">
              この撮影会は時間枠制です。下部の予約ボタンから時間枠を選択してください
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slots.map((slot, index) => {
                const isSlotFull =
                  slot.current_participants >= slot.max_participants;
                const slotStartTime = new Date(slot.start_time);
                const slotEndTime = new Date(slot.end_time);
                const participationRate =
                  (slot.current_participants / slot.max_participants) * 100;

                return (
                  <div
                    key={slot.id}
                    className={`w-full p-4 sm:p-6 rounded-lg border-2 transition-all duration-200 ${
                      isSlotFull
                        ? 'border-error/20 bg-error/5 dark:border-error/80 dark:bg-error/20'
                        : participationRate >= 70
                          ? 'border-warning/30 text-warning bg-warning/10 dark:border-warning/70 dark:text-warning dark:bg-warning/30'
                          : 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'
                    }`}
                  >
                    {/* ヘッダー部分 */}
                    <div className="flex items-center justify-between mb-4">
                      <Badge
                        variant="outline"
                        className={`font-medium ${
                          isSlotFull
                            ? 'border-error/30 text-error bg-error/10 dark:border-error/70 dark:text-error dark:bg-error/30'
                            : participationRate >= 70
                              ? 'border-warning/30 text-warning bg-warning/10 dark:border-warning/70 dark:text-warning dark:bg-warning/30'
                              : 'border-green-300 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30'
                        }`}
                      >
                        枠 {index + 1}
                      </Badge>
                      <Badge
                        variant={isSlotFull ? 'destructive' : 'default'}
                        className="text-sm font-medium"
                      >
                        {isSlotFull ? '満席' : '空きあり'}
                      </Badge>
                    </div>

                    {/* 詳細情報グリッド */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                      {/* 参加者数 */}
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                          <UsersIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">参加者</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {slot.current_participants}
                          <span className="text-lg text-gray-500 dark:text-gray-400">
                            /{slot.max_participants}
                          </span>
                        </div>
                      </div>

                      {/* 時間 */}
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          時間
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                          {formatTimeLocalized(slotStartTime, 'ja')} -{' '}
                          {formatTimeLocalized(slotEndTime, 'ja')}
                        </div>
                      </div>

                      {/* 料金 */}
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                          <CircleDollarSignIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">料金</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {slot.price_per_person === 0
                            ? '無料'
                            : `¥${slot.price_per_person.toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* グループチャット機能（メッセージシステムが利用可能な場合のみ） */}
      {user && !loading && (isOrganizer || isParticipant) && (
        <div className="space-y-4">
          <PhotoSessionGroupChat
            sessionId={session.id}
            sessionTitle={session.title}
            sessionDate={formatDateLocalized(startDate, 'ja', 'long')}
            sessionLocation={session.location}
            organizerId={session.organizer_id}
            currentUserId={user.id}
            participants={participants}
          />
        </div>
      )}

      {/* ドキュメント管理機能 */}
      {user && !loading && (isOrganizer || isParticipant) && (
        <PhotoSessionDocuments
          sessionId={session.id}
          currentUserId={user.id}
          isOrganizer={isOrganizer}
          participants={participants}
        />
      )}

      {/* 注意事項（主催者以外のみ表示） */}
      {!isOrganizer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ご注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="space-y-2 list-disc list-inside">
                <li>キャンセルは撮影会開始の24時間前まで可能です</li>
                <li>遅刻される場合は必ず主催者にご連絡ください</li>
                <li>
                  撮影した写真の使用については主催者の指示に従ってください
                </li>
                <li>体調不良の場合は無理をせず参加をお控えください</li>
                {hasSlots && (
                  <li>
                    撮影枠制撮影会では、予約した時間枠以外の参加はできません
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* 開催者向け注意事項（主催者のみ表示、最下部） */}
      {isOrganizer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">開催者向け注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="space-y-2 list-disc list-inside">
                <li>参加者への適切な連絡・指示を心がけてください</li>
                <li>撮影時は参加者の安全と快適性を最優先してください</li>
                <li>時間管理を徹底し、予定通りの進行を心がけてください</li>
                <li>トラブル発生時は運営チームにご連絡ください</li>
                <li>
                  撮影した写真の取り扱いについて事前に参加者と合意を取ってください
                </li>
                {hasSlots && (
                  <li>
                    撮影枠制の場合、各時間枠の参加者管理を適切に行ってください
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* 固定フッターがある場合のスペーサー */}
      {!isOrganizer && user && <ActionBarSpacer />}

      {/* 固定フッターアクションバー */}
      {!isOrganizer && user && (
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={1}
          background="blur"
        />
      )}
    </div>
  );
}
