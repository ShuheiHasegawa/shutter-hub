'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionBar, ActionBarButton } from '@/components/ui/action-bar';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Users as UsersIcon,
  CircleDollarSign as CircleDollarSignIcon,
  Loader2,
} from 'lucide-react';
import { PhotoSessionSlot } from '@/types/photo-session';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { createSlotBooking } from '@/lib/photo-sessions/slots';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import { toast } from 'sonner';

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

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  const currentStep = (searchParams.get('step') as BookingStep) || 'select';
  const hasSlots = slots && slots.length > 0;
  const allowMultiple = session.allow_multiple_bookings && hasSlots;

  // URLパラメータからselectedSlotId(s)を復元
  useEffect(() => {
    if (allowMultiple) {
      const slotIds = searchParams.get('slotIds');
      if (slotIds) {
        setSelectedSlotIds(slotIds.split(','));
      }
    } else {
      const slotId = searchParams.get('slotId');
      if (slotId) {
        setSelectedSlotId(slotId);
      }
    }
  }, [searchParams, allowMultiple]);

  // ステップ遷移関数
  const navigateToStep = useCallback(
    (step: BookingStep, slotIds?: string[] | string | null) => {
      const params = new URLSearchParams(searchParams);
      params.set('step', step);

      if (allowMultiple && Array.isArray(slotIds) && slotIds.length > 0) {
        params.set('slotIds', slotIds.join(','));
      } else if (!allowMultiple && typeof slotIds === 'string') {
        params.set('slotId', slotIds);
      } else {
        params.delete('slotId');
        params.delete('slotIds');
      }

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, allowMultiple]
  );

  // スロット選択ハンドラー（単一選択）- 自動遷移を無効化
  const handleSlotSelect = useCallback((slotId: string) => {
    setSelectedSlotId(slotId);
    // カード選択のみで自動遷移しない
  }, []);

  // スロット選択ハンドラー（複数選択）
  const handleMultipleSlotToggle = useCallback((slotId: string) => {
    setSelectedSlotIds(prev => {
      const newSelection = prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId];
      return newSelection;
    });
  }, []);

  // 複数選択での確認画面への遷移
  const handleMultipleSlotConfirm = useCallback(() => {
    if (selectedSlotIds.length === 0) {
      toast.error('少なくとも1つの時間枠を選択してください');
      return;
    }
    navigateToStep('confirm', selectedSlotIds);
  }, [selectedSlotIds, navigateToStep]);

  // 予約処理
  const handleBooking = useCallback(async () => {
    setIsBooking(true);
    try {
      if (hasSlots) {
        // スロット制の場合
        if (allowMultiple) {
          // 複数選択の場合
          if (selectedSlotIds.length === 0) {
            toast.error('時間枠を選択してください');
            setIsBooking(false);
            return;
          }

          // 複数スロットを順次予約
          let successCount = 0;
          const errors: string[] = [];

          for (const slotId of selectedSlotIds) {
            try {
              const result = await createSlotBooking(slotId);
              if (result.success) {
                successCount++;
              } else {
                errors.push(result.message || '予約に失敗しました');
              }
            } catch (err) {
              logger.error('スロット予約エラー:', err);
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : '予期しないエラーが発生しました';
              errors.push(errorMessage);
            }
          }

          if (successCount > 0) {
            navigateToStep('complete');
            toast.success(`${successCount}件の時間枠での参加が確定しました`);
          } else {
            toast.error(`予約に失敗しました: ${errors.join(', ')}`);
          }
        } else {
          // 単一選択の場合
          if (!selectedSlotId) {
            toast.error('時間枠を選択してください');
            setIsBooking(false);
            return;
          }

          try {
            const result = await createSlotBooking(selectedSlotId);
            if (result.success) {
              navigateToStep('complete');
              toast.success('選択した時間枠での参加が確定しました');
            } else {
              toast.error(result.message || '予約に失敗しました');
            }
          } catch (err) {
            logger.error('スロット予約エラー:', err);
            const errorMessage =
              err instanceof Error
                ? err.message
                : '予期しないエラーが発生しました';
            toast.error(errorMessage);
          }
        }
      } else {
        // 通常の撮影会の場合
        const result = await createPhotoSessionBooking(session.id, userId);

        if (result.success) {
          navigateToStep('complete');
          toast.success('撮影会への参加が確定しました');
        } else {
          toast.error(result.error || '予約に失敗しました');
        }
      }
    } catch (error) {
      logger.error('予約エラー:', error);
      toast.error('予期しないエラーが発生しました');
    } finally {
      setIsBooking(false);
    }
  }, [
    hasSlots,
    allowMultiple,
    selectedSlotIds,
    selectedSlotId,
    session.id,
    userId,
    navigateToStep,
  ]);

  // 完了時の処理
  const handleComplete = useCallback(() => {
    // ページをリロードして最新の状態を反映
    window.location.href = window.location.pathname;
  }, []);

  // 選択されたスロットの取得
  const selectedSlot = useMemo(
    () => (selectedSlotId ? slots.find(s => s.id === selectedSlotId) : null),
    [selectedSlotId, slots]
  );

  // 選択されたスロットリストの取得（複数選択用）
  const selectedSlots = useMemo(
    () =>
      selectedSlotIds
        .map(id => slots.find(s => s.id === id))
        .filter(Boolean) as PhotoSessionSlot[],
    [selectedSlotIds, slots]
  );

  // ActionBarボタンの取得
  const getActionBarButtons = useCallback((): ActionBarButton[] => {
    switch (currentStep) {
      case 'select':
        return [
          {
            id: 'back',
            label: '戻る',
            variant: 'outline',
            onClick: () => router.push(`/ja/photo-sessions/${session.id}`),
            icon: <ArrowLeft className="h-4 w-4" />,
          },
          ...(!hasSlots
            ? [
                {
                  id: 'next',
                  label: '次へ',
                  variant: 'primary' as const,
                  onClick: () => navigateToStep('confirm'),
                  icon: <ArrowRight className="h-4 w-4" />,
                },
              ]
            : []),
          ...(hasSlots && !allowMultiple
            ? [
                {
                  id: 'next-slot',
                  label: '次へ',
                  variant: 'primary' as const,
                  onClick: () => navigateToStep('confirm', selectedSlotId),
                  disabled: !selectedSlotId,
                  icon: <ArrowRight className="h-4 w-4" />,
                },
              ]
            : []),
          ...(allowMultiple
            ? [
                {
                  id: 'next-multiple',
                  label: `次へ（${selectedSlotIds.length}件）`,
                  variant: 'primary' as const,
                  onClick: handleMultipleSlotConfirm,
                  disabled: selectedSlotIds.length === 0,
                  icon: <ArrowRight className="h-4 w-4" />,
                },
              ]
            : []),
        ];

      case 'confirm':
        return [
          {
            id: 'back',
            label: '戻る',
            variant: 'outline',
            onClick: () =>
              navigateToStep(
                'select',
                allowMultiple ? selectedSlotIds : selectedSlotId
              ),
            icon: <ArrowLeft className="h-4 w-4" />,
          },
          {
            id: 'confirm',
            label: isBooking ? '予約中...' : '予約を確定する',
            variant: 'primary',
            onClick: handleBooking,
            disabled: isBooking,
            icon: isBooking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : undefined,
          },
        ];

      case 'complete':
        return [
          {
            id: 'complete',
            label: '完了',
            variant: 'accent',
            onClick: handleComplete,
          },
        ];

      default:
        return [];
    }
  }, [
    currentStep,
    hasSlots,
    allowMultiple,
    selectedSlotId,
    selectedSlotIds,
    isBooking,
    router,
    session.id,
    navigateToStep,
    handleMultipleSlotConfirm,
    handleBooking,
    handleComplete,
  ]);

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
                  ? 'surface-accent'
                  : isActive
                    ? 'surface-primary'
                    : 'surface-neutral-1'
              }`}
            >
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive
                  ? 'text-theme-text-primary'
                  : isCompleted
                    ? 'text-theme-text-primary'
                    : 'text-theme-text-muted'
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
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ステップインジケーター */}
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
                {allowMultiple && (
                  <div className="mb-4 p-3 card-info rounded-lg">
                    <p className="text-sm text-info">
                      💡
                      この撮影会では複数の時間枠を選択できます。お好みの枠を複数選んでください。
                    </p>
                  </div>
                )}
                {slots.map((slot, index) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    index={index}
                    isSelected={
                      allowMultiple
                        ? selectedSlotIds.includes(slot.id)
                        : selectedSlotId === slot.id
                    }
                    allowMultiple={allowMultiple}
                    onSelect={
                      allowMultiple
                        ? () => handleMultipleSlotToggle(slot.id)
                        : () => handleSlotSelect(slot.id)
                    }
                  />
                ))}
                {allowMultiple && (
                  <div className="mt-4 p-3 card-neutral-1 rounded-lg">
                    <p className="text-sm text-theme-text-secondary">
                      選択中: {selectedSlotIds.length}件の時間枠
                      {selectedSlotIds.length > 0 && (
                        <span className="ml-2 text-info">
                          （合計料金: ¥
                          {selectedSlots
                            .reduce(
                              (sum, slot) => sum + slot.price_per_person,
                              0
                            )
                            .toLocaleString()}
                          ）
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <SessionInfoDisplay session={session} />
            )}

            {/* ActionBar統一ボタン */}
            <ActionBar
              actions={getActionBarButtons()}
              maxColumns={2}
              background="blur"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ステップ2: 予約確認
  if (currentStep === 'confirm') {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ステップインジケーター */}
        <StepIndicator />

        <Card>
          <CardHeader>
            <CardTitle>予約内容の確認</CardTitle>
            <p className="text-sm text-muted-foreground">
              内容をご確認の上、予約を確定してください
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左側: 撮影会情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-theme-text-primary">
                  撮影会情報
                </h3>
                <Card className="surface-neutral-1 h-fit">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <div className="font-medium text-theme-text-primary mb-1">
                        撮影会名
                      </div>
                      <div className="text-theme-text-secondary">
                        {session.title}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-theme-text-primary mb-1">
                        開催日時
                      </div>
                      <div className="text-theme-text-secondary">
                        {formatDateLocalized(
                          new Date(session.start_time),
                          'ja',
                          'long'
                        )}
                        <br />
                        {formatTimeLocalized(
                          new Date(session.start_time),
                          'ja'
                        )}{' '}
                        -{' '}
                        {formatTimeLocalized(new Date(session.end_time), 'ja')}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-theme-text-primary mb-1">
                        場所
                      </div>
                      <div className="text-theme-text-secondary">
                        {session.location}
                        {session.address && (
                          <>
                            <br />
                            <span className="text-sm">{session.address}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-theme-text-primary mb-1">
                        主催者
                      </div>
                      <div className="text-theme-text-secondary">
                        {session.organizer?.display_name ||
                          session.organizer?.email}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右側: 予約詳細 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-theme-text-primary">
                  予約詳細
                </h3>
                <Card className="surface-neutral-1 h-fit">
                  <CardContent className="pt-6 space-y-4">
                    {/* 複数選択の場合 */}
                    {allowMultiple && selectedSlots.length > 0 && (
                      <div>
                        <div className="font-medium text-theme-text-primary mb-2">
                          選択した時間枠（{selectedSlots.length}件）
                        </div>
                        <div className="space-y-3">
                          {selectedSlots.map(slot => (
                            <div
                              key={slot.id}
                              className="surface-primary-0 p-3 rounded-lg border border-theme-primary/20"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    枠 {slot.slot_number}
                                  </div>
                                  <div className="text-sm opacity-70">
                                    {formatTimeLocalized(
                                      new Date(slot.start_time),
                                      'ja'
                                    )}{' '}
                                    -{' '}
                                    {formatTimeLocalized(
                                      new Date(slot.end_time),
                                      'ja'
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm opacity-70">料金</div>
                                  <div className="font-medium">
                                    {slot.price_per_person === 0
                                      ? '無料'
                                      : `¥${slot.price_per_person.toLocaleString()}`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 単一選択の場合 */}
                    {!allowMultiple && selectedSlot && (
                      <div>
                        <div className="font-medium text-theme-text-primary mb-2">
                          選択した時間枠
                        </div>
                        <div className="surface-primary-0 p-3 rounded-lg border border-theme-primary/20">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">
                                枠 {selectedSlot.slot_number}
                              </div>
                              <div className="text-sm opacity-70">
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
                            <div className="text-right">
                              <div className="text-sm opacity-70">料金</div>
                              <div className="font-medium">
                                {selectedSlot.price_per_person === 0
                                  ? '無料'
                                  : `¥${selectedSlot.price_per_person.toLocaleString()}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 通常の撮影会の場合 */}
                    {!hasSlots && (
                      <div>
                        <div className="font-medium text-theme-text-primary mb-2">
                          参加料金
                        </div>
                        <div className="surface-primary-0 p-3 rounded-lg border border-theme-primary/20">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {session.price_per_person === 0
                                ? '無料'
                                : `¥${session.price_per_person.toLocaleString()}`}
                            </div>
                            <div className="text-sm opacity-70">参加費</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 合計料金表示 */}
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-theme-text-primary">
                          合計料金
                        </span>
                        <span className="text-2xl font-bold text-theme-text-primary">
                          {allowMultiple && selectedSlots.length > 0
                            ? selectedSlots.reduce(
                                (sum, slot) => sum + slot.price_per_person,
                                0
                              ) === 0
                              ? '無料'
                              : `¥${selectedSlots.reduce((sum, slot) => sum + slot.price_per_person, 0).toLocaleString()}`
                            : (selectedSlot?.price_per_person ||
                                  session.price_per_person) === 0
                              ? '無料'
                              : `¥${(selectedSlot?.price_per_person || session.price_per_person).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 注意事項 */}
            <Card className="mt-6 bg-warning/10 border-warning/20">
              <CardContent className="pt-4">
                <h4 className="font-medium text-warning mb-2">ご注意事項</h4>
                <div className="text-sm text-warning/70 space-y-1">
                  <div>
                    • 予約のキャンセルは撮影会開始の24時間前まで可能です
                  </div>
                  <div>• 遅刻される場合は主催者にご連絡ください</div>
                  <div>• 体調不良の場合は無理をせず参加をお控えください</div>
                  {hasSlots && (
                    <div>
                      • 撮影枠制撮影会では、予約した時間枠以外の参加はできません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ActionBar統一ボタン */}
            <ActionBar
              actions={getActionBarButtons()}
              maxColumns={2}
              background="blur"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ステップ3: 完了
  if (currentStep === 'complete') {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <StepIndicator />

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 surface-accent rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text-primary">
                  予約が完了しました！
                </h3>
              </div>
              <ActionBar
                actions={getActionBarButtons()}
                maxColumns={1}
                background="blur"
              />
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
  isSelected,
  allowMultiple,
  onSelect,
}: {
  slot: PhotoSessionSlot;
  index: number;
  isSelected: boolean;
  allowMultiple: boolean;
  onSelect: () => void;
}) {
  const isSlotFull = slot.current_participants >= slot.max_participants;
  const slotStartTime = new Date(slot.start_time);
  const slotEndTime = new Date(slot.end_time);

  return (
    <button
      className={`w-full p-4 border-2 rounded-lg transition-all duration-200 text-left ${
        isSlotFull
          ? 'bg-card-neutral-1 opacity-50 cursor-not-allowed'
          : isSelected
            ? 'bg-card-primary border-theme-primary cursor-pointer'
            : 'bg-card-neutral-0 border-border hover:bg-card-primary hover:border-theme-primary/50 cursor-pointer'
      }`}
      onClick={onSelect}
      disabled={isSlotFull}
    >
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-semibold text-sm">枠 {index + 1}</h5>
        <div className="flex items-center gap-2">
          {allowMultiple && isSelected && (
            <Badge variant="default" className="surface-accent">
              選択中
            </Badge>
          )}
          {!allowMultiple && isSelected && (
            <Badge variant="default" className="surface-accent">
              選択中
            </Badge>
          )}
          <Badge
            variant={isSlotFull ? 'destructive' : 'outline'}
            className="text-sm"
          >
            {isSlotFull ? '満席' : '空きあり'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-text-muted mb-1">
            <Clock className="h-4 w-4" />
            <span>時間</span>
          </div>
          <div className="font-medium">
            {formatTimeLocalized(slotStartTime, 'ja')} -{' '}
            {formatTimeLocalized(slotEndTime, 'ja')}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-text-muted mb-1">
            <UsersIcon className="h-4 w-4" />
            <span>参加者</span>
          </div>
          <div className="font-medium">
            {slot.current_participants}/{slot.max_participants}人
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-text-muted mb-1">
            <CircleDollarSignIcon className="h-4 w-4" />
            <span>料金</span>
          </div>
          <div className="font-medium">
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
      <Card className="surface-neutral-1">
        <CardContent className="pt-6 space-y-3">
          <div>
            <div className="font-medium text-theme-text-primary">撮影会</div>
            <div className="text-theme-text-secondary">{session.title}</div>
          </div>

          <div>
            <div className="font-medium text-theme-text-primary">日時</div>
            <div className="text-theme-text-secondary">
              {formatDateLocalized(startDate, 'ja', 'long')}
              <br />
              {formatTimeLocalized(startDate, 'ja')} -{' '}
              {formatTimeLocalized(endDate, 'ja')}
            </div>
          </div>

          <div>
            <div className="font-medium text-theme-text-primary">場所</div>
            <div className="text-theme-text-secondary">
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
            <div className="font-medium text-theme-text-primary">料金</div>
            <div className="text-theme-text-secondary">
              {session.price_per_person === 0
                ? '無料'
                : `¥${session.price_per_person.toLocaleString()}`}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-theme-text-muted space-y-1">
        <div>• 予約のキャンセルは撮影会開始の24時間前まで可能です</div>
        <div>• 遅刻される場合は主催者にご連絡ください</div>
        <div>• 体調不良の場合は無理をせず参加をお控えください</div>
      </div>
    </div>
  );
}
