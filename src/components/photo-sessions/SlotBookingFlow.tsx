'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionBar, ActionBarButton } from '@/components/ui/action-bar';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  CircleDollarSign as CircleDollarSignIcon,
  Loader2,
} from 'lucide-react';
import { PhotoSessionSlot } from '@/types/photo-session';
import { PhotoSessionWithOrganizer } from '@/types/database';
import {
  FormattedDateTime,
  FormattedPrice,
} from '@/components/ui/formatted-display';
import { createPendingSlotBooking } from '@/lib/photo-sessions/slots';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import { checkUserHasBadRating } from '@/app/actions/rating-block';
import { createPaymentIntent } from '@/app/actions/payments';
import { BookingPaymentForm } from './BookingPaymentForm';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet } from 'lucide-react';
import { MultiSlotLotteryEntryForm } from '@/components/lottery/MultiSlotLotteryEntryForm';
import { LotteryEntryConfirmation } from '@/components/lottery/LotteryEntryConfirmation';
import { getLotterySession } from '@/app/actions/photo-session-lottery';
import {
  getUserLotteryEntry,
  getLotteryEntryCount,
} from '@/app/actions/multi-slot-lottery';
import type {
  LotterySessionWithSettings,
  LotteryEntryGroup,
  LotterySlotEntry,
} from '@/types/multi-slot-lottery';

interface SlotBookingFlowProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
  userId: string;
}

type BookingStep = 'select' | 'confirm' | 'payment' | 'complete';

export function SlotBookingFlow({
  session,
  slots,
  userId,
}: SlotBookingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('photoSessions');

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'prepaid' | 'cash_on_site'
  >('prepaid');
  // 決済フロー用の状態
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null
  );
  const [totalAmount, setTotalAmount] = useState<number>(0);
  // 抽選セッション情報
  const [lotterySession, setLotterySession] =
    useState<LotterySessionWithSettings | null>(null);
  const [userLotteryEntry, setUserLotteryEntry] = useState<{
    group: LotteryEntryGroup;
    slot_entries: LotterySlotEntry[];
  } | null>(null);
  const [isLoadingLottery, setIsLoadingLottery] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  // エントリー上限情報（抽選の場合）
  const [lotteryEntryCount, setLotteryEntryCount] = useState<{
    entries_by_slot: Array<{
      slot_id: string;
      slot_number: number;
      entry_count: number;
    }>;
    max_entries: number | null;
  } | null>(null);

  const currentStep = (searchParams.get('step') as BookingStep) || 'select';
  const hasSlots = slots && slots.length > 0;
  const allowMultiple = session.allow_multiple_bookings && hasSlots;

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

  // 抽選セッション情報を取得
  useEffect(() => {
    const loadLotterySession = async () => {
      if (session.booking_type !== 'lottery' || lotterySession) {
        return;
      }

      setIsLoadingLottery(true);
      try {
        const result = await getLotterySession(session.id);
        if (result.data) {
          setLotterySession(result.data as LotterySessionWithSettings);

          // ユーザーのエントリー情報を取得
          if (result.data.id) {
            const entryResult = await getUserLotteryEntry(result.data.id);
            if (entryResult.success && entryResult.data) {
              setUserLotteryEntry(entryResult.data);
            }

            // エントリー上限情報を取得
            const entryCountResult = await getLotteryEntryCount(result.data.id);
            if (entryCountResult.success && entryCountResult.data) {
              const lotterySessionData =
                result.data as LotterySessionWithSettings;
              setLotteryEntryCount({
                entries_by_slot: entryCountResult.data.entries_by_slot || [],
                max_entries: lotterySessionData.max_entries ?? null,
              });
            }
          }
        }
      } catch (error) {
        logger.error('抽選セッション取得エラー:', error);
      } finally {
        setIsLoadingLottery(false);
      }
    };

    loadLotterySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, session.booking_type]);

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

  // 予約処理（決済フロー統合版）
  const handleBooking = useCallback(async () => {
    setIsBooking(true);
    try {
      // 評価チェック（block_users_with_bad_ratingsがtrueの場合のみ）
      if (session.block_users_with_bad_ratings) {
        const ratingCheckResult = await checkUserHasBadRating(
          userId,
          session.id
        );
        if (!ratingCheckResult.success) {
          logger.error('評価チェックエラー:', ratingCheckResult.error);
          toast.error(t('form.errors.ratingCheckFailed'));
          setIsBooking(false);
          return;
        }

        if (ratingCheckResult.hasBadRating) {
          toast.error(t('form.errors.userHasBadRating'));
          setIsBooking(false);
          return;
        }
      }

      // 料金計算
      let calculatedAmount = 0;
      if (hasSlots) {
        if (allowMultiple && selectedSlots.length > 0) {
          calculatedAmount = selectedSlots.reduce(
            (sum, slot) => sum + slot.price_per_person,
            0
          );
        } else if (selectedSlot) {
          calculatedAmount = selectedSlot.price_per_person;
        }
      } else {
        calculatedAmount = session.price_per_person;
      }
      setTotalAmount(calculatedAmount);

      // 支払い方法がStripe決済の場合（無料の場合は決済不要）
      const needsPayment =
        selectedPaymentMethod === 'prepaid' && calculatedAmount > 0;

      if (hasSlots) {
        // スロット制の場合
        if (allowMultiple) {
          // 複数選択の場合（簡略化のため、最初のスロットのみ処理）
          if (selectedSlotIds.length === 0) {
            toast.error('時間枠を選択してください');
            setIsBooking(false);
            return;
          }

          // 最初のスロットで予約を作成（複数スロット対応は将来実装）
          const firstSlotId = selectedSlotIds[0];
          const result = await createPendingSlotBooking(
            firstSlotId,
            needsPayment ? 'prepaid' : 'cash_on_site'
          );

          if (!result.success || !result.bookingId) {
            toast.error(result.message || '予約に失敗しました');
            setIsBooking(false);
            return;
          }

          setPendingBookingId(result.bookingId);

          if (needsPayment) {
            // Stripe決済の場合、PaymentIntentを作成
            const paymentResult = await createPaymentIntent({
              amount: calculatedAmount,
              currency: 'jpy',
              payment_method_types: ['card'],
              metadata: {
                booking_id: result.bookingId,
                photo_session_id: session.id,
                user_id: userId,
                payment_timing: 'prepaid',
              },
            });

            if (!paymentResult.success || !paymentResult.client_secret) {
              toast.error(paymentResult.error || '決済の準備に失敗しました');
              setIsBooking(false);
              return;
            }

            setPaymentClientSecret(paymentResult.client_secret);
            navigateToStep('payment', selectedSlotIds);
          } else {
            // 現地払いの場合は直接完了
            navigateToStep('complete');
            toast.success('予約が確定しました（現地払い）');
          }
        } else {
          // 単一選択の場合
          if (!selectedSlotId) {
            toast.error('時間枠を選択してください');
            setIsBooking(false);
            return;
          }

          const result = await createPendingSlotBooking(
            selectedSlotId,
            needsPayment ? 'prepaid' : 'cash_on_site'
          );

          if (!result.success || !result.bookingId) {
            toast.error(result.message || '予約に失敗しました');
            setIsBooking(false);
            return;
          }

          setPendingBookingId(result.bookingId);

          if (needsPayment) {
            // Stripe決済の場合、PaymentIntentを作成
            const paymentResult = await createPaymentIntent({
              amount: calculatedAmount,
              currency: 'jpy',
              payment_method_types: ['card'],
              metadata: {
                booking_id: result.bookingId,
                photo_session_id: session.id,
                user_id: userId,
                payment_timing: 'prepaid',
              },
            });

            if (!paymentResult.success || !paymentResult.client_secret) {
              toast.error(paymentResult.error || '決済の準備に失敗しました');
              setIsBooking(false);
              return;
            }

            setPaymentClientSecret(paymentResult.client_secret);
            navigateToStep('payment', selectedSlotId);
          } else {
            // 現地払いの場合は直接完了
            navigateToStep('complete');
            toast.success('予約が確定しました（現地払い）');
          }
        }
      } else {
        // 通常の撮影会の場合（現状は従来通り）
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
    selectedSlots,
    selectedSlot,
    session,
    userId,
    navigateToStep,
    selectedPaymentMethod,
    t,
  ]);

  // 完了時の処理
  const handleComplete = useCallback(() => {
    // ページをリロードして最新の状態を反映
    window.location.href = window.location.pathname;
  }, []);

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
                  variant: 'accent' as const,
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
                  variant: 'cta' as const,
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
                  variant: 'cta' as const,
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
            variant: 'cta',
            onClick: handleBooking,
            disabled: isBooking,
            icon: isBooking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : undefined,
          },
        ];

      case 'payment':
        return [
          {
            id: 'back',
            label: '戻る',
            variant: 'outline',
            onClick: () => navigateToStep('confirm'),
            icon: <ArrowLeft className="h-4 w-4" />,
          },
        ];

      case 'complete':
        return [
          {
            id: 'complete',
            label: '完了',
            variant: 'cta',
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
  const StepIndicator = () => {
    const steps = ['select', 'confirm', 'payment', 'complete'] as const;
    const stepLabels = {
      select: '時間枠選択',
      confirm: '予約確認',
      payment: '決済',
      complete: '完了',
    };

    // paymentステップはStripe決済が必要な場合のみ表示
    const visibleSteps = steps.filter(
      step => step !== 'payment' || (paymentClientSecret && pendingBookingId)
    );
    const currentStepIndex = visibleSteps.indexOf(currentStep);
    const progress = ((currentStepIndex + 1) / visibleSteps.length) * 100;

    return (
      <div className="space-y-4 py-6">
        {/* プログレスバー */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-theme-text-muted">
            <span>
              ステップ {currentStepIndex + 1} / {steps.length}
            </span>
            <span className="font-medium text-theme-text-primary">
              {stepLabels[currentStep]}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-surface-neutral-1" />
        </div>
      </div>
    );
  };

  // ステップ1: 時間枠選択
  if (currentStep === 'select') {
    // 抽選方式で複数スロットの場合は専用フォームを表示
    if (session.booking_type === 'lottery' && allowMultiple) {
      if (isLoadingLottery) {
        return (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        );
      }

      if (!lotterySession) {
        return (
          <Alert variant="destructive">
            <p>抽選セッション情報の取得に失敗しました</p>
          </Alert>
        );
      }

      return (
        <div className="w-full max-w-6xl mx-auto space-y-6 mt-4">
          {userLotteryEntry && !showEditForm ? (
            <LotteryEntryConfirmation
              confirmation={{
                group: userLotteryEntry.group,
                slot_entries: userLotteryEntry.slot_entries,
              }}
              lotterySession={lotterySession}
              onEdit={() => {
                // 編集モードに切り替え
                setShowEditForm(true);
              }}
            />
          ) : (
            <MultiSlotLotteryEntryForm
              lotterySession={lotterySession}
              slots={slots}
              organizerId={session.organizer_id}
              photoSessionId={session.id}
              existingEntry={userLotteryEntry}
              entryCount={lotteryEntryCount}
              onEntrySuccess={() => {
                // エントリー情報を再取得
                if (lotterySession.id) {
                  getUserLotteryEntry(lotterySession.id).then(result => {
                    if (result.success && result.data) {
                      setUserLotteryEntry(result.data);
                      setShowEditForm(false); // 確認画面に戻る
                    }
                  });
                  // エントリー上限情報も再取得
                  getLotteryEntryCount(lotterySession.id).then(result => {
                    if (result.success && result.data) {
                      const lotterySessionData =
                        lotterySession as LotterySessionWithSettings;
                      setLotteryEntryCount({
                        entries_by_slot: result.data.entries_by_slot || [],
                        max_entries: lotterySessionData.max_entries ?? null,
                      });
                    }
                  });
                }
              }}
              onCancel={() => {
                if (userLotteryEntry) {
                  // 既存エントリーがある場合は確認画面に戻る
                  setShowEditForm(false);
                } else {
                  // 新規エントリーの場合は撮影会詳細ページに戻る
                  router.push(`/ja/photo-sessions/${session.id}`);
                }
              }}
            />
          )}
        </div>
      );
    }

    // 通常の先着順予約フロー
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
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
                  <Alert>
                    💡&nbsp;この撮影会では複数の時間枠を選択できます。お好みの枠を複数選んでください。
                  </Alert>
                )}
                {slots.map((slot, index) => {
                  // 抽選の場合、エントリー上限をチェック
                  const isEntryFull =
                    session.booking_type === 'lottery' &&
                    lotteryEntryCount &&
                    lotteryEntryCount.max_entries !== null
                      ? (() => {
                          const slotEntry =
                            lotteryEntryCount.entries_by_slot.find(
                              e => e.slot_id === slot.id
                            );
                          return (
                            slotEntry &&
                            slotEntry.entry_count >=
                              lotteryEntryCount.max_entries
                          );
                        })()
                      : false;

                  return (
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
                      isEntryFull={isEntryFull}
                      isLottery={session.booking_type === 'lottery'}
                    />
                  );
                })}
                {allowMultiple && (
                  <div className="mt-4 p-3 card-neutral-1 rounded-lg">
                    <p className="text-sm text-theme-text-secondary">
                      選択中: {selectedSlotIds.length}件の時間枠
                      {selectedSlotIds.length > 0 && (
                        <span className="ml-2 text-info">
                          （合計料金:{' '}
                          <FormattedPrice
                            value={selectedSlots.reduce(
                              (sum, slot) => sum + slot.price_per_person,
                              0
                            )}
                            format="simple"
                          />
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
          </CardContent>
        </Card>

        {/* ActionBar統一ボタン */}
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={2}
          background="blur"
        />
      </div>
    );
  }

  // ステップ2: 予約確認
  if (currentStep === 'confirm') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
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
                        <FormattedDateTime
                          value={new Date(session.start_time)}
                          format="date-long"
                        />
                        <br />
                        <FormattedDateTime
                          value={new Date(session.start_time)}
                          format="time-range"
                          endValue={new Date(session.end_time)}
                        />
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
                                    <FormattedDateTime
                                      value={new Date(slot.start_time)}
                                      format="time-range"
                                      endValue={new Date(slot.end_time)}
                                    />
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm opacity-70">料金</div>
                                  <div className="font-medium">
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
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 支払い方法選択（現地払いが有効な場合のみ） */}
                    {session.payment_timing === 'cash_on_site' && (
                      <div>
                        <div className="font-medium text-theme-text-primary mb-2">
                          {t('booking.selectPaymentMethod')}
                        </div>
                        <RadioGroup
                          value={selectedPaymentMethod}
                          onValueChange={(
                            value: 'prepaid' | 'cash_on_site'
                          ) => {
                            setSelectedPaymentMethod(value);
                          }}
                          className="space-y-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="prepaid"
                              id="payment_prepaid"
                            />
                            <Label
                              htmlFor="payment_prepaid"
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <CreditCard className="h-4 w-4" />
                              <span>{t('booking.paymentMethodStripe')}</span>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="cash_on_site"
                              id="payment_cash_on_site"
                            />
                            <Label
                              htmlFor="payment_cash_on_site"
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <Wallet className="h-4 w-4" />
                              <span>
                                {t('booking.paymentMethodCashOnSite')}
                              </span>
                            </Label>
                          </div>
                        </RadioGroup>
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
                                <FormattedDateTime
                                  value={new Date(selectedSlot.start_time)}
                                  format="time-range"
                                  endValue={new Date(selectedSlot.end_time)}
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm opacity-70">料金</div>
                              <div className="font-medium">
                                {selectedSlot.price_per_person === 0 ? (
                                  '無料'
                                ) : (
                                  <FormattedPrice
                                    value={selectedSlot.price_per_person}
                                    format="simple"
                                  />
                                )}
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
                              {session.price_per_person === 0 ? (
                                '無料'
                              ) : (
                                <FormattedPrice
                                  value={session.price_per_person}
                                  format="simple"
                                />
                              )}
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
                          {allowMultiple && selectedSlots.length > 0 ? (
                            selectedSlots.reduce(
                              (sum, slot) => sum + slot.price_per_person,
                              0
                            ) === 0 ? (
                              '無料'
                            ) : (
                              <FormattedPrice
                                value={selectedSlots.reduce(
                                  (sum, slot) => sum + slot.price_per_person,
                                  0
                                )}
                                format="simple"
                              />
                            )
                          ) : (selectedSlot?.price_per_person ||
                              session.price_per_person) === 0 ? (
                            '無料'
                          ) : (
                            <FormattedPrice
                              value={
                                selectedSlot?.price_per_person ||
                                session.price_per_person
                              }
                              format="simple"
                            />
                          )}
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
          </CardContent>
        </Card>

        {/* ActionBar統一ボタン */}
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={2}
          background="blur"
        />
      </div>
    );
  }

  // ステップ3: 決済
  if (currentStep === 'payment' && paymentClientSecret && pendingBookingId) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* ステップインジケーター */}
        <StepIndicator />

        <Card>
          <CardHeader>
            <CardTitle>決済</CardTitle>
            <p className="text-sm text-muted-foreground">
              カード情報を入力して決済を完了してください
            </p>
          </CardHeader>
          <CardContent>
            <BookingPaymentForm
              clientSecret={paymentClientSecret}
              bookingId={pendingBookingId}
              amount={totalAmount}
              photoSessionId={session.id}
              onPaymentSuccess={() => {
                navigateToStep('complete');
              }}
            />
          </CardContent>
        </Card>

        {/* ActionBar統一ボタン */}
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={1}
          background="blur"
        />
      </div>
    );
  }

  // ステップ4: 完了
  if (currentStep === 'complete') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
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
            </div>
          </CardContent>
        </Card>

        {/* ActionBar統一ボタン */}
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={1}
          background="blur"
        />
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
  isEntryFull = false,
  isLottery = false,
}: {
  slot: PhotoSessionSlot;
  index: number;
  isSelected: boolean;
  allowMultiple: boolean;
  onSelect: () => void;
  isEntryFull?: boolean;
  isLottery?: boolean;
}) {
  const isSlotFull = slot.current_participants >= slot.max_participants;
  const isDisabled = isSlotFull || (isLottery && isEntryFull);
  const slotStartTime = new Date(slot.start_time);
  const slotEndTime = new Date(slot.end_time);

  return (
    <button
      className={`w-full p-4 border-2 rounded-lg transition-all duration-200 text-left ${
        isDisabled
          ? 'bg-card-neutral-1 opacity-50 cursor-not-allowed'
          : isSelected
            ? 'bg-card-primary border-theme-primary cursor-pointer'
            : 'bg-card-neutral-0 border-border hover:bg-card-primary hover:border-theme-primary/50 cursor-pointer'
      }`}
      onClick={onSelect}
      disabled={isDisabled}
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
            variant={isDisabled ? 'destructive' : 'outline'}
            className="text-sm"
          >
            {isSlotFull ? '満席' : isEntryFull ? 'エントリー上限' : '空きあり'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        {/* 時間（左側） */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-theme-text-muted">
            <Clock className="h-4 w-4" />
            <span>時間</span>
          </div>
          <div className="font-medium">
            <FormattedDateTime
              value={slotStartTime}
              format="time-range"
              endValue={slotEndTime}
            />
          </div>
        </div>

        {/* 料金（右側） */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-theme-text-muted">
            <CircleDollarSignIcon className="h-4 w-4" />
            <span>料金</span>
          </div>
          <div className="font-medium">
            {slot.price_per_person === 0 ? (
              '無料'
            ) : (
              <FormattedPrice value={slot.price_per_person} format="simple" />
            )}
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
              <FormattedDateTime value={startDate} format="date-long" />
              <br />
              <FormattedDateTime
                value={startDate}
                format="time-range"
                endValue={endDate}
              />
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
              {session.price_per_person === 0 ? (
                '無料'
              ) : (
                <FormattedPrice
                  value={session.price_per_person}
                  format="simple"
                />
              )}
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
