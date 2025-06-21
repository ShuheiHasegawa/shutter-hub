'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UsersIcon,
  CircleDollarSignIcon,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { PhotoSessionSlot } from '@/types/photo-session';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { formatTimeLocalized, formatDateLocalized } from '@/lib/utils/date';
import { createSlotBooking } from '@/lib/photo-sessions/slots';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import { useToast } from '@/hooks/use-toast';

interface SlotBookingFlowProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
  userId: string;
}

type BookingStep = 'select' | 'confirm' | 'complete';

export function SlotBookingFlow({
  session,
  slots,
  userId,
}: SlotBookingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const currentStep = (searchParams.get('step') as BookingStep) || 'select';
  const hasSlots = slots && slots.length > 0;

  // URLパラメータからselectedSlotIdを復元
  useEffect(() => {
    const slotId = searchParams.get('slotId');
    if (slotId) {
      setSelectedSlotId(slotId);
    }
  }, [searchParams]);

  // ステップ遷移関数
  const navigateToStep = useCallback(
    (step: BookingStep, slotId?: string | null) => {
      const params = new URLSearchParams(searchParams);
      params.set('step', step);

      if (slotId) {
        params.set('slotId', slotId);
      } else {
        params.delete('slotId');
      }

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // 戻るボタンの処理
  const handleBack = useCallback(() => {
    if (currentStep === 'confirm') {
      navigateToStep('select', selectedSlotId);
    } else {
      // 予約フローから撤影会詳細に戻る
      const params = new URLSearchParams(searchParams);
      params.delete('step');
      params.delete('slotId');
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [currentStep, navigateToStep, selectedSlotId, router, searchParams]);

  // スロット選択ハンドラー
  const handleSlotSelect = useCallback(
    (slotId: string) => {
      setSelectedSlotId(slotId);
      navigateToStep('confirm', slotId);
    },
    [navigateToStep]
  );

  // 予約処理
  const handleBooking = async () => {
    setIsBooking(true);
    try {
      if (hasSlots) {
        // スロット制の場合
        if (!selectedSlotId) {
          toast({
            title: 'エラー',
            description: '時間枠を選択してください',
            variant: 'destructive',
          });
          setIsBooking(false);
          return;
        }

        const result = await createSlotBooking(selectedSlotId);
        if (result.success) {
          navigateToStep('complete');
          toast({
            title: '予約が完了しました！',
            description: '選択した時間枠での参加が確定しました',
          });
        } else {
          toast({
            title: 'エラー',
            description: result.message || '予約に失敗しました',
            variant: 'destructive',
          });
        }
      } else {
        // 通常の撮影会の場合
        const result = await createPhotoSessionBooking(session.id, userId);

        if (result.success) {
          navigateToStep('complete');
          toast({
            title: '予約が完了しました！',
            description: '撮影会への参加が確定しました',
          });
        } else {
          toast({
            title: 'エラー',
            description: result.error || '予約に失敗しました',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('予約エラー:', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  };

  // 完了時の処理
  const handleComplete = () => {
    // ページをリロードして最新の状態を反映
    window.location.href = window.location.pathname;
  };

  // 選択されたスロットの取得
  const selectedSlot = useMemo(
    () => (selectedSlotId ? slots.find(s => s.id === selectedSlotId) : null),
    [selectedSlotId, slots]
  );

  // ステップインジケーター
  const StepIndicator = () => (
    <div className="flex items-center justify-center space-x-8 py-4 mb-6">
      {['select', 'confirm', 'complete'].map((step, index) => {
        const isActive = currentStep === step;
        const isCompleted =
          (currentStep === 'confirm' && step === 'select') ||
          (currentStep === 'complete' && step !== 'complete');
        const stepNumber = index + 1;
        const stepLabels = {
          select: '時間枠選択',
          confirm: '予約確認',
          complete: '完了',
        };

        return (
          <div key={step} className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isCompleted
                  ? 'bg-green-500 text-white dark:bg-green-600'
                  : isActive
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {stepLabels[step as keyof typeof stepLabels]}
            </span>
          </div>
        );
      })}
    </div>
  );

  // ステップ1: 時間枠選択
  if (currentStep === 'select') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <StepIndicator />

        <Card>
          <CardHeader>
            <CardTitle>{hasSlots ? '時間枠を選択' : '予約確認'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {hasSlots
                ? 'ご希望の時間枠を選択してください'
                : '以下の撮影会を予約しますか？'}
            </p>
          </CardHeader>
          <CardContent>
            {hasSlots ? (
              <div className="space-y-3">
                {slots.map((slot, index) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    index={index}
                    onSelect={() => handleSlotSelect(slot.id)}
                  />
                ))}
              </div>
            ) : (
              <SessionInfoDisplay session={session} />
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              {!hasSlots && (
                <Button onClick={() => navigateToStep('confirm')}>
                  次へ
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ステップ2: 予約確認
  if (currentStep === 'confirm') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <StepIndicator />

        <Card>
          <CardHeader>
            <CardTitle>予約内容の確認</CardTitle>
            <p className="text-sm text-muted-foreground">
              内容をご確認の上、予約を確定してください
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      撮影会
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">
                      {session.title}
                    </div>
                  </div>

                  {selectedSlot && (
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        選択した時間枠
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        枠 {selectedSlot.slot_number}:{' '}
                        {formatTimeLocalized(
                          new Date(selectedSlot.start_time),
                          'ja'
                        )}{' '}
                        -{' '}
                        {formatTimeLocalized(
                          new Date(selectedSlot.end_time),
                          'ja'
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      料金
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">
                      {(selectedSlot?.price_per_person ||
                        session.price_per_person) === 0
                        ? '無料'
                        : `¥${(selectedSlot?.price_per_person || session.price_per_person).toLocaleString()}`}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div>• 予約のキャンセルは撮影会開始の24時間前まで可能です</div>
                <div>• 遅刻される場合は主催者にご連絡ください</div>
                <div>• 体調不良の場合は無理をせず参加をお控えください</div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <Button
                onClick={handleBooking}
                disabled={isBooking}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isBooking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    予約中...
                  </>
                ) : (
                  '予約を確定する'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ステップ3: 完了
  if (currentStep === 'complete') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <StepIndicator />

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  予約が完了しました！
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  撮影会の詳細はメッセージ機能でご確認いただけます
                </p>
              </div>
              <Button
                onClick={handleComplete}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                完了
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// スロットカードコンポーネント
function SlotCard({
  slot,
  index,
  onSelect,
}: {
  slot: PhotoSessionSlot;
  index: number;
  onSelect: () => void;
}) {
  const isSlotFull = slot.current_participants >= slot.max_participants;
  const slotStartTime = new Date(slot.start_time);
  const slotEndTime = new Date(slot.end_time);

  return (
    <button
      className={`w-full p-4 border-2 rounded-lg transition-all duration-200 text-left ${
        isSlotFull
          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 dark:bg-gray-800 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:bg-blue-900/10 cursor-pointer'
      }`}
      onClick={onSelect}
      disabled={isSlotFull}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-lg dark:text-white">
          枠 {index + 1}
        </h4>
        <Badge
          variant={isSlotFull ? 'destructive' : 'outline'}
          className="text-sm"
        >
          {isSlotFull ? '満席' : '空きあり'}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
            <Clock className="h-4 w-4" />
            <span>時間</span>
          </div>
          <div className="font-medium dark:text-white">
            {formatTimeLocalized(slotStartTime, 'ja')} -{' '}
            {formatTimeLocalized(slotEndTime, 'ja')}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
            <UsersIcon className="h-4 w-4" />
            <span>参加者</span>
          </div>
          <div className="font-medium dark:text-white">
            {slot.current_participants}/{slot.max_participants}人
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
            <CircleDollarSignIcon className="h-4 w-4" />
            <span>料金</span>
          </div>
          <div className="font-medium dark:text-white">
            {slot.price_per_person === 0
              ? '無料'
              : `¥${slot.price_per_person.toLocaleString()}`}
          </div>
        </div>
      </div>
    </button>
  );
}

// セッション情報表示コンポーネント
function SessionInfoDisplay({
  session,
}: {
  session: PhotoSessionWithOrganizer;
}) {
  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  return (
    <div className="space-y-4">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6 space-y-3">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              撮影会
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              {session.title}
            </div>
          </div>

          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              日時
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              {formatDateLocalized(startDate, 'ja', 'long')}
              <br />
              {formatTimeLocalized(startDate, 'ja')} -{' '}
              {formatTimeLocalized(endDate, 'ja')}
            </div>
          </div>

          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              場所
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              {session.location}
              {session.address && (
                <>
                  <br />
                  {session.address}
                </>
              )}
            </div>
          </div>

          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              料金
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              {session.price_per_person === 0
                ? '無料'
                : `¥${session.price_per_person.toLocaleString()}`}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>• 予約のキャンセルは撮影会開始の24時間前まで可能です</div>
        <div>• 遅刻される場合は主催者にご連絡ください</div>
        <div>• 体調不良の場合は無理をせず参加をお控えください</div>
      </div>
    </div>
  );
}
