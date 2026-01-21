import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { logger } from '@/lib/utils/logger';
import { useToast } from '@/hooks/use-toast';
import {
  SettingsIcon,
  UsersIcon,
  EditIcon,
  BarChart3Icon,
  CalendarIcon,
  CopyIcon,
  Clock,
  Shuffle,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { PhotoSessionSlot } from '@/types/photo-session';
import { useRouter } from 'next/navigation';
import { formatTime } from '@/lib/utils/date';
import { LotterySettingsForm } from '@/components/organizer/LotterySettingsForm';
import { LotteryStatistics } from '@/components/organizer/LotteryStatistics';
import { LotteryWinnersList } from '@/components/organizer/LotteryWinnersList';
import { AdminLotterySelection } from '@/components/organizer/AdminLotterySelection';
import { AdminLotteryWinnersList } from '@/components/organizer/AdminLotteryWinnersList';
import { executeWeightedLottery } from '@/app/actions/multi-slot-lottery';
import { getLotterySession } from '@/app/actions/photo-session-lottery';
import { getAdminLotterySession } from '@/app/actions/admin-lottery';
import type { LotterySessionWithSettings } from '@/types/multi-slot-lottery';
import { CheckInManagement } from './CheckInManagement';
import { useLocale } from 'next-intl';

interface OrganizerManagementPanelProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
  lotteryEntryCount?: {
    total_entries: number;
    total_groups: number;
    entries_by_slot?: Array<{
      slot_id: string;
      slot_number: number;
      entry_count: number;
    }>;
  } | null;
  lotterySession?: {
    max_entries: number | null;
  } | null;
  slotBookingCounts?: { [slotId: string]: number };
}

export function OrganizerManagementPanel({
  session,
  slots,
  lotteryEntryCount,
  lotterySession: lotterySessionProp,
  slotBookingCounts,
}: OrganizerManagementPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const locale = useLocale();
  const hasSlots = slots && slots.length > 0;
  const [lotterySession, setLotterySession] =
    useState<LotterySessionWithSettings | null>(null);
  const [adminLotterySession, setAdminLotterySession] = useState<{
    id: string;
    max_selections: number;
    status: string;
    enable_lottery_weight?: boolean;
  } | null>(null);
  const [isLoadingLottery, setIsLoadingLottery] = useState(false);
  const [isLoadingAdminLottery, setIsLoadingAdminLottery] = useState(false);
  const [isExecutingLottery, setIsExecutingLottery] = useState(false);
  const [showLotterySettings, setShowLotterySettings] = useState(false);
  const [showLotteryStatistics, setShowLotteryStatistics] = useState(false);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);

  // 撮影会の日時状態を判定
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isPast = endDate <= now;

  // デバッグ用ログ（本番環境では削除予定）
  logger.debug('[OrganizerManagementPanel] 日時判定', {
    sessionTitle: session.title,
    endTime: session.end_time,
    endDate: endDate.toISOString(),
    now: now.toISOString(),
    isPast,
    timeDifference: endDate.getTime() - now.getTime(),
  });

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
  const totalBookings = hasSlots
    ? slots.reduce((sum, slot) => {
        // slotBookingCountsが渡されている場合はそれを使用、なければcurrent_participantsを使用
        const count = slotBookingCounts?.[slot.id] ?? slot.current_participants;
        return sum + count;
      }, 0)
    : session.current_participants;
  const totalCapacity = hasSlots
    ? slots.reduce((sum, slot) => sum + slot.max_participants, 0)
    : session.max_participants;

  const getBookingRate = () => {
    if (totalCapacity === 0) return 0;
    return Math.round((totalBookings / totalCapacity) * 100);
  };

  const getStatusColor = () => {
    const rate = getBookingRate();
    if (rate >= 90) return 'bg-success';
    if (rate >= 70) return 'bg-warning';
    if (rate >= 50) return 'bg-info';
    return 'bg-gray-400';
  };

  // 抽選セッション情報を取得
  useEffect(() => {
    const loadLotterySession = async () => {
      if (session.booking_type !== 'lottery') {
        return;
      }

      setIsLoadingLottery(true);
      try {
        const result = await getLotterySession(session.id);
        if (result.data) {
          setLotterySession(result.data as LotterySessionWithSettings);
        }
      } catch (error) {
        logger.error('抽選セッション取得エラー:', error);
      } finally {
        setIsLoadingLottery(false);
      }
    };

    loadLotterySession();
  }, [session.id, session.booking_type]);

  // 管理抽選セッション情報を取得
  useEffect(() => {
    const loadAdminLotterySession = async () => {
      if (session.booking_type !== 'admin_lottery') {
        return;
      }

      setIsLoadingAdminLottery(true);
      try {
        const result = await getAdminLotterySession(session.id);
        logger.info('管理抽選セッション取得結果:', {
          hasData: !!result.data,
          hasError: !!result.error,
          error: result.error,
          data: result.data,
        });

        if (result.error) {
          logger.error('管理抽選セッション取得エラー:', result.error);
          setAdminLotterySession(null);
          return;
        }

        if (result.data) {
          logger.info('管理抽選セッション設定:', {
            id: result.data.id,
            max_selections: result.data.max_selections,
            status: result.data.status,
            enable_lottery_weight: result.data.enable_lottery_weight,
          });
          setAdminLotterySession({
            id: result.data.id,
            max_selections: result.data.max_selections,
            status: result.data.status,
            enable_lottery_weight: result.data.enable_lottery_weight,
          });
        } else {
          logger.warn('管理抽選セッションが見つかりません:', session.id);
          setAdminLotterySession(null);
        }
      } catch (error) {
        logger.error('管理抽選セッション取得エラー:', error);
      } finally {
        setIsLoadingAdminLottery(false);
      }
    };

    loadAdminLotterySession();
  }, [session.id, session.booking_type]);

  // 抽選実行確認ダイアログを表示
  const handleExecuteLotteryClick = () => {
    setShowExecuteConfirm(true);
  };

  // 抽選実行
  const handleExecuteLottery = async () => {
    if (!lotterySession || isExecutingLottery) return;

    setShowExecuteConfirm(false);
    setIsExecutingLottery(true);

    try {
      const result = await executeWeightedLottery(lotterySession.id);
      if (result.success) {
        // 即座に抽選セッションの状態を更新（リロード前にボタンを無効化）
        setLotterySession(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            status: 'completed',
          };
        });

        toast({
          title: '抽選完了',
          description: `${result.total_winners}名が当選しました`,
        });
        // ページをリロードして最新状態を表示
        router.refresh();
      } else {
        toast({
          title: 'エラー',
          description: result.message || '抽選の実行に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('抽選実行エラー:', error);
      toast({
        title: 'エラー',
        description: '抽選の実行中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsExecutingLottery(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">予約状況</p>
                <p className="text-2xl font-bold">
                  {totalBookings}/{totalCapacity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <span className="text-sm font-medium">{getBookingRate()}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {hasSlots ? '撮影枠数' : '予約方式'}
                </p>
                <p className="text-2xl font-bold">
                  {hasSlots
                    ? slots.length
                    : getBookingTypeLabel(session.booking_type || 'first_come')}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">収益予想</p>
                <p className="text-2xl font-bold">
                  ¥
                  {(
                    totalBookings * (session.price_per_person || 0)
                  ).toLocaleString()}
                </p>
              </div>
              <BarChart3Icon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 管理アクション */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            管理アクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => router.push(`/photo-sessions/${session.id}/edit`)}
              disabled={isPast}
              title={
                isPast ? '終了済みの撮影会は編集できません' : '撮影会を編集'
              }
            >
              <EditIcon className="h-5 w-5" />
              <span className="text-sm">
                {isPast ? '編集不可（終了済み）' : '撮影会を編集'}
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() =>
                router.push(`/photo-sessions/${session.id}/duplicate`)
              }
            >
              <CopyIcon className="h-5 w-5" />
              <span className="text-sm">撮影会を複製</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() =>
                router.push(`/photo-sessions/${session.id}/participants`)
              }
            >
              <UsersIcon className="h-5 w-5" />
              <span className="text-sm">参加者管理</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() =>
                router.push(`/photo-sessions/${session.id}/analytics`)
              }
            >
              <BarChart3Icon className="h-5 w-5" />
              <span className="text-sm">分析・統計</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 抽選管理機能（抽選方式の場合のみ） */}
      {session.booking_type === 'lottery' && hasSlots && slots.length > 1 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="h-5 w-5" />
              複数撮影枠抽選管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingLottery ? (
              <div className="text-center py-4 text-muted-foreground">
                読み込み中...
              </div>
            ) : lotterySession ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex-col gap-2"
                    onClick={() => setShowLotterySettings(!showLotterySettings)}
                  >
                    <SettingsIcon className="h-5 w-5" />
                    <span className="text-sm">抽選設定</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex-col gap-2"
                    onClick={() =>
                      setShowLotteryStatistics(!showLotteryStatistics)
                    }
                  >
                    <BarChart3Icon className="h-5 w-5" />
                    <span className="text-sm">集計・統計</span>
                  </Button>

                  {lotterySession.status === 'accepting' && (
                    <Button
                      variant="default"
                      className="h-auto p-4 flex-col gap-2"
                      onClick={handleExecuteLotteryClick}
                      disabled={isExecutingLottery}
                    >
                      <Shuffle className="h-5 w-5" />
                      <span className="text-sm">
                        {isExecutingLottery ? '抽選実行中...' : '抽選実行'}
                      </span>
                    </Button>
                  )}
                </div>

                {showLotterySettings && (
                  <div className="mt-4">
                    <LotterySettingsForm
                      lotterySessionId={lotterySession.id}
                      lotteryStatus={lotterySession.status}
                      onSave={() => {
                        setShowLotterySettings(false);
                        // 抽選セッション情報を再取得
                        getLotterySession(session.id).then(result => {
                          if (result.data) {
                            setLotterySession(
                              result.data as LotterySessionWithSettings
                            );
                          }
                        });
                      }}
                    />
                  </div>
                )}

                {showLotteryStatistics && (
                  <div className="mt-4">
                    <LotteryStatistics lotterySessionId={lotterySession.id} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                抽選セッションが見つかりません
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* タイムライン型レイアウト（撮影枠制の場合） */}
      {hasSlots && (
        <Card className="print:hidden">
          <CardHeader>
            <div className="mb-6 flex items-center">
              <Clock className="mr-3 h-6 w-6" />
              <h2>撮影枠別予約状況</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {slots.map((slot, index) => {
                // slotBookingCountsが渡されている場合はそれを使用、なければcurrent_participantsを使用
                const currentParticipants =
                  slotBookingCounts?.[slot.id] ?? slot.current_participants;
                const isFullyBooked =
                  currentParticipants >= slot.max_participants;
                const bookingRate =
                  slot.max_participants > 0
                    ? Math.round(
                        (currentParticipants / slot.max_participants) * 100
                      )
                    : 0;
                const revenue =
                  currentParticipants *
                  (slot.price_per_person || session.price_per_person);
                const showProgress = slot.max_participants > 1; // 予約可能人数が1人の場合は進捗非表示

                return (
                  <div key={slot.id} className="relative mb-8">
                    <div
                      className={`absolute left-8 top-0 bottom-0 w-0.5 ${
                        isFullyBooked ? 'bg-error' : 'bg-success'
                      }`}
                      style={{
                        top: '-1rem',
                        bottom: index === slots.length - 1 ? '0' : '-1rem',
                      }}
                    ></div>

                    <div
                      className={`absolute left-6 top-0 h-4 w-4 rounded-full border-2 border-white ${
                        isFullyBooked ? 'bg-error' : 'bg-success'
                      }`}
                    ></div>

                    <div className="ml-16">
                      <Card className="border-0 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Badge
                                variant="outline"
                                className={`mr-2 font-semibold ${
                                  isFullyBooked
                                    ? 'bg-error/10 text-error border-error/30'
                                    : 'bg-success/10 text-success border-success/30'
                                }`}
                              >
                                枠 {slot.slot_number}
                              </Badge>
                              <h3 className="text-lg font-semibold">
                                {formatTime(new Date(slot.start_time))} -{' '}
                                {formatTime(new Date(slot.end_time))}
                              </h3>
                            </div>

                            <Badge
                              className={`${
                                isFullyBooked
                                  ? 'bg-error hover:bg-error/90'
                                  : 'bg-success hover:bg-success/90'
                              }`}
                            >
                              {isFullyBooked ? '満席' : '空きあり'}
                            </Badge>
                          </div>

                          {/* 抽選エントリー数表示（抽選方式の場合） */}
                          {session.booking_type === 'lottery' &&
                            lotteryEntryCount?.entries_by_slot && (
                              <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    エントリー数
                                  </span>
                                </div>
                                <div className="mt-1">
                                  {(() => {
                                    const slotEntry =
                                      lotteryEntryCount.entries_by_slot?.find(
                                        e => e.slot_id === slot.id
                                      );

                                    if (slotEntry) {
                                      return (
                                        <div className="flex items-center gap-2 text-sm">
                                          <span>
                                            エントリー数:{' '}
                                            {slotEntry.entry_count} 件
                                            {lotterySessionProp?.max_entries &&
                                              ` / ${lotterySessionProp.max_entries} 件上限`}
                                          </span>
                                          {lotterySessionProp?.max_entries &&
                                            slotEntry.entry_count >=
                                              lotterySessionProp.max_entries && (
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

                          <div
                            className={`grid ${showProgress ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'} gap-4 mt-3`}
                          >
                            <div>
                              <div className="text-sm text-gray-600">
                                参加者
                              </div>
                              <div className="font-semibold">
                                {currentParticipants}/{slot.max_participants}人
                              </div>
                            </div>

                            {/* 予約率表示（予約可能人数が1人の場合は非表示） */}
                            {showProgress && (
                              <div>
                                <div className="text-sm text-gray-600">
                                  予約率
                                </div>
                                <div className="font-semibold">
                                  {bookingRate}%
                                </div>
                              </div>
                            )}

                            <div>
                              <div className="text-sm text-gray-600">料金</div>
                              <div className="font-semibold">
                                ¥
                                {(
                                  slot.price_per_person ||
                                  session.price_per_person
                                ).toLocaleString()}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600">収益</div>
                              <div
                                className={`font-semibold ${revenue > 0 ? 'text-success' : ''}`}
                              >
                                ¥{revenue.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* 予約進捗表示（予約可能人数が1人の場合は非表示） */}
                          {showProgress && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span>予約進捗</span>
                                <span>{bookingRate}%</span>
                              </div>
                              <Progress
                                value={bookingRate}
                                className={`h-1.5 ${isFullyBooked ? 'bg-rose-200' : 'bg-success/20'}`}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* チェックイン管理（撮影枠がある場合のみ） */}
      {hasSlots && (
        <div className="mt-6">
          <CheckInManagement
            sessionId={session.id}
            slots={slots}
            locale={locale}
            session={session}
          />
        </div>
      )}

      {/* 当選者リスト（抽選完了後） */}
      {session.booking_type === 'lottery' &&
        hasSlots &&
        slots.length > 1 &&
        lotterySession &&
        lotterySession.status === 'completed' && (
          <div className="mt-6 print:hidden">
            <LotteryWinnersList lotterySessionId={lotterySession.id} />
          </div>
        )}

      {/* 管理抽選：応募者リスト・当選者選択 */}
      {session.booking_type === 'admin_lottery' && (
        <div className="mt-6 print:hidden">
          {isLoadingAdminLottery ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  管理抽選セッション情報を読み込み中...
                </div>
              </CardContent>
            </Card>
          ) : !hasSlots ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  撮影枠が設定されていません
                </div>
              </CardContent>
            </Card>
          ) : !adminLotterySession ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  管理抽選セッションが見つかりません
                </div>
              </CardContent>
            </Card>
          ) : adminLotterySession.status === 'completed' ? null : (
            <AdminLotterySelection
              adminLotterySessionId={adminLotterySession.id}
              maxSelections={adminLotterySession.max_selections}
              slots={slots.map(slot => ({
                id: slot.id,
                slot_number: slot.slot_number,
                max_participants: slot.max_participants,
              }))}
              enableLotteryWeight={adminLotterySession.enable_lottery_weight}
              onSelectionComplete={() => {
                // 管理抽選セッション情報を再取得
                getAdminLotterySession(session.id).then(result => {
                  if (result.data) {
                    setAdminLotterySession({
                      id: result.data.id,
                      max_selections: result.data.max_selections,
                      status: result.data.status,
                      enable_lottery_weight: result.data.enable_lottery_weight,
                    });
                  }
                });
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {/* 管理抽選：当選者リスト（確定後） */}
      {session.booking_type === 'admin_lottery' &&
        hasSlots &&
        adminLotterySession &&
        adminLotterySession.status === 'completed' && (
          <div className="mt-6 print:hidden">
            <AdminLotteryWinnersList
              adminLotterySessionId={adminLotterySession.id}
              slots={slots.map(slot => ({
                id: slot.id,
                slot_number: slot.slot_number,
                max_participants: slot.max_participants,
              }))}
            />
          </div>
        )}

      {/* 抽選実行確認ダイアログ */}
      <AlertDialog
        open={showExecuteConfirm}
        onOpenChange={setShowExecuteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>抽選を実行しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。抽選を実行すると、当選者が確定し、自動的に予約が作成されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="cta"
                onClick={handleExecuteLottery}
                disabled={isExecutingLottery}
              >
                {isExecutingLottery ? '抽選実行中...' : '抽選実行'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
