'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionBar, ActionBarButton } from '@/components/ui/action-bar';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  CircleDollarSign as CircleDollarSignIcon,
  Loader2,
  AlertCircle,
  Camera,
  Calendar,
  MapPin,
  User,
} from 'lucide-react';
import { InfoCard } from '@/components/ui/info-card';
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
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wallet } from 'lucide-react';
import {
  SelectableWrapperGroup,
  SelectableWrapperItem,
} from '@/components/ui/selectable-wrapper';
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

    // paymentステップはStripe決済が必要な場合のみ表示
    const visibleSteps = steps.filter(
      step => step !== 'payment' || (paymentClientSecret && pendingBookingId)
    );
    const currentStepIndex = visibleSteps.indexOf(currentStep);

    return (
      <div className="flex justify-center py-6">
        <div className="inline-flex items-center gap-3 surface-neutral backdrop-blur-sm rounded-full px-6 py-3 border">
          {visibleSteps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isPast = index < currentStepIndex;

            return (
              <React.Fragment key={step}>
                {/* ステップドット */}
                <div
                  className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm transition-all ${
                    isActive
                      ? 'surface-primary'
                      : isPast
                        ? 'surface-accent'
                        : 'bg-muted'
                  }`}
                >
                  {index + 1}
                </div>

                {/* 接続線（最後のステップ以外） */}
                {index < visibleSteps.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-1 rounded-full transition-all ${
                      isPast ? 'surface-accent' : 'bg-muted'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            );
          })}
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

        {/* タイトルセクション */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-xl md:text-2xl font-bold">
            {hasSlots ? '時間枠を選択してください' : '予約確認'}
          </h1>
          <p className="text-sm sm:text-base md:text-md opacity-70">
            {hasSlots
              ? 'ご希望の時間帯を1つお選びください'
              : '以下の撮影会を予約しますか？'}
          </p>
        </div>

        {/* 撮影会情報カード */}
        <div className="surface-neutral backdrop-blur-sm rounded-2xl p-4 sm:p-6 border">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center surface-primary rounded-xl flex-shrink-0">
              <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 truncate">
                {session.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-70">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <FormattedDateTime
                    value={new Date(session.start_time)}
                    format="date-long"
                  />
                </span>
                {session.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                    {session.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  {session.organizer?.display_name || '運営者'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {hasSlots ? (
          <div className="space-y-4">
            {allowMultiple && (
              <Alert>
                💡&nbsp;この撮影会では複数の時間枠を選択できます。お好みの枠を複数選んでください。
              </Alert>
            )}
            {allowMultiple ? (
              <SelectableWrapperGroup
                mode="multiple"
                values={selectedSlotIds}
                onValuesChange={setSelectedSlotIds}
              >
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

                  const isSlotFull =
                    slot.current_participants >= slot.max_participants;
                  const isDisabled =
                    isSlotFull ||
                    (session.booking_type === 'lottery' && isEntryFull);

                  return (
                    <SelectableWrapperItem
                      key={slot.id}
                      value={slot.id}
                      disabled={isDisabled}
                      rounded="2xl"
                    >
                      <SlotCardContent
                        slot={slot}
                        index={index}
                        isEntryFull={isEntryFull}
                        isLottery={session.booking_type === 'lottery'}
                        isSlotFull={isSlotFull}
                      />
                    </SelectableWrapperItem>
                  );
                })}
              </SelectableWrapperGroup>
            ) : (
              <SelectableWrapperGroup
                mode="single"
                value={selectedSlotId || ''}
                onValueChange={handleSlotSelect}
              >
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

                  const isSlotFull =
                    slot.current_participants >= slot.max_participants;
                  const isDisabled =
                    isSlotFull ||
                    (session.booking_type === 'lottery' && isEntryFull);

                  return (
                    <SelectableWrapperItem
                      key={slot.id}
                      value={slot.id}
                      disabled={isDisabled}
                      rounded="2xl"
                    >
                      <SlotCardContent
                        slot={slot}
                        index={index}
                        isEntryFull={isEntryFull}
                        isLottery={session.booking_type === 'lottery'}
                        isSlotFull={isSlotFull}
                      />
                    </SelectableWrapperItem>
                  );
                })}
              </SelectableWrapperGroup>
            )}
            {allowMultiple && selectedSlotIds.length > 0 && (
              <div className="mt-6 surface-primary rounded-2xl p-6 border border-theme-primary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center surface-accent rounded-xl">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm opacity-80 mb-2">
                        選択済み
                      </div>
                      <div className="text-lg sm:text-xl font-bold">
                        {selectedSlotIds.length}件の時間枠を選択中
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs sm:text-sm opacity-80 mb-2">
                      合計金額
                    </div>
                    <div className="text-2xl sm:text-4xl font-bold">
                      <FormattedPrice
                        value={selectedSlots.reduce(
                          (sum, slot) => sum + slot.price_per_person,
                          0
                        )}
                        format="simple"
                      />
                    </div>
                  </div>
                </div>
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
      </div>
    );
  }

  // ステップ2: 予約確認
  if (currentStep === 'confirm') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* ステップインジケーター */}
        <StepIndicator />

        {/* タイトルセクション */}
        <div className="relative mb-4">
          <h1 className="text-2xl font-bold text-center">予約内容の確認</h1>
          <div className="absolute top-0 right-0 text-sm surface-neutral px-4 py-2 rounded-full whitespace-nowrap">
            ステップ 2 / 3
          </div>
        </div>

        {/* 1列レイアウト */}
        <div className="space-y-6">
          {/* 撮影会情報 */}
          <InfoCard title="撮影会情報" icon={Camera} variant="primary">
            <div className="space-y-4">
              <div>
                <div className="text-xs sm:text-sm opacity-70 mb-2">
                  撮影会名
                </div>
                <div className="text-lg font-bold">{session.title}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs sm:text-sm opacity-70 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    開催日時
                  </div>
                  <div className="font-medium">
                    <FormattedDateTime
                      value={new Date(session.start_time)}
                      format="date-long"
                    />
                  </div>
                  <div className="text-md font-bold">
                    <FormattedDateTime
                      value={new Date(session.start_time)}
                      format="time-range"
                      endValue={new Date(session.end_time)}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm opacity-70 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    主催者
                  </div>
                  <div className="font-medium">
                    {session.organizer?.display_name ||
                      session.organizer?.email ||
                      '運営者'}
                  </div>
                </div>
              </div>
              {session.location && (
                <div>
                  <div className="text-xs sm:text-sm opacity-70 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    場所
                  </div>
                  <div className="font-medium">{session.location}</div>
                  {session.address && (
                    <div className="text-sm opacity-70">{session.address}</div>
                  )}
                </div>
              )}
            </div>
          </InfoCard>

          {/* 選択した時間枠 */}
          {allowMultiple && selectedSlots.length > 0 && (
            <InfoCard
              title={`選択した時間枠（${selectedSlots.length}件）`}
              icon={Clock}
              variant="primary"
            >
              <div className="space-y-4">
                {[...selectedSlots]
                  .sort((a, b) => a.slot_number - b.slot_number)
                  .map(slot => (
                    <div
                      key={slot.id}
                      className="surface-primary p-4 rounded-xl border border-theme-primary/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 flex items-center justify-center surface-accent rounded-lg">
                            <span className="text-2xl font-bold">
                              {slot.slot_number}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs opacity-70 mb-2">
                              枠番号
                            </div>
                            <div className="text-xl font-bold">
                              <FormattedDateTime
                                value={new Date(slot.start_time)}
                                format="time-range"
                                endValue={new Date(slot.end_time)}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs opacity-70 mb-2">料金</div>
                          <div className="text-2xl font-bold">
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
            </InfoCard>
          )}

          {/* 単一選択の場合 */}
          {!allowMultiple && selectedSlot && (
            <InfoCard title="選択した時間枠" icon={Clock} variant="secondary">
              <div className="surface-primary p-4 rounded-xl border border-theme-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center surface-accent rounded-lg">
                      <span className="text-2xl font-bold">
                        {selectedSlot.slot_number}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs opacity-70 mb-2">枠番号</div>
                      <div className="text-xl font-bold">
                        <FormattedDateTime
                          value={new Date(selectedSlot.start_time)}
                          format="time-range"
                          endValue={new Date(selectedSlot.end_time)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-70 mb-2">料金</div>
                    <div className="text-2xl font-bold">
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
            </InfoCard>
          )}

          {/* 通常の撮影会の場合 */}
          {!hasSlots && (
            <InfoCard
              title="参加料金"
              icon={CircleDollarSignIcon}
              variant="secondary"
            >
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
                <div className="text-sm opacity-70 mt-1">参加費</div>
              </div>
            </InfoCard>
          )}

          {/* 支払い方法選択 */}
          {(session.payment_timing === 'cash_on_site' ||
            session.payment_timing === 'prepaid') && (
            <Card>
              <CardContent className="pt-6">
                <div className="font-medium text-theme-text-primary mb-4">
                  {t('booking.selectPaymentMethod')}
                </div>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={(value: 'prepaid' | 'cash_on_site') => {
                    setSelectedPaymentMethod(value);
                  }}
                  className="grid grid-cols-1 gap-4"
                >
                  {[
                    {
                      value: 'prepaid' as const,
                      title: t('booking.paymentMethodStripe'),
                      description: t('booking.paymentMethodStripeDescription'),
                      icon: CreditCard,
                      color:
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                    },
                    ...(session.payment_timing === 'cash_on_site'
                      ? [
                          {
                            value: 'cash_on_site' as const,
                            title: t('booking.paymentMethodCashOnSite'),
                            description: t(
                              'booking.paymentMethodCashOnSiteDescription'
                            ),
                            icon: Wallet,
                            color: 'bg-success/10 text-success',
                          },
                        ]
                      : []),
                  ].map(method => {
                    const Icon = method.icon;
                    const isSelected = selectedPaymentMethod === method.value;

                    return (
                      <div key={method.value} className="relative">
                        <RadioGroupItem
                          value={method.value}
                          id={`payment_${method.value}`}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={`payment_${method.value}`}
                          className="block cursor-pointer transition-all duration-200"
                        >
                          <Card
                            className={`transition-all duration-200 hover:shadow-md ${
                              isSelected
                                ? 'ring-2 ring-primary shadow-md'
                                : 'hover:border-muted-foreground/20'
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`p-2 rounded-lg ${method.color}`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {method.title}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {method.description}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Badge
                                    variant="default"
                                    className="ml-2 flex-shrink-0 whitespace-nowrap"
                                  >
                                    {t('booking.paymentSelected')}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* 合計料金表示 */}
          <Card className="surface-primary">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-sm opacity-90 mb-2">合計料金</div>
                <div className="flex items-baseline justify-center gap-2">
                  <div className="text-5xl font-bold">
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
                  </div>
                  <span className="text-sm opacity-75">税込</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 注意事項 */}
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-warning/20 rounded-lg flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-3 text-warning">
                    {t('booking.noticeTitle')}
                  </h3>
                  <ul className="space-y-2 text-sm text-warning/70">
                    <li>• {t('booking.noticeCancellation')}</li>
                    <li>• {t('booking.noticeLate')}</li>
                    <li>• {t('booking.noticeHealth')}</li>
                    {hasSlots && (
                      <li>• {t('booking.noticeSlotRestriction')}</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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

// スロットカードコンテンツコンポーネント（選択機能なし、表示のみ）
function SlotCardContent({
  slot,
  index,
  isEntryFull = false,
  isLottery = false,
  isSlotFull = false,
}: {
  slot: PhotoSessionSlot;
  index: number;
  isEntryFull?: boolean;
  isLottery?: boolean;
  isSlotFull?: boolean;
}) {
  const isDisabled = isSlotFull || (isLottery && isEntryFull);
  const slotStartTime = new Date(slot.start_time);
  const slotEndTime = new Date(slot.end_time);

  return (
    <div className="w-full rounded-2xl overflow-hidden border-2 border-border relative">
      {/* 背景グラデーション */}
      <div
        className={`absolute inset-0 ${
          isDisabled ? 'bg-card-neutral-1' : 'bg-card-neutral-0'
        }`}
      ></div>

      {/* コンテンツ */}
      <div className="relative p-6">
        <div className="flex items-center gap-6">
          {/* 枠番号（左側） */}
          <div
            className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center ${
              isDisabled ? 'bg-muted' : 'bg-muted'
            }`}
          >
            <div className="text-xs sm:text-sm opacity-80 mb-2">枠</div>
            <div className="text-3xl sm:text-4xl font-bold">{index + 1}</div>
          </div>

          {/* 詳細情報（右側グリッド） */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* 時間 */}
            <div className="text-left">
              <div className="flex items-center gap-2 text-theme-text-muted mb-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm">時間</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">
                <FormattedDateTime
                  value={slotStartTime}
                  format="time-range"
                  endValue={slotEndTime}
                />
              </div>
            </div>

            {/* 料金 */}
            <div className="text-left">
              <div className="flex items-center gap-2 text-theme-text-muted mb-2">
                <CircleDollarSignIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm">料金</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold">
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

            {/* 状態 */}
            <div className="text-left">
              <div className="flex items-center gap-2 text-theme-text-muted mb-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm">状態</span>
              </div>
              <div>
                {isSlotFull || isEntryFull ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-destructive/20 rounded-lg border border-destructive/30">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive font-bold text-sm">
                      {isSlotFull ? '満席' : 'エントリー上限'}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-4 w-4 opacity-50" />
                    <span className="font-bold text-sm opacity-80">
                      空きあり
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <Card className="surface-neutral">
        <CardContent className="pt-6 space-y-4">
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
