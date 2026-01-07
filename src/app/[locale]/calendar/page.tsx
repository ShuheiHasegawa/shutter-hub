'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSimpleProfile';
import { useRouter } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
// import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { PageTitleHeader } from '@/components/ui/page-title-header';
import {
  CalendarProvider,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  // CalendarHeader,
  // CalendarBody,
  // CalendarItem,
  type Feature,
  useCalendarMonth,
  useCalendarYear,
} from '@/components/ui/shadcn-io/calendar';
import { Clock, Plus, Calendar, /* AlertCircle, */ Trash2 } from 'lucide-react';
import { FormattedDateTime } from '@/components/ui/formatted-display';
import { getDaysInMonth, getDay } from 'date-fns';
import { toast } from 'sonner';
import {
  createUserAvailability,
  getUserAvailability,
  deleteUserAvailability,
} from '@/app/actions/user-availability';
import {
  getPhotoSessionsForCalendar,
  type PhotoSessionCalendarData,
} from '@/app/actions/photo-sessions-calendar';
import {
  timeToMinutes,
  validateTimeRange,
  formatDateToLocalString,
} from '@/lib/utils/time-utils';
import type { TimeSlot } from '@/types/user-availability';
import {
  getOrganizersOfModelAction,
  getOrganizerModelsByUserIdAction,
} from '@/app/actions/organizer-model';
import { logger } from '@/lib/utils/logger';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';
import { MultiSelect } from '@/components/ui/multi-select';
import { useTranslations } from 'next-intl';

// カラーパレット定義（モデルごとに異なる色）- 16色に拡張
const MODEL_COLORS = [
  '#a855f7', // 紫
  '#f97316', // オレンジ
  '#ec4899', // ピンク
  '#06b6d4', // シアン
  '#84cc16', // ライム
  '#f59e0b', // アンバー
  '#8b5cf6', // バイオレット
  '#14b8a6', // ティール
  '#ef4444', // レッド
  '#3b82f6', // ブルー
  '#10b981', // エメラルド
  '#f43f5e', // ローズ
  '#6366f1', // インディゴ
  '#eab308', // イエロー
  '#d946ef', // フクシア
  '#0ea5e9', // スカイ
];

// モデルIDに基づいて色を割り当てる関数
const getModelColor = (
  modelId: string,
  allModels: OrganizerModelWithProfile[]
): string => {
  const index = allModels.findIndex(m => m.model_id === modelId);
  return MODEL_COLORS[index % MODEL_COLORS.length];
};

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

// 統合カレンダーグリッドコンポーネント
interface UnifiedCalendarGridProps {
  userFeatures: Feature[];
  photoSessionFeatures: Feature[];
  onDateClick: (date: Date) => void;
  organizerLabelsByDay?: { [day: number]: string };
  modelAvailabilityMap?: { [modelId: string]: { [day: number]: string } };
  selectedModelIds?: string[];
  organizerModels?: OrganizerModelWithProfile[];
  showUserSchedule: boolean;
  showOrganizerSchedule: boolean;
  showModelSchedule: boolean;
  showPhotoSessions: boolean;
  onPhotoSessionClick: (featureId: string) => void;
}

function UnifiedCalendarGrid({
  userFeatures,
  photoSessionFeatures,
  onDateClick,
  organizerLabelsByDay,
  modelAvailabilityMap,
  selectedModelIds,
  organizerModels,
  showUserSchedule,
  showOrganizerSchedule,
  showModelSchedule,
  showPhotoSessions,
  onPhotoSessionClick,
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

  // ユーザーの空き時間マップ
  const userFeaturesMap = useMemo(() => {
    const map: { [dateKey: string]: Feature[] } = {};
    userFeatures.forEach(feature => {
      const dateKey = `${feature.startAt.getFullYear()}-${feature.startAt.getMonth()}-${feature.startAt.getDate()}`;
      if (!map[dateKey]) map[dateKey] = [];
      const timeRanges = feature.name.split(', ');
      if (timeRanges.length > 1) {
        timeRanges.forEach(timeRange => {
          map[dateKey].push({ ...feature, name: timeRange.trim() });
        });
      } else {
        map[dateKey].push(feature);
      }
    });
    return map;
  }, [userFeatures]);

  // 撮影会マップ
  const sessionFeaturesMap = useMemo(() => {
    const map: { [dateKey: string]: Feature[] } = {};
    photoSessionFeatures.forEach(feature => {
      const dateKey = `${feature.startAt.getFullYear()}-${feature.startAt.getMonth()}-${feature.startAt.getDate()}`;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(feature);
    });
    return map;
  }, [photoSessionFeatures]);

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
          {Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) }).map(
            (_, weekIdx) => (
              <tr key={`week-${weekIdx}`} style={{ height: '140px' }}>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cellIndex = weekIdx * 7 + dayIdx;
                  const day = cellIndex - firstDay + 1;
                  const isCurrentMonth = day > 0 && day <= daysInMonth;
                  const currentDate = new Date(year, month, day);
                  const dateKey = isCurrentMonth
                    ? `${year}-${month}-${day}`
                    : '';
                  const userFeaturesForDay = isCurrentMonth
                    ? userFeaturesMap[dateKey] || []
                    : [];
                  const sessionFeaturesForDay = isCurrentMonth
                    ? sessionFeaturesMap[dateKey] || []
                    : [];

                  return (
                    <td
                      key={`cell-${weekIdx}-${dayIdx}`}
                      className="relative p-1 sm:p-2 lg:p-3 border border-gray-200 align-top cursor-pointer hover:bg-accent/20 transition-colors"
                      style={{ height: '100%' }}
                      onClick={() => isCurrentMonth && onDateClick(currentDate)}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className="text-[10px] sm:text-xs font-medium mb-0.5 leading-none">
                            {day}
                          </div>

                          <div className="flex flex-col gap-0.5 overflow-visible">
                            {/* 撮影会 */}
                            {showPhotoSessions &&
                              sessionFeaturesForDay.map((feature, idx) => (
                                <div
                                  key={`session-${idx}`}
                                  className="relative text-xs px-0.5 py-0.5 rounded truncate cursor-pointer"
                                  style={{
                                    backgroundColor:
                                      feature.status.color + '20',
                                  }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    onPhotoSessionClick(feature.id);
                                  }}
                                >
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                                    style={{
                                      backgroundColor: feature.status.color,
                                    }}
                                  />
                                  <span className="ml-1 text-[10px] lg:text-xs truncate block">
                                    {feature.name}
                                  </span>
                                </div>
                              ))}

                            {/* 所属運営スケジュール */}
                            {organizerLabelsByDay &&
                              organizerLabelsByDay[day] &&
                              showOrganizerSchedule && (
                                <div
                                  className="relative text-xs px-0.5 py-0.5 rounded truncate"
                                  style={{ backgroundColor: '#16a34a20' }}
                                >
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                                    style={{ backgroundColor: '#16a34a' }}
                                  />
                                  <span className="ml-1 text-[10px] lg:text-xs truncate block">
                                    {organizerLabelsByDay[day]}
                                  </span>
                                </div>
                              )}

                            {/* 所属モデルスケジュール - モデルごとに色分けして表示 */}
                            {showModelSchedule &&
                              selectedModelIds &&
                              organizerModels &&
                              selectedModelIds.map(modelId => {
                                const modelData = organizerModels.find(
                                  m => m.model_id === modelId
                                );
                                const availability =
                                  modelAvailabilityMap?.[modelId]?.[day];

                                if (!availability || !modelData) return null;

                                const modelColor = getModelColor(
                                  modelId,
                                  organizerModels
                                );
                                const modelName =
                                  modelData.model_profile?.display_name ||
                                  'モデル';

                                return (
                                  <div
                                    key={`model-${modelId}-${day}`}
                                    className="relative text-xs px-0.5 py-0.5 rounded truncate"
                                    style={{
                                      backgroundColor: modelColor + '20',
                                    }}
                                  >
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                                      style={{ backgroundColor: modelColor }}
                                    />
                                    <span className="ml-1 text-[10px] lg:text-xs truncate block">
                                      {availability}: {modelName}
                                    </span>
                                  </div>
                                );
                              })}

                            {/* ユーザー空き時間 */}
                            {showUserSchedule &&
                              userFeaturesForDay.map((feature, idx) => (
                                <div
                                  key={`user-${idx}`}
                                  className="relative text-xs px-0.5 py-0.5 rounded truncate"
                                  style={{
                                    backgroundColor:
                                      feature.status.color + '10',
                                  }}
                                >
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                                    style={{
                                      backgroundColor: feature.status.color,
                                    }}
                                  />
                                  <span className="ml-1 text-[10px] lg:text-xs truncate block">
                                    {feature.name}
                                  </span>
                                </div>
                              ))}
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

// モバイル用ナビゲーション
function MobileCalendarNavigation() {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className="bg-background/80 rounded px-1 py-1 text-xs">
        <CalendarDatePicker>
          <div className="w-20 [&_button]:!w-20 [&_button]:!min-w-20 [&_button]:text-xs [&_button]:px-2 [&_button]:py-1 [&_button]:h-7">
            <CalendarYearPicker end={2026} start={2024} />
          </div>
        </CalendarDatePicker>
      </div>
      <div className="bg-background/80 rounded px-1 py-1 text-xs">
        <CalendarDatePicker>
          <div className="w-20 [&_button]:!w-20 [&_button]:!min-w-20 [&_button]:text-xs [&_button]:px-2 [&_button]:py-1 [&_button]:h-7">
            <CalendarMonthPicker />
          </div>
        </CalendarDatePicker>
      </div>
      <CalendarDatePagination />
    </div>
  );
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const router = useRouter();
  const t = useTranslations('profile.schedule');
  const tCommon = useTranslations('common');

  // 状態
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userSlots, setUserSlots] = useState<TimeSlot[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoSessions, setPhotoSessions] = useState<
    PhotoSessionCalendarData[]
  >([]);
  const [organizerLabelsByDay, setOrganizerLabelsByDay] = useState<{
    [day: number]: string;
  }>({});
  const [organizerModels, setOrganizerModels] = useState<
    OrganizerModelWithProfile[]
  >([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [modelAvailabilityMap, setModelAvailabilityMap] = useState<{
    [modelId: string]: { [day: number]: string };
  }>({});

  // 表示切り替え
  const [showUserSchedule, setShowUserSchedule] = useState(true);
  const [showOrganizerSchedule, setShowOrganizerSchedule] = useState(true);
  const [showModelSchedule, setShowModelSchedule] = useState(true);
  const [showPhotoSessions, setShowPhotoSessions] = useState(true);

  // カレンダー月
  const [displayMonth, setDisplayMonth] = useState<number>(
    new Date().getMonth()
  );
  const [displayYear, setDisplayYear] = useState<number>(
    new Date().getFullYear()
  );

  // キャッシュ
  const organizerDataCacheRef = useRef<{
    userId: string;
    data: unknown;
    timestamp: number;
  } | null>(null);
  const CACHE_TTL = 60000;

  // 初期選択が行われたかどうかを追跡
  const hasInitializedModelSelection = useRef(false);

  // フォーム状態
  const [formData, setFormData] = useState({
    startTime: '10:00',
    endTime: '18:00',
    notes: '',
  });

  // 空き時間データ読み込み
  const loadUserAvailability = useCallback(
    async (targetMonth?: number, targetYear?: number) => {
      if (!user) return;
      setIsLoading(true);
      try {
        const now = new Date();
        const month = targetMonth ?? now.getMonth();
        const year = targetYear ?? now.getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month + 1, 0);

        const result = await getUserAvailability(
          user.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        if (result.success && result.data) {
          setUserSlots(result.data);
        }
      } catch (error) {
        logger.error('Availability fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // 撮影会データ読み込み
  const loadPhotoSessions = useCallback(async () => {
    if (!user || !profile) return;
    try {
      const result = await getPhotoSessionsForCalendar(
        user.id,
        profile.user_type
      );
      if (result.success && result.data) {
        setPhotoSessions(result.data);
      }
    } catch (error) {
      logger.error('Photo session data fetch error:', error);
    }
  }, [user, profile]);

  // ユーザー空き時間をFeatureに変換
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
      const timeRanges = slots
        .sort((a, b) => a.startMinutes - b.startMinutes)
        .map(slot => `${slot.startTime}-${slot.endTime}`)
        .join(', ');

      return {
        id: `user-${date}`,
        name: timeRanges,
        startAt: new Date(date + 'T00:00:00'),
        endAt: new Date(date + 'T23:59:59'),
        status: {
          id: 'user-available',
          name: t('availability'),
          color: '#3B82F6',
        },
      };
    });
  }, [userSlots, t]);

  // 撮影会をFeatureに変換
  const transformSessionsToFeatures = useCallback((): Feature[] => {
    return photoSessions.map(session => ({
      id: session.id,
      name: session.title,
      startAt: new Date(session.start_time),
      endAt: new Date(session.end_time),
      status: {
        id: session.booking_type,
        name: session.is_full ? t('full') : t('available'),
        color: session.is_full ? '#EF4444' : '#10B981',
      },
    }));
  }, [photoSessions, t]);

  // 日付クリック処理
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
    setIsCreating(false);
  }, []);

  // 撮影会クリック処理
  const handlePhotoSessionClick = useCallback(
    (sessionId: string) => {
      router.push(`/photo-sessions/${sessionId}`);
    },
    [router]
  );

  // 選択日の時間枠取得
  const getSelectedDateSlots = useCallback((): TimeSlot[] => {
    if (!selectedDate) return [];
    const dateStr = formatDateToLocalString(selectedDate);
    return userSlots.filter(slot => slot.date === dateStr);
  }, [selectedDate, userSlots]);

  // 選択日の所属モデル空き時間取得
  const getSelectedDateModelSlots = useCallback((): {
    modelId: string;
    modelName: string;
    modelColor: string;
    availability: string;
  }[] => {
    if (!selectedDate || profile?.user_type !== 'organizer') return [];

    const day = selectedDate.getDate();

    return organizerModels
      .filter(model => selectedModelIds.includes(model.model_id))
      .map(model => ({
        modelId: model.model_id,
        modelName: model.model_profile?.display_name || 'モデル',
        modelColor: getModelColor(model.model_id, organizerModels),
        availability: modelAvailabilityMap?.[model.model_id]?.[day] || '',
      }))
      .filter(item => item.availability); // 空き時間があるモデルのみ
  }, [
    selectedDate,
    profile?.user_type,
    organizerModels,
    selectedModelIds,
    modelAvailabilityMap,
  ]);

  // 選択日の所属運営空き時間取得（モデル側）
  const getSelectedDateOrganizerSlots = useCallback((): string | null => {
    if (!selectedDate || profile?.user_type !== 'model') return null;

    const day = selectedDate.getDate();
    return organizerLabelsByDay[day] || null;
  }, [selectedDate, profile?.user_type, organizerLabelsByDay]);

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
        toast.success(t('addAvailabilitySuccess'));
        await loadUserAvailability(displayMonth, displayYear);
        setFormData({ startTime: '10:00', endTime: '18:00', notes: '' });
        setIsCreating(false);
        setShowModal(false);
      } else {
        toast.error(result.error || t('addFailed'));
      }
    } catch {
      toast.error('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, formData, loadUserAvailability, displayMonth, displayYear]);

  // 時間枠削除
  const handleDeleteSlot = useCallback(
    async (slotId: string) => {
      setIsLoading(true);
      try {
        const result = await deleteUserAvailability(slotId);

        if (result.success) {
          toast.success(t('deleteAvailabilitySuccess'));
          await loadUserAvailability(displayMonth, displayYear);
        } else {
          toast.error(result.error || t('deleteFailed'));
        }
      } catch {
        toast.error('予期しないエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserAvailability, displayMonth, displayYear]
  );

  // 初期データ読み込み
  useEffect(() => {
    if (user && profile) {
      loadUserAvailability();
      loadPhotoSessions();
    }
  }, [user, profile, loadUserAvailability, loadPhotoSessions]);

  // カレンダー月変更時
  useEffect(() => {
    if (!user || !profile) return;

    loadUserAvailability(displayMonth, displayYear);

    // モデルの場合、所属運営スケジュールも取得
    if (profile.user_type === 'model') {
      const loadOrganizerData = async () => {
        try {
          const now = Date.now();
          const cacheValid =
            organizerDataCacheRef.current &&
            organizerDataCacheRef.current.userId === user.id &&
            now - organizerDataCacheRef.current.timestamp < CACHE_TTL;

          let orgRes: {
            success?: boolean;
            data?: Array<{
              organizer_id: string;
              organizer_name: string | null;
            }>;
          } | null = null;

          if (cacheValid && organizerDataCacheRef.current) {
            orgRes = organizerDataCacheRef.current.data as typeof orgRes;
          } else {
            orgRes = await getOrganizersOfModelAction(user.id);
            organizerDataCacheRef.current = {
              userId: user.id,
              data: orgRes,
              timestamp: now,
            };
          }

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

    // 運営者の場合、所属モデルのスケジュールを取得
    if (profile.user_type === 'organizer') {
      const loadModelData = async () => {
        try {
          const modelsRes = await getOrganizerModelsByUserIdAction(user.id);

          if (
            modelsRes.success &&
            modelsRes.data &&
            Array.isArray(modelsRes.data) &&
            modelsRes.data.length > 0
          ) {
            setOrganizerModels(modelsRes.data);

            const monthStart = new Date(displayYear, displayMonth, 1);
            const monthEnd = new Date(displayYear, displayMonth + 1, 0);
            const supabase = await (
              await import('@/lib/supabase/client')
            ).createClient();

            // モデルごとに空き時間を取得し、個別に管理
            const modelAvailabilityData: typeof modelAvailabilityMap = {};

            for (const model of modelsRes.data) {
              const { data: slots } = await supabase
                .from('user_availability')
                .select('available_date, start_time_minutes, end_time_minutes')
                .eq('user_id', model.model_id)
                .eq('is_active', true)
                .gte('available_date', monthStart.toISOString().split('T')[0])
                .lte('available_date', monthEnd.toISOString().split('T')[0]);

              const labels: { [day: number]: string } = {};
              (slots || []).forEach(
                (s: {
                  available_date: string;
                  start_time_minutes: number;
                  end_time_minutes: number;
                }) => {
                  const d = new Date(s.available_date);
                  const day = d.getDate();
                  const start = `${String(
                    Math.floor(s.start_time_minutes / 60)
                  ).padStart(2, '0')}:${String(
                    s.start_time_minutes % 60
                  ).padStart(2, '0')}`;
                  const end = `${String(
                    Math.floor(s.end_time_minutes / 60)
                  ).padStart(
                    2,
                    '0'
                  )}:${String(s.end_time_minutes % 60).padStart(2, '0')}`;
                  const range = `${start}-${end}`;
                  const prev = labels[day];
                  labels[day] = prev ? `${prev}, ${range}` : range;
                }
              );

              modelAvailabilityData[model.model_id] = labels;
            }

            setModelAvailabilityMap(modelAvailabilityData);
          } else {
            setOrganizerModels([]);
            setModelAvailabilityMap({});
          }
        } catch {
          setOrganizerModels([]);
          setModelAvailabilityMap({});
        }
      };

      loadModelData();
    }
  }, [
    displayMonth,
    displayYear,
    user,
    profile,
    loadUserAvailability,
    CACHE_TTL,
  ]);

  // 所属モデルが取得されたら、初期状態で全モデルを選択
  useEffect(() => {
    if (
      profile?.user_type === 'organizer' &&
      organizerModels.length > 0 &&
      !hasInitializedModelSelection.current
    ) {
      setSelectedModelIds(organizerModels.map(m => m.model_id));
      hasInitializedModelSelection.current = true;
    }
  }, [organizerModels, profile?.user_type]);

  const userFeatures = transformUserSlotsToFeatures();
  const sessionFeatures = transformSessionsToFeatures();

  // ローディング中（認証確認中も含む）
  if (authLoading || profileLoading || !user || !profile) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <PageTitleHeader title="カレンダー" />

      {/* メインカレンダー */}
      <Card>
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
              {/* PC表示 */}
              <div className="hidden lg:flex items-center justify-between gap-4 mb-4">
                <CalendarDatePicker>
                  <div className="flex items-center gap-2">
                    <CalendarYearPicker end={2026} start={2024} />
                    <CalendarMonthPicker />
                  </div>
                </CalendarDatePicker>
                <CalendarDatePagination />
              </div>

              {/* モバイル表示 */}
              <div className="block lg:hidden">
                <MobileCalendarNavigation />
              </div>
            </CalendarDate>

            {/* 運営者の場合：モデルフィルター */}
            {profile.user_type === 'organizer' &&
              organizerModels.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium mb-2 block">
                    {t('selectModelsLabel')}
                  </Label>
                  <MultiSelect
                    options={organizerModels.map(model => {
                      const modelColor = getModelColor(
                        model.model_id,
                        organizerModels
                      );
                      const ColorIcon = ({
                        className,
                      }: {
                        className?: string;
                      }) => (
                        <div
                          className={`h-3 w-3 rounded-full flex-shrink-0 ${className || ''}`}
                          style={{ backgroundColor: modelColor }}
                        />
                      );
                      return {
                        label: model.model_profile?.display_name || t('model'),
                        value: model.model_id,
                        icon: ColorIcon,
                      };
                    })}
                    onValueChange={setSelectedModelIds}
                    defaultValue={selectedModelIds}
                    placeholder={t('selectModelsPlaceholder')}
                    className="w-full"
                  />
                </div>
              )}

            <div className="w-full">
              <UnifiedCalendarGrid
                userFeatures={userFeatures}
                photoSessionFeatures={sessionFeatures}
                onDateClick={handleDateClick}
                organizerLabelsByDay={organizerLabelsByDay}
                modelAvailabilityMap={modelAvailabilityMap}
                selectedModelIds={selectedModelIds}
                organizerModels={organizerModels}
                showUserSchedule={showUserSchedule}
                showOrganizerSchedule={showOrganizerSchedule}
                showModelSchedule={showModelSchedule}
                showPhotoSessions={showPhotoSessions}
                onPhotoSessionClick={handlePhotoSessionClick}
              />
            </div>

            {/* 凡例・フィルタ */}
            <div className="mt-4">
              {/* 既存のチェックボックスフィルター */}
              <div className="flex flex-wrap justify-center gap-4 p-3 rounded-lg bg-muted/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={showPhotoSessions}
                    onCheckedChange={checked =>
                      setShowPhotoSessions(checked === true)
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {t('photoSessions')}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={showUserSchedule}
                    onCheckedChange={checked =>
                      setShowUserSchedule(checked === true)
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {t('availability')}
                    </span>
                  </div>
                </label>

                {profile.user_type === 'model' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={showOrganizerSchedule}
                      onCheckedChange={checked =>
                        setShowOrganizerSchedule(checked === true)
                      }
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {t('organizerAvailability')}
                      </span>
                    </div>
                  </label>
                )}

                {profile.user_type === 'organizer' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={showModelSchedule}
                      onCheckedChange={checked =>
                        setShowModelSchedule(checked === true)
                      }
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {t('modelAvailability')}
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
      <Card className="mt-6">
        <CardHeader className="pb-3 lg:pb-6">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Clock className="h-4 w-4 lg:h-5 lg:w-5" />
            {t('availableTimes')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 lg:p-6 lg:pt-0">
          <div className="space-y-4">
            {userSlots.length === 0 ? (
              <div className="text-center py-4 space-y-4">
                <p className="text-muted-foreground text-sm lg:text-base">
                  {t('noAvailability')} {t('noAvailabilityOwn')}
                </p>
                <div className="p-3 rounded border border-blue-200 mx-2 lg:mx-0">
                  <p className="text-xs lg:text-sm">
                    💡 <strong>{t('encourageSet')}</strong>
                  </p>
                </div>
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
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs px-2 py-1 sm:text-sm sm:px-3 sm:py-2"
                    onClick={() => handleDeleteSlot(slot.id)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* スケジュール編集モーダル */}
      <Dialog
        open={showModal}
        onOpenChange={open => {
          setShowModal(open);
          if (!open) {
            setSelectedDate(null);
            setIsCreating(false);
            setFormData({ startTime: '10:00', endTime: '18:00', notes: '' });
          }
        }}
      >
        <DialogContent className="max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('editTitle')} -{' '}
              {selectedDate ? (
                <FormattedDateTime value={selectedDate} format="date-short" />
              ) : (
                ''
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 既存の空き時間 */}
            {getSelectedDateSlots().length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  {t('yourScheduledAvailability')}
                </h4>
                {getSelectedDateSlots().map(slot => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="font-mono text-sm">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSlot(slot.id)}
                    >
                      {tCommon('delete')}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 区切り線 - 空き時間追加UIの前 */}
            {getSelectedDateSlots().length > 0 && <Separator />}

            {!isCreating ? (
              <Button
                className="w-full sm:w-auto"
                variant="cta"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4" />
                {t('addButton')}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">{t('startTime')}</Label>
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
                    <Label htmlFor="endTime">{t('endTime')}</Label>
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
                  <Label htmlFor="notes">{t('notes')}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t('notesPlaceholder')}
                    value={formData.notes}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('commonTimes')}</Label>
                  <div className="flex flex-wrap gap-2">
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

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setFormData({
                        startTime: '10:00',
                        endTime: '18:00',
                        notes: '',
                      });
                    }}
                  >
                    {tCommon('cancel')}
                  </Button>
                  <Button
                    variant="cta"
                    onClick={handleAddSlot}
                    disabled={isLoading}
                  >
                    {t('add')}
                  </Button>
                </div>
              </div>
            )}

            {/* 区切り線 - 所属モデルの空き時間の前 */}
            {profile.user_type === 'organizer' &&
              getSelectedDateModelSlots().length > 0 && <Separator />}

            {/* 所属モデルの空き時間 - 新規追加 */}
            {profile.user_type === 'organizer' &&
              getSelectedDateModelSlots().length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {t('modelAvailability')}
                  </h4>
                  <div className="space-y-1.5">
                    {getSelectedDateModelSlots().map(item => (
                      <div
                        key={item.modelId}
                        className="flex items-start gap-2 p-2 border rounded bg-muted/30"
                      >
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: item.modelColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.modelName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.availability}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 区切り線 - 所属運営の空き時間の前（モデル側） */}
            {profile.user_type === 'model' &&
              getSelectedDateOrganizerSlots() && <Separator />}

            {/* 所属運営の空き時間 - モデル側 */}
            {profile.user_type === 'model' &&
              getSelectedDateOrganizerSlots() && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {t('organizerAvailability')}
                  </h4>
                  <div className="p-2 border rounded bg-muted/30">
                    <div className="text-xs text-muted-foreground font-mono">
                      {getSelectedDateOrganizerSlots()}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
