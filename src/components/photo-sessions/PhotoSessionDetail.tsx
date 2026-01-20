'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserProfileDisplay } from '@/components/ui/user-profile-display';
import { ClickableText } from '@/components/ui/clickable-text';
import { ActionBar, ActionBarButton } from '@/components/ui/action-bar';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
  CreditCard,
  Calendar,
  ShieldCheckIcon,
  CalendarPlus,
  Star,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { PhotoSessionSlot } from '@/types/photo-session';
import { OrganizerManagementPanel } from './OrganizerManagementPanel';
import { PhotoSessionGroupChat } from './PhotoSessionGroupChat';
import { PhotoSessionDocuments } from './PhotoSessionDocuments';
import {
  FormattedDateTime,
  FormattedPrice,
} from '@/components/ui/formatted-display';

import {
  getPhotoSessionParticipants,
  type PhotoSessionParticipant,
} from '@/app/actions/photo-session-participants';
import { usePhotoSessionBooking } from '@/hooks/usePhotoSessionBooking';
import { checkUserHasBadRating } from '@/app/actions/rating-block';
import { useToast } from '@/hooks/use-toast';
import { useTranslations, useLocale } from 'next-intl';

import { SlotBookingFlow } from './SlotBookingFlow';
import { ReviewList } from '@/components/reviews/ReviewList';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { getLotterySession } from '@/app/actions/photo-session-lottery';
import { getPhotoSessionStudioAction } from '@/app/actions/photo-session-studio';
import { BookingCheckInStatus } from '@/components/bookings/BookingCheckInStatus';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { StatItem } from '@/components/ui/stat-item';
import { PageTitleHeaderScrollAware } from '@/components/ui/page-title-header-scroll-aware';

interface PhotoSessionDetailProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
  userBooking?: {
    id: string;
    photo_session_id: string;
    user_id: string;
    status: string;
    slot_id?: string | null;
    checked_in_at?: string | null;
    checked_out_at?: string | null;
    created_at: string;
    updated_at: string;
    slot?: {
      id: string;
      slot_number: number;
      start_time: string;
      end_time: string;
      price_per_person: number;
    } | null;
  } | null;
  userBookings?: Array<{
    id: string;
    photo_session_id: string;
    user_id: string;
    status: string;
    slot_id?: string | null;
    checked_in_at?: string | null;
    checked_out_at?: string | null;
    created_at: string;
    updated_at: string;
    slot?: {
      id: string;
      slot_number: number;
      start_time: string;
      end_time: string;
      price_per_person: number;
    } | null;
  }>;
  studio?: {
    id: string;
    name: string;
  } | null;
  slotBookingCounts?: { [slotId: string]: number };
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
  userBooking: initialUserBooking,
  userBookings: initialUserBookings = [],
  studio: initialStudio,
  slotBookingCounts: initialSlotBookingCounts = {},
}: PhotoSessionDetailProps) {
  useEffect(() => {
    // セッションIDが変わったらデータ取得フラグをリセット
    hasLoadedDataRef.current = false;
  }, [session.id]);

  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('photoSessions');
  const tBooking = useTranslations('photoSessions.booking.alreadyBookedAlert');
  const locale = useLocale();

  const [participants, setParticipants] = useState<PhotoSessionParticipant[]>(
    []
  );
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [lotteryEntryCount, setLotteryEntryCount] = useState<{
    total_entries: number;
    total_groups: number;
    entries_by_slot?: Array<{
      slot_id: string;
      slot_number: number;
      entry_count: number;
    }>;
  } | null>(null);
  const [lotterySession, setLotterySession] = useState<{
    max_entries: number | null;
  } | null>(null);
  const [studio, setStudio] = useState<{
    id: string;
    name: string;
  } | null>(initialStudio || null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  // slotBookingCountsはpropsから受け取る（Server Componentで取得済み）
  const slotBookingCounts = initialSlotBookingCounts;

  // データ取得済みフラグ（重複実行を防ぐ）
  const hasLoadedDataRef = useRef(false);

  // 予約状態を管理するhook
  const {
    canBook: canBookFromHook,
    isLoading: bookingLoading,
    userBooking: userBookingFromHook,
  } = usePhotoSessionBooking(session, initialUserBooking);

  // userBookingの参照を安定化（オブジェクトの参照が変わるのを防ぐ）
  const stableUserBooking = useMemo(
    () => initialUserBooking,
    [initialUserBooking]
  );

  // userBookingsの参照を安定化
  const stableUserBookings = useMemo(
    () => initialUserBookings || [],
    [initialUserBookings]
  );

  // サーバーサイドで取得した予約情報を優先使用
  const userBooking = stableUserBooking || userBookingFromHook;

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  // 開催者判定（メモ化して安定化）
  const isOrganizer = useMemo(() => {
    return user?.id === session.organizer_id;
  }, [user?.id, session.organizer_id]);

  // URLパラメータから予約フローの状態を取得
  const bookingStep = searchParams.get('step');
  const isInBookingFlow = !!bookingStep;

  // 参加者データとその他の条件付きデータを並列取得
  useEffect(() => {
    // 認証状態の読み込み中は待機
    if (authLoading) {
      return;
    }

    // 既にデータを取得済みの場合はスキップ（認証状態が変わっただけの場合）
    if (hasLoadedDataRef.current && user?.id) {
      return;
    }

    const loadAllData = async () => {
      // 既に実行中の場合は重複実行を防ぐ
      if (isLoadingData) {
        logger.debug('[PhotoSessionDetail] 既に実行中 - 重複実行をスキップ');
        return;
      }

      logger.debug('[PhotoSessionDetail] loadAllData開始', {
        sessionId: session.id,
        userId: user?.id,
      });

      // ユーザーが未ログインの場合は早期リターン（認証読み込み完了後）
      if (!user) {
        logger.debug('[PhotoSessionDetail] ユーザー未ログイン - 処理スキップ');
        setLoading(false);
        return;
      }

      setIsLoadingData(true);

      try {
        // レビュー可能かチェック（予約済みで撮影会終了後）
        const canReviewNow = !!stableUserBooking && isPast;

        // 条件付き並列実行のためのpromises配列
        const promises: Promise<unknown>[] = [
          // 参加者データは常に取得
          getPhotoSessionParticipants(session.id),
        ];

        // 抽選方式の場合のみエントリー数取得
        if (session.booking_type === 'lottery') {
          promises.push(getLotterySession(session.id));
        }

        // レビュー権限がある場合のみ既存レビューチェック
        if (canReviewNow) {
          const supabase = createClient();
          promises.push(
            Promise.resolve(
              supabase
                .from('photo_session_reviews')
                .select('id')
                .eq('photo_session_id', session.id)
                .eq('reviewer_id', user.id)
                .maybeSingle()
            ).then(result => result.data)
          );
        }

        const results = await Promise.all(promises);

        // 参加者データの処理
        const participantsData = results[0] as PhotoSessionParticipant[];
        setParticipants(participantsData);

        // スロット予約数はServer Componentからpropsで受け取るため、ここでは処理しない
        let resultIndex = 1;

        // データ取得完了フラグを設定
        hasLoadedDataRef.current = true;

        // checkUserParticipationの代わりに、participantsデータから判定
        const userParticipation = participantsData.some(
          p => p.user_id === user.id
        );
        setIsParticipant(userParticipation);

        // 抽選セッション情報の処理
        if (session.booking_type === 'lottery' && results[resultIndex]) {
          const lotterySessionResult = results[resultIndex] as Awaited<
            ReturnType<typeof getLotterySession>
          >;
          if (lotterySessionResult.data?.id) {
            const lotterySessionId = lotterySessionResult.data.id;
            setLotterySession({
              max_entries: lotterySessionResult.data?.max_entries ?? null,
            });

            // 開催者は統計情報、一般ユーザーはエントリー数を取得
            if (isOrganizer) {
              const { getLotteryStatistics } = await import(
                '@/app/actions/multi-slot-lottery'
              );
              const result = await getLotteryStatistics(lotterySessionId);
              if (result.success && result.data) {
                setLotteryEntryCount({
                  total_groups: result.data.total_groups,
                  total_entries: result.data.total_entries,
                  entries_by_slot: result.data.entries_by_slot || [],
                });
              }
            } else {
              const { getLotteryEntryCount } = await import(
                '@/app/actions/multi-slot-lottery'
              );
              const result = await getLotteryEntryCount(lotterySessionId);
              if (result.success && result.data) {
                setLotteryEntryCount(result.data);
              }
            }
            resultIndex++;
          }
        }

        // 既存レビューの処理
        if (canReviewNow && results[resultIndex]) {
          const reviewResult = results[resultIndex] as {
            data: { id: string } | null;
            error: unknown;
          };
          setHasExistingReview(!!reviewResult.data);
        }
      } catch (error) {
        logger.error('[PhotoSessionDetail] データ読み込みエラー:', error);
      } finally {
        setLoading(false);
        setIsLoadingData(false);
      }
    };

    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session.id,
    session.booking_type,
    session.end_time,
    user?.id,
    isOrganizer,
    stableUserBooking?.id, // オブジェクト全体ではなくIDのみを依存配列に含める
    isPast, // isPastを依存配列に追加
    // authLoadingを依存配列から削除（authLoadingが変わるたびに再実行されるのを防ぐ）
    // isLoadingDataを依存配列から削除（無限ループ防止）
    // stableUserBookingとuserはuseEffect内で使用されるが、依存配列に含めると無限ループになる可能性があるため除外
  ]);

  const hasSlots = slots && slots.length > 0;

  const getStatusBadge = () => {
    if (isPast) {
      return (
        <Badge
          variant="destructive"
          className="text-sm px-3 py-1 whitespace-nowrap"
        >
          終了
        </Badge>
      );
    }
    if (isOngoing) {
      return (
        <Badge
          variant="outline"
          className="text-sm px-3 py-1 whitespace-nowrap"
        >
          開催中
        </Badge>
      );
    }
    if (isUpcoming) {
      return (
        <Badge
          variant="outline"
          className="text-sm px-3 py-1 whitespace-nowrap"
        >
          予定
        </Badge>
      );
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

  // 予約可能状態の判定（hookの結果を使用）
  const canBook = !isOrganizer && canBookFromHook;
  // スロットがある場合はslotBookingCountsの合計を使用、ない場合はsession.current_participantsを使用
  const totalBookings =
    slots.length > 0 && Object.keys(slotBookingCounts).length > 0
      ? Object.values(slotBookingCounts).reduce((sum, count) => sum + count, 0)
      : session.current_participants;
  const available = session.max_participants - totalBookings;
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

  // 画像クリックハンドラー
  const handleImageClick = (imageUrl: string) => {
    setLightboxImage(imageUrl);
    setLightboxOpen(true);
  };

  // 評価チェック処理
  const handleRatingCheck = async (): Promise<boolean> => {
    if (!session.block_users_with_bad_ratings || !user) {
      return true; // チェック不要の場合は通過
    }

    try {
      const result = await checkUserHasBadRating(user.id, session.id);
      if (!result.success) {
        logger.error('評価チェックエラー:', result.error);
        toast({
          title: 'エラー',
          description: '評価チェックに失敗しました',
          variant: 'destructive',
        });
        return false;
      }

      if (result.hasBadRating) {
        toast({
          title: t('form.errors.userHasBadRating'),
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('評価チェック実行エラー:', error);
      toast({
        title: t('form.errors.ratingCheckFailed'),
        variant: 'destructive',
      });
      return false;
    }
  };

  // レビュー可能かチェック（予約済みで撮影会終了後）
  const canReview = !!userBooking && isPast;

  // スタジオ情報を取得（サーバーサイドで取得できなかった場合のみ）
  useEffect(() => {
    // サーバーサイドで既に取得済みの場合はスキップ
    if (initialStudio !== undefined) {
      return;
    }

    const loadStudio = async () => {
      try {
        const result = await getPhotoSessionStudioAction(session.id);
        if (result.success && result.studio) {
          setStudio(result.studio);
        } else {
          setStudio(null);
        }
      } catch (error) {
        logger.error('スタジオ情報取得エラー:', error);
        setStudio(null);
      }
    };

    loadStudio();
  }, [session.id, initialStudio]);

  // アクションバーのボタン設定
  const getActionBarButtons = (): ActionBarButton[] => {
    if (isOrganizer || !user) {
      return [];
    }

    const buttons: ActionBarButton[] = [];

    // 予約済み状態の判定
    const hasBookings = stableUserBookings.length > 0;
    const bookedSlotIds = stableUserBookings
      .map(b => b.slot_id)
      .filter((id): id is string => !!id);
    const allSlotsBooked =
      hasSlots &&
      hasBookings &&
      slots.length > 0 &&
      slots.every(slot => bookedSlotIds.includes(slot.id));
    const _someSlotsBooked =
      hasSlots &&
      hasBookings &&
      slots.length > 0 &&
      slots.some(slot => bookedSlotIds.includes(slot.id));

    // 一人一枠 + 予約済み、またはスロットなし + 予約済み、または全枠予約済みの場合
    if (
      hasBookings &&
      ((!session.allow_multiple_bookings && hasBookings) ||
        (!hasSlots && hasBookings) ||
        (hasSlots && allSlotsBooked))
    ) {
      // 「予約詳細を見る」ボタンを表示
      buttons.push({
        id: 'view-booking-details',
        label: tBooking('viewDetails'),
        variant: 'primary',
        onClick: () => {
          router.push(`/${locale}/bookings`);
        },
        icon: <ExternalLink className="h-4 w-4" />,
      });
    } else {
      // 抽選の場合、全てのスロットがエントリー上限に達しているかチェック
      const allSlotsEntryFull =
        session.booking_type === 'lottery' &&
        lotterySession?.max_entries !== null &&
        lotterySession?.max_entries !== undefined &&
        lotteryEntryCount?.entries_by_slot &&
        slots.length > 0 &&
        slots.every(slot => {
          const slotEntry = lotteryEntryCount.entries_by_slot!.find(
            e => e.slot_id === slot.id
          );
          return (
            slotEntry && slotEntry.entry_count >= lotterySession.max_entries!
          );
        });

      // 予約可能な場合は予約ボタンを追加
      if (canBook) {
        if (hasSlots) {
          // 複数枠可能 + 一部予約済みの場合も「時間枠を選択」を表示
          // （予約フロー内で予約済み枠は選択不可になる）
          buttons.push({
            id: 'select-slot',
            label: bookingLoading
              ? '確認中...'
              : allSlotsEntryFull
                ? 'エントリー上限'
                : '時間枠を選択',
            variant: 'cta',
            onClick: async () => {
              const canProceed = await handleRatingCheck();
              if (canProceed) {
                router.push(`?step=select`, { scroll: false });
              }
            },
            disabled: bookingLoading || allSlotsEntryFull,
            icon: <Calendar className="h-4 w-4" />,
            'data-testid': 'photo-session-select-slot-button',
          });
        } else {
          buttons.push({
            id: 'book-now',
            label: bookingLoading
              ? '確認中...'
              : isFull
                ? 'キャンセル待ち'
                : '予約する',
            variant: isFull ? 'accent' : 'cta',
            onClick: async () => {
              const canProceed = await handleRatingCheck();
              if (canProceed) {
                router.push(`?step=select`, { scroll: false });
              }
            },
            disabled: bookingLoading,
            icon: <CreditCard className="h-4 w-4" />,
            'data-testid': 'photo-session-booking-button',
          });
        }
      } else if (!canBook) {
        // 予約できない場合は無効化されたボタンを表示
        buttons.push({
          id: 'cannot-book',
          label: '予約不可',
          variant: 'outline',
          onClick: () => {}, // 何もしない
          disabled: true,
          icon: <Calendar className="h-4 w-4" />,
          'data-testid': 'photo-session-cannot-book-button',
        });
      }
    }

    // レビュー可能な場合はレビューボタンを追加（予約ボタンの下に表示）
    if (canReview) {
      // 既存レビューがある場合は「レビュー修正」、ない場合は「レビューを書く」
      buttons.push({
        id: hasExistingReview ? 'edit-review' : 'write-review',
        label: hasExistingReview ? 'レビュー修正' : 'レビューを書く',
        variant: 'cta',
        onClick: () => {
          router.push(`/${locale}/photo-sessions/${session.id}/reviews`);
        },
        icon: <Star className="h-4 w-4" />,
      });
    }

    return buttons;
  };

  // 予約フロー表示中は予約フローコンポーネントのみ表示
  if (isInBookingFlow && user) {
    return <SlotBookingFlow session={session} slots={slots} userId={user.id} />;
  }

  return (
    <div className="space-y-4">
      {/* ページヘッダー（スクロール対応） */}
      <PageTitleHeaderScrollAware
        defaultTitle="撮影会詳細"
        scrolledTitle={session.title}
        backButton={{ href: '/photo-sessions', variant: 'ghost' }}
      />

      {/* 開催者ヘッダー（主催者の場合、最上部に表示） */}
      {isOrganizer && (
        <Card className="border-blue-200 bg-blue-50/50 mt-4 print:hidden">
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
        <Card className="print:hidden">
          <CardHeader>
            {/* スマホ表示: 縦並びレイアウト */}
            <div className="flex flex-col space-y-4 md:hidden">
              <div className="flex items-center justify-end">
                {/* Googleカレンダー追加ボタン */}
                <Button
                  variant="navigation"
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="text-sm">カレンダーに追加</span>
                </Button>
                {getStatusBadge()}
              </div>
            </div>

            {/* デスクトップ表示: 横並びレイアウト */}
            <div className="hidden md:flex justify-end items-end">
              <div className="flex items-center gap-2 flex-nowrap">
                {/* Googleカレンダー追加ボタン */}
                <Button
                  variant="navigation"
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="text-sm">カレンダーに追加</span>
                </Button>
                <div className="shrink-0">{getStatusBadge()}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {session.description && (
              <div>
                <h3 className="font-semibold text-lg mb-2">撮影会について</h3>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {session.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
              <div className="space-y-4">
                <h3 className="font-semibold">開催詳細</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        <FormattedDateTime
                          value={startDate}
                          format="date-long"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <FormattedDateTime
                          value={startDate}
                          format="time-range"
                          endValue={endDate}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                    {studio ? (
                      <ClickableText
                        href={`/${locale}/studios/${studio.id}`}
                        variant="navigation"
                        size="sm"
                      >
                        {studio.name}
                      </ClickableText>
                    ) : (
                      <span>{session.location}</span>
                    )}
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
                      <FormattedPrice
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
                <UserProfileDisplay
                  user={{
                    id: session.organizer.id,
                    display_name: session.organizer.display_name,
                    avatar_url: session.organizer.avatar_url,
                    user_type: session.organizer.user_type,
                    is_verified: session.organizer.is_verified,
                  }}
                  size="md"
                  showRole={true}
                  showVerified={true}
                />
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
                      className="aspect-video rounded-lg overflow-hidden bg-gray-100 relative cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(image)}
                    >
                      <Image
                        src={image}
                        alt={`撮影会画像 ${index + 1}`}
                        fill
                        className="object-cover"
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
      {/* eslint-disable @typescript-eslint/no-explicit-any */}
      {
        (isOrganizer && (
          <OrganizerManagementPanel
            session={session}
            slots={slots}
            lotteryEntryCount={lotteryEntryCount}
            lotterySession={lotterySession || undefined}
            slotBookingCounts={slotBookingCounts}
          />
        )) as any
      }
      {/* eslint-enable @typescript-eslint/no-explicit-any */}

      {/* 予約済みアラート（参加者・未参加者のみ、予約がある場合） */}
      {!isOrganizer && user && stableUserBookings.length > 0 && (
        <Alert className="border-success/30 bg-success/10 print:hidden">
          <CheckCircle className="h-5 w-5 text-success" />
          <AlertTitle className="text-success font-semibold">
            {tBooking('title')}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span>
                {stableUserBookings.length === 1
                  ? tBooking('singleBooking')
                  : tBooking('multipleBookings', {
                      count: stableUserBookings.length,
                    })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(`/${locale}/bookings`);
                }}
                className="border-success text-success hover:bg-success/10"
              >
                {tBooking('viewDetails')}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 参加者・未参加者向け撮影会情報 */}
      {!isOrganizer && (
        <Card className="print:hidden">
          <CardHeader>
            {/* スマホ表示: 縦並びレイアウト */}
            <div className="flex flex-col space-y-4 md:hidden">
              <div className="flex items-center justify-end">
                {/* Googleカレンダー追加ボタン */}
                <Button
                  variant="navigation"
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="text-sm">カレンダーに追加</span>
                </Button>
                {getStatusBadge()}
              </div>
            </div>

            {/* デスクトップ表示: 横並びレイアウト */}
            <div className="hidden md:flex justify-end items-end">
              <div className="flex items-center gap-2 flex-nowrap">
                {/* Googleカレンダー追加ボタン */}
                <Button
                  variant="navigation"
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="text-sm">カレンダーに追加</span>
                </Button>
                <div className="shrink-0">{getStatusBadge()}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {session.description && (
              <div>
                <h3 className="font-semibold text-lg mb-2">撮影会について</h3>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {session.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
              <div className="space-y-4">
                <h3 className="font-semibold">開催詳細</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        <FormattedDateTime
                          value={startDate}
                          format="date-long"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <FormattedDateTime
                          value={startDate}
                          format="time-range"
                          endValue={endDate}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                    {studio ? (
                      <ClickableText
                        href={`/${locale}/studios/${studio.id}`}
                        variant="navigation"
                        size="sm"
                      >
                        {studio.name}
                      </ClickableText>
                    ) : (
                      <span>{session.location}</span>
                    )}
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
                      <FormattedPrice
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
                <UserProfileDisplay
                  user={{
                    id: session.organizer.id,
                    display_name: session.organizer.display_name,
                    avatar_url: session.organizer.avatar_url,
                    user_type: session.organizer.user_type,
                    is_verified: session.organizer.is_verified,
                  }}
                  size="md"
                  showRole={true}
                  showVerified={true}
                />
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
                      className="aspect-video rounded-lg overflow-hidden bg-gray-100 relative cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(image)}
                    >
                      <Image
                        src={image}
                        alt={`撮影会画像 ${index + 1}`}
                        fill
                        className="object-cover"
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
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">撮影時間枠</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              この撮影会は時間枠制です。下部の予約ボタンから時間枠を選択してください
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slots.map((slot, index) => {
                const currentParticipants =
                  slotBookingCounts[slot.id] ?? slot.current_participants;
                const isSlotFull = currentParticipants >= slot.max_participants;
                const slotStartTime = new Date(slot.start_time);
                const slotEndTime = new Date(slot.end_time);
                const participationRate =
                  (currentParticipants / slot.max_participants) * 100;

                // このスロットがユーザーによって予約済みかチェック
                const isUserBooked = stableUserBookings.some(
                  booking => booking.slot_id === slot.id
                );

                return (
                  <div
                    key={slot.id}
                    className={`w-full bg-white dark:bg-gray-900 border-2 transition-all duration-300 overflow-hidden ${
                      isUserBooked
                        ? 'border-success/50 bg-success/5 dark:border-success/70 dark:bg-success/10'
                        : isSlotFull
                          ? 'border-error/30 bg-error/5 dark:border-error/50 dark:bg-error/10'
                          : participationRate >= 70
                            ? 'border-warning/40 bg-warning/5 dark:border-warning/60 dark:bg-warning/10'
                            : 'border-gray-200 dark:border-gray-700'
                    } hover:border-gray-900 dark:hover:border-gray-400`}
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* 左側: 衣装画像エリア */}
                      <div className="md:w-64 h-64 md:h-auto relative overflow-hidden bg-gray-50 dark:bg-gray-800">
                        {slot.costume_image_url ? (
                          <Image
                            src={slot.costume_image_url}
                            alt={`枠${index + 1}の衣装`}
                            fill
                            className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() =>
                              handleImageClick(slot.costume_image_url!)
                            }
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-gray-400 dark:text-gray-600 text-sm">
                              衣装画像なし
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 右側: 情報エリア */}
                      <div className="flex-1 p-6 md:p-8">
                        {/* 上部: 衣装テーマ + 時間 + ステータスバッジ */}
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">
                                第{index + 1}枠
                              </span>
                              {slot.costume_description && (
                                <>
                                  <span className="text-gray-400 dark:text-gray-500">
                                    ・
                                  </span>
                                  <span>{slot.costume_description}</span>
                                </>
                              )}
                            </h3>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                              <FormattedDateTime
                                value={slotStartTime}
                                format="time-range"
                                endValue={slotEndTime}
                              />
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isUserBooked && (
                              <Badge
                                variant="outline"
                                className="text-success border-success bg-success/10 font-medium whitespace-nowrap"
                              >
                                {tBooking('bookedSlot')}
                              </Badge>
                            )}
                            <Badge
                              variant={isSlotFull ? 'destructive' : 'default'}
                              className="text-sm font-semibold whitespace-nowrap"
                            >
                              {isSlotFull ? '満席' : '空きあり'}
                            </Badge>
                          </div>
                        </div>

                        {/* 抽選エントリー数表示（抽選方式の場合） */}
                        {session.booking_type === 'lottery' && (
                          <div className="mb-6 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <UsersIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                エントリー数
                              </span>
                            </div>
                            <div className="space-y-1">
                              {(() => {
                                if (!lotteryEntryCount) {
                                  return (
                                    <div className="text-sm text-muted-foreground">
                                      エントリー数: 取得中...
                                    </div>
                                  );
                                }

                                const slotEntry =
                                  lotteryEntryCount.entries_by_slot?.find(
                                    e => e.slot_id === slot.id
                                  );

                                if (slotEntry) {
                                  return (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span>
                                        エントリー数: {slotEntry.entry_count} 件
                                        {lotterySession?.max_entries &&
                                          ` / ${lotterySession.max_entries} 件上限`}
                                      </span>
                                      {lotterySession?.max_entries &&
                                        slotEntry.entry_count >=
                                          lotterySession.max_entries && (
                                          <Badge
                                            variant="destructive"
                                            className="text-xs"
                                          >
                                            上限到達
                                          </Badge>
                                        )}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="text-sm text-muted-foreground">
                                    エントリー数: 0 件
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* 下部: 参加者数 + 料金（2列グリッド、左ボーダー付き） */}
                        <div className="grid grid-cols-2 gap-6">
                          <StatItem
                            label="参加人数"
                            value={
                              <>
                                {currentParticipants}
                                <span className="text-lg text-gray-500 dark:text-gray-400">
                                  /{slot.max_participants}
                                </span>
                              </>
                            }
                          />
                          <StatItem
                            label="料金"
                            value={
                              slot.price_per_person === 0 ? (
                                '無料'
                              ) : (
                                <FormattedPrice
                                  value={slot.price_per_person}
                                  format="simple"
                                />
                              )
                            }
                          />
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

      {/* チェックイン状態表示（参加者でスロット予約がある場合のみ） */}
      {user &&
        !loading &&
        isParticipant &&
        hasSlots &&
        userBooking &&
        'slot_id' in userBooking &&
        userBooking.slot_id && (
          <BookingCheckInStatus
            checkedInAt={
              'checked_in_at' in userBooking
                ? (userBooking.checked_in_at as string | null | undefined)
                : undefined
            }
            checkedOutAt={
              'checked_out_at' in userBooking
                ? (userBooking.checked_out_at as string | null | undefined)
                : undefined
            }
            locale={locale}
          />
        )}

      {/* グループチャット機能（メッセージシステムが利用可能な場合のみ） */}
      {user && !loading && (isOrganizer || isParticipant) && (
        <div className="space-y-4 print:hidden">
          <PhotoSessionGroupChat
            sessionId={session.id}
            sessionTitle={session.title}
            sessionDate={startDate}
            sessionLocation={session.location}
            organizerId={session.organizer_id}
            currentUserId={user.id}
            participants={participants}
          />
        </div>
      )}

      {/* ドキュメント管理機能 */}
      {user && !loading && (isOrganizer || isParticipant) && (
        <div className="print:hidden">
          <PhotoSessionDocuments
            sessionId={session.id}
            currentUserId={user.id}
            isOrganizer={isOrganizer}
            participants={participants}
          />
        </div>
      )}

      {/* レビューセクション */}
      <Card className="print:hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" />
              レビュー
            </CardTitle>
            {canReview && userBooking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(
                    `/${locale}/photo-sessions/${session.id}/reviews`
                  );
                }}
              >
                <Star className="h-4 w-4" />
                {hasExistingReview ? 'レビュー修正' : 'レビューを書く'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ReviewList photoSessionId={session.id} showAddReviewButton={false} />
        </CardContent>
      </Card>

      {/* 注意事項（主催者以外のみ表示） */}
      {!isOrganizer && (
        <>
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">ご注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
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
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">開催者向け注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
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

      {/* 固定フッターアクションバー */}
      {!isOrganizer && user && (
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={1}
          background="blur"
          autoHide={false}
        />
      )}

      {/* 画像ライトボックス */}
      <ImageLightbox
        imageUrl={lightboxImage}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt="撮影会画像"
      />
    </div>
  );
}
