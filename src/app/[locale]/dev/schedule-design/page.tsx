'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { Clock, Plus, Copy, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDaysInMonth, getDay } from 'date-fns';

// モックデータ型定義
interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  notes?: string;
  type: 'manual' | 'copied' | 'bulk';
}

interface OrganizerOverlap {
  organizerName: string;
  organizerId: string;
  overlappingSlots: {
    startMinutes: number;
    endMinutes: number;
    overlapType: 'partial' | 'complete';
    notes?: string;
  }[];
}

// 時間を分単位に変換
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// モックデータ
const mockUserSlots: TimeSlot[] = [
  {
    id: '1',
    date: '2025-09-25',
    startTime: '10:00',
    endTime: '12:00',
    startMinutes: 600,
    endMinutes: 720,
    notes: '午前中のみ対応可能',
    type: 'manual',
  },
  {
    id: '2',
    date: '2025-09-25',
    startTime: '14:00',
    endTime: '18:00',
    startMinutes: 840,
    endMinutes: 1080,
    notes: '',
    type: 'manual',
  },
  {
    id: '3',
    date: '2025-09-27',
    startTime: '09:00',
    endTime: '17:00',
    startMinutes: 540,
    endMinutes: 1020,
    notes: '終日対応可能',
    type: 'copied',
  },
];

const _mockOrganizerOverlaps: OrganizerOverlap[] = [
  {
    organizerName: '株式会社フォトプロダクション',
    organizerId: 'org1',
    overlappingSlots: [
      {
        startMinutes: 540, // 9:00
        endMinutes: 720, // 12:00
        overlapType: 'complete',
        notes: 'スタッフ配置可能',
      },
      {
        startMinutes: 840, // 14:00
        endMinutes: 960, // 16:00
        overlapType: 'partial',
        notes: 'カメラマンのみ対応',
      },
    ],
  },
];

// 将来的なスタジオ重複データ（参考）
const _mockStudioOverlaps = [
  {
    studioName: 'スタジオA',
    studioId: 'studio1',
    overlappingSlots: [
      {
        startMinutes: 600, // 10:00
        endMinutes: 1080, // 18:00
        overlapType: 'complete' as const,
        notes: 'スタジオ利用可能',
      },
    ],
  },
];

// カスタムカレンダーヘッダーコンポーネント（中央寄せ・罫線統一）
function CustomCalendarHeader() {
  // 日本語の曜日を直接定義（シンプルな実装）
  const daysData = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="grid grid-cols-7 gap-0 border-l border-t border-gray-200">
      {daysData.map(day => (
        <div
          key={day}
          className="p-3 text-center text-muted-foreground text-sm font-medium border-r border-b border-gray-200 bg-muted/30"
        >
          {day}
        </div>
      ))}
    </div>
  );
}

// カスタムカレンダーボディコンポーネント（日付クリック対応）
interface CustomCalendarBodyProps {
  features: Feature[];
  onDateClick: (date: Date) => void;
  onFeatureClick: (feature: Feature) => void;
}

function CustomCalendarBody({
  features,
  onDateClick,
  onFeatureClick: _onFeatureClick,
}: CustomCalendarBodyProps) {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();

  // 現在の月の情報を計算
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
        className="relative aspect-square min-h-24 p-1 border-r border-b border-gray-200 text-muted-foreground/50"
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
        className="relative aspect-square min-h-24 p-1 border-r border-b border-gray-200 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={() => onDateClick(currentDate)}
      >
        {/* 日付番号 */}
        <div className="text-sm font-medium mb-1">{day}</div>

        {/* 空き時間表示（left-line-sectionスタイル） */}
        {featuresForDay.length > 0 && (
          <div className="mt-2">
            <div
              className="relative text-xs px-2 py-1 rounded truncate"
              style={{ backgroundColor: featuresForDay[0].status.color + '10' }}
            >
              {/* 左側縦線 */}
              <div
                className="absolute left-0.5 top-0.5 bottom-0.5 w-0.5 rounded-full"
                style={{ backgroundColor: featuresForDay[0].status.color }}
              />
              {/* テキスト（デフォルト色） */}
              <span className="ml-1.5">{featuresForDay[0].name}</span>
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
          className="relative aspect-square min-h-24 p-1 border-r border-b border-gray-200 text-muted-foreground/50"
        >
          {/* 空白 */}
        </div>
      );
    }
  }

  return (
    <div className="grid grid-cols-7 gap-0 border-l border-t border-gray-200">
      {days}
    </div>
  );
}

export default function ScheduleDesignPage() {
  const _t = useTranslations('profile');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userSlots, setUserSlots] = useState<TimeSlot[]>(mockUserSlots);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
      name: `空き時間 ${slots.length}枠`,
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
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
    setEditingSlot(null);
    setIsCreating(false);
  }, []);

  // 選択された日の時間枠取得
  const getSelectedDateSlots = useCallback((): TimeSlot[] => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return userSlots.filter(slot => slot.date === dateStr);
  }, [selectedDate, userSlots]);

  // 時間枠追加
  const handleAddSlot = useCallback(() => {
    if (!selectedDate) return;

    const newSlot: TimeSlot = {
      id: `new-${Date.now()}`,
      date: selectedDate.toISOString().split('T')[0],
      startTime: formData.startTime,
      endTime: formData.endTime,
      startMinutes: timeToMinutes(formData.startTime),
      endMinutes: timeToMinutes(formData.endTime),
      notes: formData.notes,
      type: 'manual',
    };

    setUserSlots(prev => [...prev, newSlot]);
    setFormData({ startTime: '10:00', endTime: '18:00', notes: '' });
    setIsCreating(false);
  }, [selectedDate, formData]);

  // 時間枠削除
  const handleDeleteSlot = useCallback((slotId: string) => {
    setUserSlots(prev => prev.filter(slot => slot.id !== slotId));
    setEditingSlot(null);
  }, []);

  // 時間軸の範囲（6:00-24:00）
  const timeAxisHours = Array.from({ length: 18 }, (_, i) => i + 6);

  // 時間軸上の位置計算
  const getTimePosition = (minutes: number): number => {
    const startMinutes = 6 * 60; // 6:00
    const totalMinutes = 18 * 60; // 18時間
    return ((minutes - startMinutes) / totalMinutes) * 100;
  };

  // レイヤー表示用の時間バー生成
  const generateTimeBars = () => {
    const selectedDateSlots = getSelectedDateSlots();
    const dateStr = selectedDate?.toISOString().split('T')[0];

    // ユーザーの時間枠
    const userBars = showUserLayer
      ? selectedDateSlots.map(slot => ({
          id: slot.id,
          type: 'user' as const,
          startPos: getTimePosition(slot.startMinutes),
          width:
            getTimePosition(slot.endMinutes) -
            getTimePosition(slot.startMinutes),
          color: '#3B82F6', // 青色
          label: `${slot.startTime}-${slot.endTime}`,
          notes: slot.notes,
          slot,
        }))
      : [];

    // 運営の時間枠（モデルの場合のみ）
    const organizerBars =
      showOrganizerLayer && dateStr === '2025-09-27'
        ? [
            {
              id: 'org-1',
              type: 'organizer' as const,
              startPos: getTimePosition(540), // 9:00
              width: getTimePosition(1020) - getTimePosition(540), // 17:00まで
              color: '#10B981', // 緑色
              label: '運営: 9:00-17:00',
              notes: 'スタッフ配置可能',
            },
          ]
        : [];

    // 重複部分（計算例）
    const overlapBars =
      showOverlapLayer && dateStr === '2025-09-27'
        ? [
            {
              id: 'overlap-1',
              type: 'overlap' as const,
              startPos: getTimePosition(540), // 9:00
              width: getTimePosition(720) - getTimePosition(540), // 12:00まで
              color: '#8B5CF6', // 紫色
              label: '対応可能: 9:00-12:00',
              notes: 'リクエスト撮影対応可能',
            },
            {
              id: 'overlap-2',
              type: 'overlap' as const,
              startPos: getTimePosition(840), // 14:00
              width: getTimePosition(960) - getTimePosition(840), // 16:00まで
              color: '#8B5CF6', // 紫色
              label: '対応可能: 14:00-16:00',
              notes: 'リクエスト撮影対応可能',
            },
          ]
        : [];

    return [...organizerBars, ...userBars, ...overlapBars];
  };

  const features = transformUserSlotsToFeatures();

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* ヘッダー */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">ユーザースケジュール管理</h1>
        <p className="text-muted-foreground">
          UI/UXデザインプロトタイプ - カレンダー表示と時間入力の検証
        </p>
      </div>

      {/* 機能説明カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            スケジュール管理機能の価値
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">🎯 ユーザーメリット</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 効率的な空き時間管理で収益機会を最大化</li>
                <li>• 柔軟な設定で個人のライフスタイルに対応</li>
                <li>• 複製機能で設定工数を大幅削減</li>
                <li>• 運営連携でリクエスト撮影チャンスを発見</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🚀 ビジネス価値</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• リクエスト撮影への誘導でGMV向上</li>
                <li>• ユーザーエンゲージメント深化</li>
                <li>• 運営-モデル連携強化</li>
                <li>• プラットフォーム差別化</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メインカレンダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            スケジュールカレンダー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarProvider locale="ja-JP" startDay={0}>
            <CalendarDate>
              <CalendarDatePicker>
                <CalendarYearPicker end={2026} start={2024} />
                <CalendarMonthPicker />
              </CalendarDatePicker>
              <CalendarDatePagination />
            </CalendarDate>
            {/* カスタムカレンダーヘッダー（中央寄せ・罫線統一） */}
            <CustomCalendarHeader />

            {/* カスタムカレンダーボディ（日付クリック対応） */}
            <CustomCalendarBody
              features={features}
              onDateClick={handleDateClick}
              onFeatureClick={() => {}}
            />
          </CalendarProvider>
        </CardContent>
      </Card>

      {/* 設定済み空き時間一覧 */}
      <Card className="mt-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            設定済み空き時間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userSlots.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  空き時間が設定されていません。カレンダーから日付を選択して設定してください。
                </p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    💡{' '}
                    <strong>
                      空き時間を設定して撮影チャンスを増やしましょう
                    </strong>
                  </p>
                </div>
              </div>
            ) : (
              userSlots.map(slot => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="font-medium">{slot.date}</div>
                      <div className="font-mono text-sm">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </div>
                    {slot.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {slot.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* スケジュール編集モーダル */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                      <h4 className="font-medium">この日の設定済み空き時間</h4>
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
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button onClick={() => setIsCreating(true)}>
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 時間入力フォーム */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* フォームアクション */}
                    <div className="flex justify-end gap-2">
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
                      <Button onClick={handleAddSlot}>
                        {editingSlot ? '更新' : '追加'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 時間軸表示エリア（レイヤー制御統合） */}
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

                  {/* 時間軸ヘッダー */}
                  <div className="relative">
                    <div className="flex">
                      {timeAxisHours.map(hour => (
                        <div
                          key={hour}
                          className="flex-1 text-center text-sm font-medium border-l first:border-l-0"
                        >
                          {hour}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* レイヤー表示エリア */}
                  <div className="relative h-32 bg-gray-50 rounded border">
                    {/* 時間軸グリッド */}
                    {timeAxisHours.map(hour => (
                      <div
                        key={hour}
                        className="absolute top-0 bottom-0 border-l border-gray-200"
                        style={{ left: `${((hour - 6) / 18) * 100}%` }}
                      />
                    ))}

                    {/* 時間バー表示 */}
                    {generateTimeBars().map(bar => (
                      <div
                        key={bar.id}
                        className={cn(
                          'absolute h-8 rounded flex items-center px-2 text-white text-xs font-medium',
                          'border border-white/20 cursor-pointer hover:opacity-80 transition-opacity'
                        )}
                        style={{
                          left: `${bar.startPos}%`,
                          width: `${bar.width}%`,
                          backgroundColor: bar.color,
                          top:
                            bar.type === 'user'
                              ? '8px'
                              : bar.type === 'organizer'
                                ? '40px'
                                : '72px',
                        }}
                        onClick={() => {
                          if (bar.type === 'user' && 'slot' in bar) {
                            setEditingSlot(bar.slot);
                            setFormData({
                              startTime: bar.slot.startTime,
                              endTime: bar.slot.endTime,
                              notes: bar.slot.notes || '',
                            });
                          }
                        }}
                      >
                        <span className="truncate">{bar.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* リクエスト撮影対応可能時間の情報表示 */}
                  {selectedDate?.toISOString().split('T')[0] === '2025-09-27' &&
                    showOverlapLayer && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800">
                          <strong>✨ リクエスト撮影対応可能</strong>:
                          所属運営（株式会社フォトプロダクション）との空き時間が一致しているため、リクエスト撮影に対応できます
                        </p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* プロトタイプ用デモデータ切り替え */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">デモ機能</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDate(new Date('2025-09-25T00:00:00'));
                      setShowModal(true);
                      setIsCreating(false);
                      setEditingSlot(null);
                    }}
                  >
                    9/25を表示（複数空き時間の例）
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDate(new Date('2025-09-27T00:00:00'));
                      setShowModal(true);
                      setIsCreating(false);
                      setEditingSlot(null);
                    }}
                  >
                    9/27を表示（対応可能時間の例）
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDate(new Date('2025-09-28T00:00:00'));
                      setIsCreating(true);
                      setShowModal(true);
                    }}
                  >
                    9/28に新規追加
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDate(new Date('2025-09-25T00:00:00'));
                      setShowModal(true);
                      setIsCreating(false);
                      setEditingSlot(null);
                    }}
                  >
                    9/25モーダル表示テスト
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• 9/25: 複数空き時間設定の例（午前・午後の分割設定）</p>
                  <p>
                    • 9/27: リクエスト撮影対応可能時間の表示例（モデル専用機能）
                  </p>
                  <p>• 9/28: 新規空き時間追加のテスト</p>
                  <p>• 📝 将来対応: 運営とスタジオの分離管理</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
