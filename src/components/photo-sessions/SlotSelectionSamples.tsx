'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionSheet, ActionButton } from '@/components/ui/action-sheet';
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
import {
  CalendarIcon,
  UsersIcon,
  CircleDollarSignIcon,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { PhotoSessionSlot } from '@/types/photo-session';
import { formatTimeLocalized } from '@/lib/utils/date';

// サンプルデータ
const sampleSlots: PhotoSessionSlot[] = [
  {
    id: '1',
    photo_session_id: 'session-1',
    slot_number: 1,
    start_time: '2025-06-20T19:00:00',
    end_time: '2025-06-20T19:50:00',
    break_duration_minutes: 10,
    max_participants: 1,
    current_participants: 1,
    price_per_person: 5000,
    discount_type: 'none',
    discount_value: 0,
    is_active: true,
    created_at: '2024-12-01',
    updated_at: '2024-12-01',
  },
  {
    id: '2',
    photo_session_id: 'session-1',
    slot_number: 2,
    start_time: '2025-06-20T20:00:00',
    end_time: '2025-06-20T20:50:00',
    break_duration_minutes: 10,
    max_participants: 1,
    current_participants: 0,
    price_per_person: 5000,
    discount_type: 'none',
    discount_value: 0,
    is_active: true,
    created_at: '2024-12-01',
    updated_at: '2024-12-01',
  },
  {
    id: '3',
    photo_session_id: 'session-1',
    slot_number: 3,
    start_time: '2025-06-20T21:00:00',
    end_time: '2025-06-20T21:50:00',
    break_duration_minutes: 10,
    max_participants: 1,
    current_participants: 0,
    price_per_person: 5000,
    discount_type: 'none',
    discount_value: 0,
    is_active: true,
    created_at: '2024-12-01',
    updated_at: '2024-12-01',
  },
  {
    id: '4',
    photo_session_id: 'session-1',
    slot_number: 4,
    start_time: '2025-06-20T22:00:00',
    end_time: '2025-06-20T22:50:00',
    break_duration_minutes: 10,
    max_participants: 1,
    current_participants: 0,
    price_per_person: 5000,
    discount_type: 'none',
    discount_value: 0,
    is_active: true,
    created_at: '2024-12-01',
    updated_at: '2024-12-01',
  },
];

/**
 * 提案1: ステップ式予約フロー
 */
export function StepBookingFlow() {
  const [step, setStep] = useState<
    'slot-selection' | 'confirmation' | 'success'
  >('slot-selection');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const selectedSlot = sampleSlots.find(slot => slot.id === selectedSlotId);

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlotId(slotId);
    setStep('confirmation');
  };

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    // 模擬的な予約処理
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsBooking(false);
    setStep('success');
  };

  const handleReset = () => {
    setStep('slot-selection');
    setSelectedSlotId(null);
    setIsBooking(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>提案1: ステップ式予約フロー</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ステップ表示 */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div
              className={`flex items-center gap-2 ${
                step === 'slot-selection'
                  ? 'text-blue-600 dark:text-blue-400'
                  : step === 'confirmation' || step === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'slot-selection'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : step === 'confirmation' || step === 'success'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                }`}
              >
                {step === 'confirmation' || step === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  '1'
                )}
              </div>
              <span className="text-sm font-medium">時間枠選択</span>
            </div>

            <div
              className={`w-8 h-0.5 ${step === 'confirmation' || step === 'success' ? 'bg-green-600 dark:bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`}
            />

            <div
              className={`flex items-center gap-2 ${
                step === 'confirmation'
                  ? 'text-blue-600 dark:text-blue-400'
                  : step === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'confirmation'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : step === 'success'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                }`}
              >
                {step === 'success' ? <CheckCircle className="h-4 w-4" /> : '2'}
              </div>
              <span className="text-sm font-medium">予約確認</span>
            </div>

            <div
              className={`w-8 h-0.5 ${step === 'success' ? 'bg-green-600 dark:bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`}
            />

            <div
              className={`flex items-center gap-2 ${
                step === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'success'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                }`}
              >
                {step === 'success' ? <CheckCircle className="h-4 w-4" /> : '3'}
              </div>
              <span className="text-sm font-medium">完了</span>
            </div>
          </div>

          {/* ステップコンテンツ */}
          {step === 'slot-selection' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                時間枠を選択してください
              </h3>
              <div className="space-y-3">
                {sampleSlots.map(slot => {
                  const isSlotFull =
                    slot.current_participants >= slot.max_participants;
                  const slotStartTime = new Date(slot.start_time);
                  const slotEndTime = new Date(slot.end_time);

                  return (
                    <div
                      key={slot.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        isSlotFull
                          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => !isSlotFull && handleSlotSelect(slot.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="outline"
                          className={`font-medium ${
                            isSlotFull
                              ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                              : 'border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          枠 {slot.slot_number}
                        </Badge>
                        <Badge variant={isSlotFull ? 'destructive' : 'default'}>
                          {isSlotFull ? '満席' : '空きあり'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
                            <UsersIcon className="h-3 w-3" />
                            <span>参加者</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {slot.current_participants}/{slot.max_participants}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600 dark:text-gray-400 mb-1">
                            時間
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {formatTimeLocalized(slotStartTime, 'ja')} -{' '}
                            {formatTimeLocalized(slotEndTime, 'ja')}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
                            <CircleDollarSignIcon className="h-3 w-3" />
                            <span>料金</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            ¥{slot.price_per_person.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'confirmation' && selectedSlot && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">
                予約内容を確認してください
              </h3>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  選択された時間枠
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-200">
                      枠番号:
                    </span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      枠 {selectedSlot.slot_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-200">
                      時間:
                    </span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {formatTimeLocalized(
                        new Date(selectedSlot.start_time),
                        'ja'
                      )}{' '}
                      -{' '}
                      {formatTimeLocalized(
                        new Date(selectedSlot.end_time),
                        'ja'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-200">
                      料金:
                    </span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      ¥{selectedSlot.price_per_person.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  注意事項
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 予約のキャンセルは撮影会開始の24時間前まで可能です</li>
                  <li>• 遅刻される場合は主催者にご連絡ください</li>
                  <li>• 体調不良の場合は無理をせず参加をお控えください</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('slot-selection')}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  onClick={handleConfirmBooking}
                  disabled={isBooking}
                  className="flex-1"
                >
                  {isBooking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      予約中...
                    </>
                  ) : (
                    '予約する'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  予約が完了しました！
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  選択した時間枠での参加が確定しました。確認メールをお送りしました。
                </p>
              </div>
              <Button onClick={handleReset} className="w-full">
                新しい予約をする
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 提案2: ActionSheet活用
 */
export function ActionSheetBookingFlow() {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const selectedSlot = sampleSlots.find(slot => slot.id === selectedSlotId);

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlotId(slotId);
    setShowActionSheet(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    // 模擬的な予約処理
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsBooking(false);
    setShowConfirmDialog(false);
    setSelectedSlotId(null);
  };

  // ActionSheet用のアクションボタンを生成
  const slotActions: ActionButton[] = sampleSlots.map(slot => {
    const isSlotFull = slot.current_participants >= slot.max_participants;
    const slotStartTime = new Date(slot.start_time);
    const slotEndTime = new Date(slot.end_time);

    return {
      id: slot.id,
      label: `枠 ${slot.slot_number} (${formatTimeLocalized(slotStartTime, 'ja')} - ${formatTimeLocalized(slotEndTime, 'ja')})`,
      variant: isSlotFull ? 'outline' : 'default',
      onClick: () => !isSlotFull && handleSlotSelect(slot.id),
      disabled: isSlotFull,
      icon: <Clock className="h-4 w-4" />,
      className: isSlotFull
        ? 'text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
        : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>提案2: ActionSheet活用</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            ActionSheetを使って時間枠を選択し、AlertDialogで予約確認を行います。
          </p>

          {/* 時間枠選択ボタン */}
          <ActionSheet
            trigger={
              <Button className="w-full" size="lg">
                <CalendarIcon className="h-4 w-4 mr-2" />
                時間枠を選択して予約
              </Button>
            }
            title="時間枠を選択"
            description="ご希望の撮影時間枠を選択してください"
            actions={slotActions}
            maxColumns={1}
            open={showActionSheet}
            onOpenChange={setShowActionSheet}
            contentClassName="max-h-[70vh]"
          />

          {/* 選択された枠の表示 */}
          {selectedSlot && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                選択中の時間枠
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                枠 {selectedSlot.slot_number}:{' '}
                {formatTimeLocalized(new Date(selectedSlot.start_time), 'ja')} -{' '}
                {formatTimeLocalized(new Date(selectedSlot.end_time), 'ja')} ( ¥
                {selectedSlot.price_per_person.toLocaleString()})
              </div>
            </div>
          )}

          {/* 予約確認ダイアログ */}
          <AlertDialog
            open={showConfirmDialog}
            onOpenChange={setShowConfirmDialog}
          >
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>予約確認</AlertDialogTitle>
                <AlertDialogDescription>
                  以下の時間枠で予約しますか？
                </AlertDialogDescription>
              </AlertDialogHeader>

              {selectedSlot && (
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          時間枠:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          枠 {selectedSlot.slot_number}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          時間:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatTimeLocalized(
                            new Date(selectedSlot.start_time),
                            'ja'
                          )}{' '}
                          -{' '}
                          {formatTimeLocalized(
                            new Date(selectedSlot.end_time),
                            'ja'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          料金:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          ¥{selectedSlot.price_per_person.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ※ キャンセルは撮影会開始の24時間前まで可能です
                  </div>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedSlotId(null)}>
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmBooking}
                  disabled={isBooking}
                >
                  {isBooking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      予約中...
                    </>
                  ) : (
                    '予約する'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 比較デモコンポーネント
 */
export function SlotSelectionSamples() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">時間枠選択UI比較デモ</h1>
        <p className="text-gray-600 dark:text-gray-400">
          提案1（ステップ式）と提案2（ActionSheet）の動作を比較できます
        </p>
      </div>

      <StepBookingFlow />
      <ActionSheetBookingFlow />
    </div>
  );
}
