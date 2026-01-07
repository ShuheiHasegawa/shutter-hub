'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  CalendarProvider,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  type Feature,
  useCalendarMonth,
  useCalendarYear,
} from '@/components/ui/shadcn-io/calendar';
import { Clock, Plus, Copy, Calendar, AlertCircle } from 'lucide-react';
import { FormattedDateTime } from '@/components/ui/formatted-display';
import { getDaysInMonth, getDay } from 'date-fns';
import { toast } from 'sonner';
import {
  createUserAvailability,
  getUserAvailability,
  deleteUserAvailability,
} from '@/app/actions/user-availability';
import {
  timeToMinutes,
  validateTimeRange,
  formatDateToLocalString,
} from '@/lib/utils/time-utils';
import type { TimeSlot } from '@/types/user-availability';
import { getOrganizersOfModelAction } from '@/app/actions/organizer-model';
import { logger } from '@/lib/utils/logger';

interface UserScheduleManagerProps {
  userId: string;
  isOwnProfile: boolean;
  userType: 'model' | 'photographer' | 'organizer';
}

// カレンダーの状態変更を監視するコンポーネント
function CalendarStateWatcher({
  onDateChange,
}: {
  onDateChange: (month: number, year: number) => void;
}) {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();

  useEffect(() => {
    onDateChange(month, year);
  }, [month, year, onDateChange]);

  return null;
}

// 統合カレンダーグリッドコンポーネント（ヘッダー＋ボディを1つのグリッドで管理）
interface UnifiedCalendarGridProps {
  features: Feature[];
  onDateClick: (date: Date) => void;
  onBadgeClick: (date: Date) => void;
  organizerLabelsByDay?: { [day: number]: string };
  showUserSchedule?: boolean;
  showOrganizerSchedule?: boolean;
}

function UnifiedCalendarGrid({
  features,
  onDateClick,
  onBadgeClick,
  organizerLabelsByDay,
  showUserSchedule,
  showOrganizerSchedule,
}: UnifiedCalendarGridProps) {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();

  const currentMonthDate = useMemo(
    () => new Date(year, month, 1),
    [year, month]
  );
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonthDate),
    [currentMonthDate]
  );
  const firstDay = useMemo(() => getDay(currentMonthDate), [currentMonthDate]);

  const daysData = ['日', '月', '火', '水', '木', '金', '土'];
  const featuresMap = useMemo(() => {
    const map: { [dateKey: string]: Feature[] } = {};
    features.forEach(feature => {
      const dateKey = `${feature.startAt.getFullYear()}-${feature.startAt.getMonth()}-${feature.startAt.getDate()}`;
      if (!map[dateKey]) map[dateKey] = [];

      // 複数の時間枠が含まれている場合は分割
      const timeRanges = feature.name.split(', ');
      if (timeRanges.length > 1) {
        // 複数の時間枠を個別のfeatureとして追加
        timeRanges.forEach(timeRange => {
          const splitFeature = {
            ...feature,
            name: timeRange.trim(),
          };
          map[dateKey].push(splitFeature);
        });
      } else {
        // 単一の時間枠
        map[dateKey].push(feature);
      }
    });
    return map;
  }, [features]);

  return (
    <div className="w-full border border-gray-200">
      <table
        className="w-full border-collapse"
        style={{ tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            {daysData.map(day => (
              <th
                key={`header-${day}`}
                className="p-1 sm:p-2 lg:p-3 text-center text-muted-foreground text-xs sm:text-sm font-medium bg-muted/30 border border-gray-200 h-12 sm:h-14 lg:h-16"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 週ごとに行を作成 */}
          {Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) }).map(
            (_, weekIdx) => (
              <tr
                key={`week-${weekIdx}`}
                style={{
                  height: '120px', // 固定高さを設定
                }}
              >
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cellIndex = weekIdx * 7 + dayIdx;
                  const day = cellIndex - firstDay + 1;
                  const isCurrentMonth = day > 0 && day <= daysInMonth;
                  const currentDate = new Date(year, month, day);
                  // 日付キーを生成（featuresMapと同じ形式）
                  const dateKey = isCurrentMonth
                    ? `${year}-${month}-${day}`
                    : '';
                  const featuresForDay = isCurrentMonth
                    ? featuresMap[dateKey] || []
                    : [];

                  return (
                    <td
                      key={`cell-${weekIdx}-${dayIdx}`}
                      className="relative p-1 sm:p-2 lg:p-3 border border-gray-200 align-top cursor-pointer hover:bg-accent/20 transition-colors"
                      style={{
                        height: '100%', // 親要素の高さいっぱいに
                      }}
                      onClick={() => isCurrentMonth && onDateClick(currentDate)}
                    >
                      {isCurrentMonth && (
                        <>
                          {/* 日付番号 */}
                          <div className="text-[10px] sm:text-xs font-medium mb-0.5 leading-none">
                            {day}
                          </div>

                          {/* スケジュール表示エリア */}
                          <div className="flex flex-col gap-0.5 overflow-visible">
                            {/* 所属運営のスケジュール */}
                            {organizerLabelsByDay &&
                              organizerLabelsByDay[day] &&
                              showOrganizerSchedule && (
                                <div className="flex-shrink-0">
                                  <div
                                    className="relative text-xs px-0.5 py-0.5 rounded truncate"
                                    style={{ backgroundColor: '#16a34a20' }}
                                  >
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                                      style={{ backgroundColor: '#16a34a' }}
                                    />
                                    <span className="ml-1 hidden lg:inline text-xs truncate">
                                      {organizerLabelsByDay[day]}
                                    </span>
                                    <div className="ml-1 lg:hidden text-[10px] sm:text-[9px] font-mono leading-tight">
                                      {(() => {
                                        const timeText =
                                          organizerLabelsByDay[day];
                                        if (
                                          !timeText ||
                                          typeof timeText !== 'string'
                                        ) {
                                          return timeText || '●';
                                        }
                                        const timeMatch = timeText.match(
                                          /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/
                                        );
                                        if (timeMatch) {
                                          return (
                                            <div className="flex flex-col">
                                              <div>{timeMatch[1]}</div>
                                              <div>-{timeMatch[2]}</div>
                                            </div>
                                          );
                                        }
                                        return timeText;
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* ユーザーのスケジュール */}
                            {featuresForDay.length > 0 && showUserSchedule && (
                              <div className="flex flex-col gap-0.5 overflow-visible">
                                {featuresForDay.map((feature, idx) => (
                                  <div
                                    key={`feature-${idx}`}
                                    className="flex-shrink-0"
                                  >
                                    <div
                                      className="relative text-xs px-0.5 py-0.5 rounded truncate cursor-pointer"
                                      style={{
                                        backgroundColor:
                                          feature.status.color + '10',
                                      }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        onBadgeClick(currentDate);
                                      }}
                                    >
                                      <div
                                        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                                        style={{
                                          backgroundColor: feature.status.color,
                                        }}
                                      />
                                      <span className="ml-1 hidden lg:inline text-xs truncate">
                                        {feature.name}
                                      </span>
                                      <div className="ml-1 lg:hidden text-[10px] sm:text-[9px] font-mono leading-tight">
                                        {(() => {
                                          const timeText = feature.name || '●';
                                          if (timeText === '●') return timeText;
                                          const timeMatch = timeText.match(
                                            /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/
                                          );
                                          if (timeMatch) {
                                            return (
                                              <div className="flex flex-col">
                                                <div>{timeMatch[1]}</div>
                                                <div>-{timeMatch[2]}</div>
                                              </div>
                                            );
                                          }
                                          return timeText;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

// モバイル用のカレンダー移動ナビゲーションコンポーネント
function MobileCalendarNavigation() {
  return (
    <div className="flex items-center justify-center gap-2">
      {/* 年選択 */}
      <div className="bg-background/80 rounded px-1 py-1 text-xs">
        <CalendarDatePicker>
          <div className="w-20 [&_button]:!w-20 [&_button]:!min-w-20 [&_button]:text-xs [&_button]:px-2 [&_button]:py-1 [&_button]:h-7">
            <CalendarYearPicker end={2026} start={2024} />
          </div>
        </CalendarDatePicker>
      </div>

      {/* 月選択 */}
      <div className="bg-background/80 rounded px-1 py-1 text-xs">
        <CalendarDatePicker>
          <div className="w-20 [&_button]:!w-20 [&_button]:!min-w-20 [&_button]:text-xs [&_button]:px-2 [&_button]:py-1 [&_button]:h-7">
            <CalendarMonthPicker />
          </div>
        </CalendarDatePicker>
      </div>

      {/* ナビゲーションボタン（PCと同じ） */}
      <CalendarDatePagination />
    </div>
  );
}

export function UserScheduleManager({
  userId,
  isOwnProfile,
  userType,
}: UserScheduleManagerProps) {
  const _t = useTranslations('profile');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userSlots, setUserSlots] = useState<TimeSlot[]>([]);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMemoDialog, setShowMemoDialog] = useState(false);
  const [organizerLabelsByDay, setOrganizerLabelsByDay] = useState<{
    [day: number]: string;
  }>({});

  // レイヤー表示制御
  const [showUserSchedule, setShowUserSchedule] = useState(true);
  const [showOrganizerSchedule, setShowOrganizerSchedule] = useState(true);

  // カレンダー表示の月年を管理
  const [displayMonth, setDisplayMonth] = useState<number>(
    new Date().getMonth()
  );
  const [displayYear, setDisplayYear] = useState<number>(
    new Date().getFullYear()
  );

  // 所属運営データのキャッシング（重複呼び出し防止）
  const organizerDataCacheRef = useRef<{
    userId: string;
    data: unknown;
    timestamp: number;
  } | null>(null);
  const CACHE_TTL = 60000; // 60秒間キャッシュ保持

  // フォーム状態
  const [formData, setFormData] = useState({
    startTime: '10:00',
    endTime: '18:00',
    notes: '',
  });

  // 空き時間データの読み込み
  const loadUserAvailability = useCallback(
    async (targetMonth?: number, targetYear?: number) => {
      setIsLoading(true);
      try {
        // 指定された月の前後1ヶ月分のデータを取得（デフォルトは現在月）
        const now = new Date();
        const month = targetMonth ?? now.getMonth();
        const year = targetYear ?? now.getFullYear();

        const startDate = new Date(year, month - 1, 1); // 1ヶ月前の1日
        const endDate = new Date(year, month + 1, 0); // 1ヶ月後の末日

        const result = await getUserAvailability(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        if (result.success && result.data) {
          setUserSlots(result.data);
        } else {
          toast.error(result.error || '空き時間の取得に失敗しました');
        }
      } catch {
        toast.error('予期しないエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  // ユーザーの空き時間をカレンダー用Featureに変換
  const transformUserSlotsToFeatures = useCallback((): Feature[] => {
    const slotsByDate = userSlots.reduce(
      (acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      },
      {} as Record<string, TimeSlot[]>
    );

    return Object.entries(slotsByDate).map(([date, slots]) => {
      // 時刻表示を生成（時計アイコンは不要）
      const timeRanges = slots
        .sort((a, b) => a.startMinutes - b.startMinutes)
        .map(slot => `${slot.startTime}-${slot.endTime}`)
        .join(', ');

      const displayName =
        slots.length <= 3 ? timeRanges : `${slots.length}件 (${timeRanges})`;

      return {
        id: `user-${date}`,
        name: displayName,
        startAt: new Date(date + 'T00:00:00'),
        endAt: new Date(date + 'T23:59:59'),
        status: {
          id: 'user-available',
          name: '設定済み',
          color: '#3B82F6', // 青色
        },
      };
    });
  }, [userSlots]);

  // 日付クリック処理（閲覧専用: 詳細ダイアログを開く）
  const handleDateClick = useCallback(async (date: Date) => {
    setSelectedDate(date);
    setShowMemoDialog(true); // 常に閲覧専用ダイアログを開く
  }, []);

  // 選択された日の時間枠取得
  const getSelectedDateSlots = useCallback((): TimeSlot[] => {
    if (!selectedDate) return [];
    const dateStr = formatDateToLocalString(selectedDate);
    return userSlots.filter(slot => slot.date === dateStr);
  }, [selectedDate, userSlots]);

  // 時間枠追加
  const handleAddSlot = useCallback(async () => {
    if (!selectedDate) return;

    const validation = validateTimeRange(formData.startTime, formData.endTime);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsLoading(true);
    try {
      const result = await createUserAvailability({
        available_date: formatDateToLocalString(selectedDate),
        start_time_minutes: timeToMinutes(formData.startTime),
        end_time_minutes: timeToMinutes(formData.endTime),
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success('空き時間を追加しました');
        await loadUserAvailability();
        setFormData({ startTime: '10:00', endTime: '18:00', notes: '' });
        setIsCreating(false);
        // モーダルを閉じる
        setShowModal(false);
      } else {
        toast.error(result.error || '追加に失敗しました');
      }
    } catch {
      toast.error('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, formData, loadUserAvailability]);

  // 時間枠削除
  const handleDeleteSlot = useCallback(
    async (slotId: string) => {
      setIsLoading(true);
      try {
        const result = await deleteUserAvailability(slotId);

        if (result.success) {
          toast.success('空き時間を削除しました');
          await loadUserAvailability();
          setEditingSlot(null);
        } else {
          toast.error(result.error || '削除に失敗しました');
        }
      } catch {
        toast.error('予期しないエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserAvailability]
  );

  // 初期データ読み込み
  useEffect(() => {
    loadUserAvailability();
  }, [loadUserAvailability]);

  // カレンダー表示月の変更を監視してデータを再取得
  useEffect(() => {
    // 表示月に基づいてデータを取得
    loadUserAvailability(displayMonth, displayYear);

    // 所属運営の空き時間も再取得（モデルのみ）
    if (userType === 'model') {
      const loadOrganizerData = async () => {
        try {
          // キャッシュをチェック
          const now = Date.now();
          const cacheValid =
            organizerDataCacheRef.current &&
            organizerDataCacheRef.current.userId === userId &&
            now - organizerDataCacheRef.current.timestamp < CACHE_TTL;

          if (cacheValid && organizerDataCacheRef.current) {
            logger.info('[UserScheduleManager] Using cached organizer data');
            // キャッシュからデータを使用
            const orgRes = organizerDataCacheRef.current.data as unknown as {
              success?: boolean;
              data?: Array<{ id: string; organizer_id?: string }>;
            } | null;
            // ... 以下、orgResを使用する処理は同じ
            if (orgRes?.success && orgRes?.data && orgRes.data.length > 0) {
              const monthStart = new Date(displayYear, displayMonth, 1);
              const monthEnd = new Date(displayYear, displayMonth + 1, 0);

              const supabase = await (
                await import('@/lib/supabase/client')
              ).createClient();

              const labels: { [day: number]: string } = {};

              for (const org of orgRes.data) {
                const { data: slots } = await supabase
                  .from('user_availability')
                  .select(
                    'available_date, start_time_minutes, end_time_minutes'
                  )
                  .eq('user_id', org.organizer_id)
                  .eq('is_active', true)
                  .gte('available_date', monthStart.toISOString().split('T')[0])
                  .lte('available_date', monthEnd.toISOString().split('T')[0]);

                (slots || []).forEach(
                  (s: {
                    available_date: string;
                    start_time_minutes: number;
                    end_time_minutes: number;
                  }) => {
                    const d = new Date(s.available_date);
                    const day = d.getDate();
                    const start = `${String(Math.floor(s.start_time_minutes / 60)).padStart(2, '0')}:${String(
                      s.start_time_minutes % 60
                    ).padStart(2, '0')}`;
                    const end = `${String(Math.floor(s.end_time_minutes / 60)).padStart(2, '0')}:${String(
                      s.end_time_minutes % 60
                    ).padStart(2, '0')}`;
                    const range = `${start}-${end}`;
                    const prev = labels[day];
                    if (prev) {
                      const merged = `${prev}, ${range}`;
                      labels[day] = merged.split(', ').slice(0, 3).join(', ');
                    } else {
                      labels[day] = range;
                    }
                  }
                );
              }
              setOrganizerLabelsByDay(labels);
            } else {
              setOrganizerLabelsByDay({});
            }
            return;
          }

          // キャッシュがないまたは無効 → 新規取得
          logger.info('[UserScheduleManager] Fetching organizer data from API');
          const orgRes = await getOrganizersOfModelAction(userId);

          // キャッシュに保存
          organizerDataCacheRef.current = {
            userId,
            data: orgRes,
            timestamp: now,
          };

          if (orgRes.success && orgRes.data && orgRes.data.length > 0) {
            const monthStart = new Date(displayYear, displayMonth, 1);
            const monthEnd = new Date(displayYear, displayMonth + 1, 0);

            const supabase = await (
              await import('@/lib/supabase/client')
            ).createClient();

            const labels: { [day: number]: string } = {};

            for (const org of orgRes.data) {
              const { data: slots } = await supabase
                .from('user_availability')
                .select('available_date, start_time_minutes, end_time_minutes')
                .eq('user_id', org.organizer_id)
                .eq('is_active', true)
                .gte('available_date', monthStart.toISOString().split('T')[0])
                .lte('available_date', monthEnd.toISOString().split('T')[0]);

              (slots || []).forEach(
                (s: {
                  available_date: string;
                  start_time_minutes: number;
                  end_time_minutes: number;
                }) => {
                  const d = new Date(s.available_date);
                  const day = d.getDate();
                  const start = `${String(Math.floor(s.start_time_minutes / 60)).padStart(2, '0')}:${String(
                    s.start_time_minutes % 60
                  ).padStart(2, '0')}`;
                  const end = `${String(Math.floor(s.end_time_minutes / 60)).padStart(2, '0')}:${String(
                    s.end_time_minutes % 60
                  ).padStart(2, '0')}`;
                  const range = `${start}-${end}`;
                  const prev = labels[day];
                  if (prev) {
                    const merged = `${prev}, ${range}`;
                    labels[day] = merged.split(', ').slice(0, 3).join(', ');
                  } else {
                    labels[day] = range;
                  }
                }
              );
            }

            setOrganizerLabelsByDay(labels);
          } else {
            setOrganizerLabelsByDay({});
          }
        } catch {
          setOrganizerLabelsByDay({});
        }
      };

      loadOrganizerData();
    }
  }, [
    displayMonth,
    displayYear,
    loadUserAvailability,
    userType,
    userId,
    CACHE_TTL,
  ]);

  const features = transformUserSlotsToFeatures();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* 閲覧専用の案内 */}
      <Alert className="py-2">
        <AlertCircle className="h-5 w-5 text-blue-500" />
        <AlertDescription className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mt-3">
          <span className="flex-1">
            このページではスケジュールの確認のみ可能です。
          </span>
        </AlertDescription>
      </Alert>

      {/* メインカレンダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Calendar className="h-4 w-4 lg:h-5 lg:w-5" />
            スケジュールカレンダー
            {isOwnProfile && (
              <div className="flex items-center justify-end">
                <Link href="/calendar">
                  <Button variant="navigation" size="sm">
                    空き時間の編集はカレンダーページへ →
                  </Button>
                </Link>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 sm:pt-0 overflow-hidden">
          <CalendarProvider locale="ja-JP" startDay={0}>
            <CalendarStateWatcher
              onDateChange={(month, year) => {
                if (month !== displayMonth || year !== displayYear) {
                  setDisplayMonth(month);
                  setDisplayYear(year);
                }
              }}
            />
            <CalendarDate>
              {/* PC表示（lg以上）: 横並びレイアウト */}
              <div className="hidden lg:flex items-center justify-between gap-4 mb-4">
                <CalendarDatePicker>
                  <div className="flex items-center gap-2">
                    <CalendarYearPicker end={2026} start={2024} />
                    <CalendarMonthPicker />
                  </div>
                </CalendarDatePicker>
                <CalendarDatePagination />
              </div>

              {/* モバイル・タブレット表示（lg未満）: 1行レイアウト */}
              <div className="block lg:hidden">
                <MobileCalendarNavigation />
              </div>
            </CalendarDate>

            <div className="w-full">
              <UnifiedCalendarGrid
                features={features}
                onDateClick={handleDateClick}
                onBadgeClick={date => {
                  setSelectedDate(date);
                  if (isOwnProfile) {
                    // 自分のプロフィールの場合は編集モーダルを開く
                    setShowModal(true);
                    setEditingSlot(null);
                    setIsCreating(false);
                  } else {
                    // 他人のプロフィールの場合は詳細表示のみ
                    setShowMemoDialog(true);
                  }
                }}
                organizerLabelsByDay={organizerLabelsByDay}
                showUserSchedule={showUserSchedule}
                showOrganizerSchedule={showOrganizerSchedule}
              />
            </div>

            {/* カレンダー表示オプション（直下配置） */}
            <div className="mt-2 mb-4">
              <div className="flex flex-wrap justify-center gap-4 p-3 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={showUserSchedule}
                    onCheckedChange={checked =>
                      setShowUserSchedule(checked === true)
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium">空き時間</span>
                  </div>
                </label>

                {userType === 'model' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={showOrganizerSchedule}
                      onCheckedChange={checked =>
                        setShowOrganizerSchedule(checked === true)
                      }
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        所属運営の対応可能時間
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </CalendarProvider>
        </CardContent>
      </Card>

      {/* 設定済み空き時間一覧 */}
      <Card>
        <CardHeader className="pb-3 lg:pb-6">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Clock className="h-4 w-4 lg:h-5 lg:w-5" />
            設定済み空き時間
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 lg:p-6 lg:pt-0">
          <div className="space-y-4">
            {userSlots.length === 0 ? (
              <div className="text-center py-4 space-y-4">
                <p className="text-muted-foreground text-sm lg:text-base">
                  空き時間が設定されていません。
                  {isOwnProfile &&
                    'カレンダーから日付を選択して設定してください。'}
                </p>
                {isOwnProfile && (
                  <div className="p-3 rounded border border-blue-200 mx-2 lg:mx-0">
                    <p className="text-xs lg:text-sm">
                      💡{' '}
                      <strong>
                        空き時間を設定して撮影チャンスを増やしましょう
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              userSlots.map(slot => (
                <div
                  key={slot.id}
                  className="flex items-start justify-between p-3 sm:p-4 border rounded-lg gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <div className="font-medium text-sm sm:text-base">
                        {slot.date}
                      </div>
                      <div className="font-mono text-xs sm:text-sm">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </div>
                    {slot.notes && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {slot.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* スケジュール編集モーダル */}
      {isOwnProfile && (
        <Dialog
          open={showModal}
          onOpenChange={open => {
            setShowModal(open);
            if (!open) {
              // モーダルを閉じる際に状態をクリア
              setSelectedDate(null);
              setEditingSlot(null);
              setIsCreating(false);
              setFormData({ startTime: '10:00', endTime: '18:00', notes: '' });
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                スケジュール編集 -{' '}
                {selectedDate ? (
                  <FormattedDateTime value={selectedDate} format="date-short" />
                ) : (
                  ''
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* 空き時間管理（最優先表示） */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingSlot
                      ? '空き時間編集'
                      : isCreating
                        ? '新しい空き時間追加'
                        : '空き時間管理'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isCreating && !editingSlot ? (
                    <div className="space-y-4">
                      {/* 既存空き時間一覧 */}
                      <div className="space-y-2">
                        <h4 className="font-medium">
                          この日の設定済み空き時間
                        </h4>
                        {getSelectedDateSlots().length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            空き時間が設定されていません
                          </p>
                        ) : (
                          getSelectedDateSlots().map(slot => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between border rounded"
                            >
                              <div>
                                <div className="font-mono text-sm">
                                  {slot.startTime} - {slot.endTime}
                                </div>
                                {slot.notes && (
                                  <div className="text-xs text-muted-foreground">
                                    {slot.notes}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="neutral"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSlot(slot);
                                    setFormData({
                                      startTime: slot.startTime,
                                      endTime: slot.endTime,
                                      notes: slot.notes || '',
                                    });
                                  }}
                                >
                                  編集
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                >
                                  削除
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* アクションボタン */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="cta"
                          className="w-full sm:w-auto"
                          onClick={() => setIsCreating(true)}
                        >
                          <Plus className="h-4 w-4" />
                          空き時間を追加
                        </Button>
                        {getSelectedDateSlots().length > 0 && (
                          <Button variant="outline">
                            <Copy className="h-4 w-4" />
                            他の日に複製
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 時間入力フォーム */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startTime">開始時間</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                startTime: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime">終了時間</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={formData.endTime}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                endTime: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">メモ（任意）</Label>
                        <Textarea
                          id="notes"
                          placeholder="この時間帯に関するメモ..."
                          value={formData.notes}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </div>

                      {/* 時間プリセット */}
                      <div className="space-y-2">
                        <Label>よく使う時間設定</Label>
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                startTime: '09:00',
                                endTime: '17:00',
                              }))
                            }
                          >
                            9:00-17:00
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                startTime: '10:00',
                                endTime: '18:00',
                              }))
                            }
                          >
                            10:00-18:00
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                startTime: '13:00',
                                endTime: '21:00',
                              }))
                            }
                          >
                            13:00-21:00
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* フォームアクション */}
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCreating(false);
                            setEditingSlot(null);
                            setFormData({
                              startTime: '10:00',
                              endTime: '18:00',
                              notes: '',
                            });
                          }}
                        >
                          キャンセル
                        </Button>
                        <Button
                          variant="cta"
                          onClick={handleAddSlot}
                          disabled={isLoading}
                        >
                          {editingSlot ? '更新' : '追加'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 空き時間詳細表示ダイアログ（他人のプロフィール閲覧用） */}
      <Dialog open={showMemoDialog} onOpenChange={setShowMemoDialog}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              空き時間詳細 -{' '}
              {selectedDate ? (
                <FormattedDateTime value={selectedDate} format="date-short" />
              ) : (
                ''
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {getSelectedDateSlots().length === 0 ? (
              <p className="text-sm text-muted-foreground">
                この日は空き時間が設定されていません
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">設定されている空き時間:</p>
                {getSelectedDateSlots().map(slot => (
                  <div key={slot.id} className="p-3 border rounded bg-muted/30">
                    <div className="font-mono text-sm font-medium mb-2 text-blue-600">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    {slot.notes?.trim() && (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        <span className="font-medium">メモ:</span>{' '}
                        {slot.notes.trim()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowMemoDialog(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
