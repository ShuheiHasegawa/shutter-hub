'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
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
import { getDaysInMonth, getDay } from 'date-fns';
import { toast } from 'sonner';
import {
  createUserAvailability,
  getUserAvailability,
  deleteUserAvailability,
  getOrganizerOverlaps,
} from '@/app/actions/user-availability';
import { timeToMinutes, validateTimeRange } from '@/lib/utils/time-utils';
import type { TimeSlot, OrganizerOverlap } from '@/types/user-availability';

interface UserScheduleManagerProps {
  userId: string;
  isOwnProfile: boolean;
  userType: 'model' | 'photographer' | 'organizer';
}

// カスタムカレンダーヘッダーコンポーネント
function CustomCalendarHeader() {
  const daysData = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="grid grid-cols-7 gap-0 border-l border-t border-gray-200 w-full overflow-hidden">
      {daysData.map(day => (
        <div
          key={day}
          className="p-1 sm:p-2 lg:p-3 text-center text-muted-foreground text-xs sm:text-sm font-medium border-r border-b border-gray-200 bg-muted/30"
        >
          {day}
        </div>
      ))}
    </div>
  );
}

// カスタムカレンダーボディコンポーネント
interface CustomCalendarBodyProps {
  features: Feature[];
  onDateClick: (date: Date) => void;
}

function CustomCalendarBody({
  features,
  onDateClick,
}: CustomCalendarBodyProps) {
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

  // 日付ごとの機能をグループ化
  const featuresByDay = useMemo(() => {
    const result: { [day: number]: Feature[] } = {};
    features.forEach(feature => {
      const day = feature.startAt.getDate();
      if (!result[day]) result[day] = [];
      result[day].push(feature);
    });
    return result;
  }, [features]);

  const days: React.ReactNode[] = [];

  // 前月の日付（空白部分）
  for (let i = 0; i < firstDay; i++) {
    days.push(
      <div
        key={`prev-${i}`}
        className="relative aspect-square min-h-10 sm:min-h-14 lg:min-h-20 p-1 border-r border-b border-gray-200 text-muted-foreground/50"
      >
        {/* 空白 */}
      </div>
    );
  }

  // 現在月の日付
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const featuresForDay = featuresByDay[day] || [];

    days.push(
      <div
        key={day}
        className="relative aspect-square min-h-10 sm:min-h-14 lg:min-h-20 p-0.5 sm:p-1 border-r border-b border-gray-200 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={() => onDateClick(currentDate)}
      >
        {/* 日付番号 */}
        <div className="text-xs font-medium mb-0.5">{day}</div>

        {/* 空き時間表示（left-line-sectionスタイル） */}
        {featuresForDay.length > 0 && (
          <div className="mt-0.5">
            <div
              className="relative text-xs px-0.5 py-0.5 rounded truncate"
              style={{ backgroundColor: featuresForDay[0].status.color + '10' }}
            >
              {/* 左側縦線 */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                style={{ backgroundColor: featuresForDay[0].status.color }}
              />
              {/* テキスト（レスポンシブ） */}
              <span className="ml-1 hidden lg:inline text-xs truncate">
                {featuresForDay[0].name}
              </span>
              <span className="ml-1 lg:hidden text-xs">●</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 来月の日付（空白部分）
  const remainingDays = 7 - ((firstDay + daysInMonth) % 7);
  if (remainingDays < 7) {
    for (let i = 0; i < remainingDays; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="relative aspect-square min-h-10 sm:min-h-14 lg:min-h-20 p-1 border-r border-b border-gray-200 text-muted-foreground/50"
        >
          {/* 空白 */}
        </div>
      );
    }
  }

  return (
    <div className="grid grid-cols-7 gap-0 border-l border-t border-gray-200 w-full overflow-hidden">
      {days}
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
  const [organizerOverlaps, setOrganizerOverlaps] = useState<
    OrganizerOverlap[]
  >([]);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // レイヤー表示制御
  const [showUserLayer, setShowUserLayer] = useState(true);
  const [showOrganizerLayer, setShowOrganizerLayer] = useState(true);
  const [showOverlapLayer, setShowOverlapLayer] = useState(true);

  // フォーム状態
  const [formData, setFormData] = useState({
    startTime: '10:00',
    endTime: '18:00',
    notes: '',
  });

  // 空き時間データの読み込み
  const loadUserAvailability = useCallback(async () => {
    setIsLoading(true);
    try {
      // 現在の月の前後3ヶ月分のデータを取得
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setMonth(startDate.getMonth() - 3);
      startDate.setDate(1); // 3ヶ月前の1日

      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 3);
      endDate.setDate(0); // 3ヶ月後の末日

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
  }, [userId]);

  // 運営重複データの読み込み（モデル専用）
  const loadOrganizerOverlaps = useCallback(
    async (date: Date) => {
      if (userType !== 'model') return;

      try {
        const dateStr = date.toISOString().split('T')[0];
        const result = await getOrganizerOverlaps(userId, dateStr);

        if (result.success && result.data) {
          setOrganizerOverlaps(result.data);
        }
      } catch {
        // 運営重複データの取得失敗は警告レベル（機能に必須ではない）
      }
    },
    [userId, userType]
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

    return Object.entries(slotsByDate).map(([date, slots]) => ({
      id: `user-${date}`,
      name: `空き時間 ${slots.length}件`,
      startAt: new Date(date + 'T00:00:00'),
      endAt: new Date(date + 'T23:59:59'),
      status: {
        id: 'user-available',
        name: '設定済み',
        color: '#3B82F6', // 青色
      },
    }));
  }, [userSlots]);

  // 日付クリック処理
  const handleDateClick = useCallback(
    async (date: Date) => {
      if (!isOwnProfile) return; // 編集は本人のみ

      setSelectedDate(date);
      setShowModal(true);
      setEditingSlot(null);
      setIsCreating(false);

      // 運営重複データ読み込み
      if (userType === 'model') {
        await loadOrganizerOverlaps(date);
      }
    },
    [isOwnProfile, userType, loadOrganizerOverlaps]
  );

  // 選択された日の時間枠取得
  const getSelectedDateSlots = useCallback((): TimeSlot[] => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
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
        available_date: selectedDate.toISOString().split('T')[0],
        start_time_minutes: timeToMinutes(formData.startTime),
        end_time_minutes: timeToMinutes(formData.endTime),
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success('空き時間を追加しました');
        await loadUserAvailability();
        setFormData({ startTime: '10:00', endTime: '18:00', notes: '' });
        setIsCreating(false);
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
      {/* アクセス権限チェック */}
      {!isOwnProfile && (
        <Alert>
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertDescription>
            他のユーザーのスケジュールは閲覧のみ可能です
          </AlertDescription>
        </Alert>
      )}

      {/* メインカレンダー */}
      <Card>
        <CardHeader className="pb-3 lg:pb-6">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Calendar className="h-4 w-4 lg:h-5 lg:w-5" />
            スケジュールカレンダー
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 overflow-hidden">
          <CalendarProvider locale="ja-JP" startDay={0}>
            <CalendarDate>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
                <CalendarDatePicker>
                  <CalendarYearPicker end={2026} start={2024} />
                  <CalendarMonthPicker />
                </CalendarDatePicker>
                <CalendarDatePagination />
              </div>
            </CalendarDate>

            <div className="w-full overflow-hidden">
              <CustomCalendarHeader />
              <CustomCalendarBody
                features={features}
                onDateClick={handleDateClick}
              />
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
        <CardContent className="p-3 lg:p-6">
          <div className="space-y-4">
            {userSlots.length === 0 ? (
              <div className="text-center py-6 lg:py-8 space-y-4">
                <p className="text-muted-foreground text-sm lg:text-base">
                  空き時間が設定されていません。
                  {isOwnProfile &&
                    'カレンダーから日付を選択して設定してください。'}
                </p>
                {isOwnProfile && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200 mx-2 lg:mx-0">
                    <p className="text-xs lg:text-sm text-blue-800">
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-2 sm:gap-4"
                >
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
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
                  {isOwnProfile && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(new Date(slot.date + 'T00:00:00'));
                          setEditingSlot(slot);
                          setFormData({
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            notes: slot.notes || '',
                          });
                          setShowModal(true);
                        }}
                      >
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        削除
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* スケジュール編集モーダル */}
      {isOwnProfile && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                スケジュール編集 - {selectedDate?.toLocaleDateString('ja-JP')}
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
                              className="flex items-center justify-between p-3 border rounded"
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
                                  variant="outline"
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
                                  variant="outline"
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
                          variant="accent"
                          onClick={() => setIsCreating(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          空き時間を追加
                        </Button>
                        {getSelectedDateSlots().length > 0 && (
                          <Button variant="outline">
                            <Copy className="h-4 w-4 mr-2" />
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

              {/* 時間軸表示エリア（所属モデルのみ運営連携機能） */}
              {userType === 'model' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">時間軸表示</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* レイヤー制御（凡例として機能） */}
                      <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={showUserLayer}
                            onCheckedChange={checked =>
                              setShowUserLayer(checked === true)
                            }
                          />
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="text-sm font-medium">
                              自分の空き時間
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={showOrganizerLayer}
                            onCheckedChange={checked =>
                              setShowOrganizerLayer(checked === true)
                            }
                          />
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-sm font-medium">
                              所属運営の空き時間
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={showOverlapLayer}
                            onCheckedChange={checked =>
                              setShowOverlapLayer(checked === true)
                            }
                          />
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-purple-500 flex-shrink-0" />
                            <span className="text-sm font-medium">
                              対応可能時間
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* 運営重複情報表示 */}
                      {organizerOverlaps.length > 0 && showOverlapLayer && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800">
                            <strong>✨ リクエスト撮影対応可能</strong>:
                            所属運営との空き時間が一致しているため、リクエスト撮影に対応できます
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
