'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { BackButton } from '../ui/back-button';
import { ReviewList } from '@/components/reviews/ReviewList';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { getLotterySession } from '@/app/actions/photo-session-lottery';
import { getPhotoSessionStudioAction } from '@/app/actions/photo-session-studio';
import { BookingCheckInStatus } from '@/components/bookings/BookingCheckInStatus';

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
  } | null;
  studio?: {
    id: string;
    name: string;
  } | null;
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
  studio: initialStudio,
}: PhotoSessionDetailProps) {
  // #region agent log
  useEffect(() => {
    // セッションIDが変わったらデータ取得フラグをリセット
    hasLoadedDataRef.current = false;

    fetch('http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'PhotoSessionDetail.tsx:97',
        message: 'コンポーネントマウント',
        data: { sessionId: session.id },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run3',
        hypothesisId: 'N',
      }),
    }).catch(() => {});
    return () => {
      fetch(
        'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'PhotoSessionDetail.tsx:97',
            message: 'コンポーネントアンマウント',
            data: { sessionId: session.id },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run3',
            hypothesisId: 'N',
          }),
        }
      ).catch(() => {});
    };
  }, [session.id]);
  // #endregion

  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('photoSessions');
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'PhotoSessionDetail.tsx:198',
        message: 'useEffect実行開始',
        data: {
          sessionId: session.id,
          userId: user?.id,
          authLoading,
          isLoadingData,
          userBooking: !!stableUserBooking,
          isPast,
          hasLoadedData: hasLoadedDataRef.current,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run3',
        hypothesisId: 'K',
      }),
    }).catch(() => {});
    // #endregion

    // 認証状態の読み込み中は待機
    if (authLoading) {
      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'PhotoSessionDetail.tsx:223',
            message: '認証読み込み中 - 待機',
            data: { authLoading },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run3',
            hypothesisId: 'K',
          }),
        }
      ).catch(() => {});
      // #endregion
      return;
    }

    // 既にデータを取得済みの場合はスキップ（認証状態が変わっただけの場合）
    if (hasLoadedDataRef.current && user?.id) {
      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'PhotoSessionDetail.tsx:245',
            message: '既にデータ取得済み - スキップ',
            data: { userId: user.id },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run3',
            hypothesisId: 'K',
          }),
        }
      ).catch(() => {});
      // #endregion
      return;
    }

    const loadAllData = async () => {
      // 既に実行中の場合は重複実行を防ぐ
      if (isLoadingData) {
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'PhotoSessionDetail.tsx:171',
              message: '重複実行をスキップ',
              data: { isLoadingData },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run2',
              hypothesisId: 'G',
            }),
          }
        ).catch(() => {});
        // #endregion
        logger.debug('[PhotoSessionDetail] 既に実行中 - 重複実行をスキップ');
        return;
      }

      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'PhotoSessionDetail.tsx:176',
            message: 'loadAllData開始',
            data: { sessionId: session.id, userId: user?.id },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run2',
            hypothesisId: 'H',
          }),
        }
      ).catch(() => {});
      // #endregion

      logger.debug('[PhotoSessionDetail] loadAllData開始', {
        sessionId: session.id,
        userId: user?.id,
      });

      // ユーザーが未ログインの場合は早期リターン（認証読み込み完了後）
      if (!user) {
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'PhotoSessionDetail.tsx:185',
              message: 'ユーザー未ログイン - 処理スキップ',
              data: {},
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run2',
              hypothesisId: 'I',
            }),
          }
        ).catch(() => {});
        // #endregion
        logger.debug('[PhotoSessionDetail] ユーザー未ログイン - 処理スキップ');
        setLoading(false);
        return;
      }

      setIsLoadingData(true);

      try {
        // レビュー可能かチェック（予約済みで撮影会終了後）
        const canReviewNow = !!stableUserBooking && isPast;

        // 条件付き並列実行のためのpromises配列
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'PhotoSessionDetail.tsx:181',
              message: 'getPhotoSessionParticipants呼び出し前',
              data: { sessionId: session.id },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'D',
            }),
          }
        ).catch(() => {});
        // #endregion
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
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'PhotoSessionDetail.tsx:250',
              message: '参加者データ取得完了',
              data: { participantsCount: participantsData.length },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run3',
              hypothesisId: 'L',
            }),
          }
        ).catch(() => {});
        // #endregion
        setParticipants(participantsData);

        // データ取得完了フラグを設定
        hasLoadedDataRef.current = true;

        // checkUserParticipationの代わりに、participantsデータから判定
        const userParticipation = participantsData.some(
          p => p.user_id === user.id
        );
        setIsParticipant(userParticipation);

        // 抽選セッション情報の処理
        if (session.booking_type === 'lottery' && results[1]) {
          const lotterySessionResult = results[1] as Awaited<
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
          }
        }

        // 既存レビューの処理
        if (canReviewNow && results[results.length - 1]) {
          const reviewResult = results[results.length - 1] as {
            data: { id: string } | null;
            error: unknown;
          };
          setHasExistingReview(!!reviewResult.data);
        }
      } catch (error) {
        logger.error('[PhotoSessionDetail] データ読み込みエラー:', error);
      } finally {
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/0b62af13-0d04-4c38-8e09-5e16a4cac0dd',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'PhotoSessionDetail.tsx:333',
              message: 'loadAllData完了',
              data: {},
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run3',
              hypothesisId: 'M',
            }),
          }
        ).catch(() => {});
        // #endregion
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
        <Badge variant="destructive" className="text-sm px-3 py-1">
          終了
        </Badge>
      );
    }
    if (isOngoing) {
      return (
        <Badge variant="outline" className="text-sm px-3 py-1">
          開催中
        </Badge>
      );
    }
    if (isUpcoming) {
      return (
        <Badge variant="outline" className="text-sm px-3 py-1">
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
        buttons.push({
          id: 'select-slot',
          label: bookingLoading
            ? '確認中...'
            : allSlotsEntryFull
              ? 'エントリー上限'
              : '時間枠を選択',
          variant: 'accent',
          onClick: async () => {
            const canProceed = await handleRatingCheck();
            if (canProceed) {
              router.push(`?step=select`, { scroll: false });
            }
          },
          disabled: bookingLoading || allSlotsEntryFull,
          icon: <Calendar className="h-4 w-4" />,
        });
      } else {
        buttons.push({
          id: 'book-now',
          label: bookingLoading
            ? '確認中...'
            : isFull
              ? 'キャンセル待ち'
              : '予約する',
          variant: isFull ? 'accent' : 'primary',
          onClick: async () => {
            const canProceed = await handleRatingCheck();
            if (canProceed) {
              router.push(`?step=select`, { scroll: false });
            }
          },
          disabled: bookingLoading,
          icon: <CreditCard className="h-4 w-4" />,
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
      });
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
    <div className="w-full max-w-6xl mx-auto space-y-6">
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
              <div className="flex items-center gap-2">
                <BackButton />
                <CardTitle className="text-lg leading-tight">
                  {session.title}
                </CardTitle>
              </div>
              <div className="flex items-center justify-between">
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
            <div className="hidden md:flex justify-between items-start">
              <div className="flex items-center gap-2">
                <BackButton />
                <CardTitle className="text-2xl">{session.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
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
          </CardHeader>
          <CardContent className="p-4">
            {session.description && (
              <div>
                <h3 className="font-semibold mb-2">撮影会について</h3>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {session.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
              <div className="space-y-4">
                <h3 className="font-semibold">開催詳細</h3>
                <div className="space-y-3">
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
                      className="aspect-video rounded-lg overflow-hidden bg-gray-100 relative"
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
          />
        )) as any
      }
      {/* eslint-enable @typescript-eslint/no-explicit-any */}

      {/* 参加者・未参加者向け撮影会情報 */}
      {!isOrganizer && (
        <Card className="print:hidden">
          <CardHeader>
            {/* スマホ表示: 縦並びレイアウト */}
            <div className="flex flex-col space-y-4 md:hidden">
              <div className="flex items-center gap-2">
                <BackButton />
                <CardTitle className="text-lg leading-tight">
                  {session.title}
                </CardTitle>
              </div>
              <div className="flex items-center justify-between">
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
            <div className="hidden md:flex justify-between items-start">
              <div className="flex items-center gap-2">
                <BackButton />
                <CardTitle className="text-2xl">{session.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
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
          </CardHeader>
          <CardContent className="p-4">
            {session.description && (
              <div>
                <h3 className="font-semibold mb-2">撮影会について</h3>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {session.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
              <div className="space-y-4">
                <h3 className="font-semibold">開催詳細</h3>
                <div className="space-y-3">
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
                      className="aspect-video rounded-lg overflow-hidden bg-gray-100 relative"
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
                      <Badge variant="outline" className="font-medium">
                        枠 {index + 1}
                      </Badge>
                      <Badge
                        variant={isSlotFull ? 'destructive' : 'default'}
                        className="text-sm font-medium"
                      >
                        {isSlotFull ? '満席' : '空きあり'}
                      </Badge>
                    </div>

                    {/* 抽選エントリー数表示（抽選方式の場合） */}
                    {session.booking_type === 'lottery' && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
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
                          <FormattedDateTime
                            value={slotStartTime}
                            format="time-range"
                            endValue={slotEndTime}
                          />
                        </div>
                      </div>

                      {/* 料金 */}
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                          <CircleDollarSignIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">料金</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {slot.price_per_person === 0 ? (
                            '無料'
                          ) : (
                            <FormattedPrice
                              value={slot.price_per_person}
                              format="simple"
                            />
                          )}
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
                <Star className="h-4 w-4 mr-2" />
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
          <Card className="print:hidden">
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

      {/* 固定フッターアクションバー */}
      {!isOrganizer && user && (
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={1}
          background="blur"
          autoHide={false}
        />
      )}
    </div>
  );
}
