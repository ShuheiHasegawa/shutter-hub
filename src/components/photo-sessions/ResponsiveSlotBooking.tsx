'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { logger } from '@/lib/utils/logger';
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
  UsersIcon,
  CircleDollarSignIcon,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { PhotoSessionSlot } from '@/types/photo-session';
import { PhotoSessionWithOrganizer } from '@/types/database';
import {
  FormattedDateTime,
  FormattedPrice,
} from '@/components/ui/formatted-display';
import { createSlotBooking } from '@/lib/photo-sessions/slots';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ResponsiveSlotBookingProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

// ステップ定義
type BookingStep = 'select' | 'confirm' | 'complete';

const stepLabels = {
  select: '時間枠選択',
  confirm: '予約確認',
  complete: '完了',
};

// ResponsiveSlotBookingコンポーネントをメモ化
export const ResponsiveSlotBooking = memo(function ResponsiveSlotBooking({
  session,
  slots,
  isOpen,
  onClose,
  userId,
}: ResponsiveSlotBookingProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [currentStep, setCurrentStep] = useState<BookingStep>('select');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  const hasSlots = slots && slots.length > 0;

  // ユーザー設定に基づいたフォーマット関数
  const formatTimeString = useCallback(
    (date: Date): string => {
      const locale = user?.user_metadata?.language === 'en' ? 'en-US' : 'ja-JP';
      const timeZone = user?.user_metadata?.timezone || 'Asia/Tokyo';
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      }).format(date);
    },
    [user]
  );

  const formatPriceString = useCallback(
    (price: number): string => {
      const locale = user?.user_metadata?.language === 'en' ? 'en-US' : 'ja-JP';
      const currency = user?.user_metadata?.currency || 'JPY';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    },
    [user]
  );

  // レスポンシブ判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ダイアログが開かれた時の初期化
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('select');
      setSelectedSlotId(null);
      setIsBooking(false);
    }
  }, [isOpen]);

  // 即座のステップ遷移関数（ディレイなし）
  const transitionToStep = useCallback((nextStep: BookingStep) => {
    setCurrentStep(nextStep);
  }, []);

  // 予約処理
  const handleBooking = useCallback(async () => {
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
          transitionToStep('complete');
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
          transitionToStep('complete');
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
      logger.error('予約エラー:', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  }, [hasSlots, selectedSlotId, session.id, userId, toast, transitionToStep]);

  // 完了時の処理
  const handleComplete = useCallback(() => {
    onClose();
    // ページをリロードして最新の状態を反映
    window.location.reload();
  }, [onClose]);

  // 選択されたスロットの取得
  const selectedSlot = useMemo(
    () => (selectedSlotId ? slots.find(s => s.id === selectedSlotId) : null),
    [selectedSlotId, slots]
  );

  // スロット選択ハンドラーをメモ化
  const handleSlotSelect = useCallback((slotId: string) => {
    setSelectedSlotId(slotId);
  }, []);

  // PC用ステップ式コンポーネント（メモ化）
  const DesktopStepFlow = useMemo(
    () => {
      const Component = () => {
        // selectedSlotの計算をコンポーネント内で行う
        const selectedSlot = selectedSlotId
          ? slots.find(s => s.id === selectedSlotId)
          : null;

        return (
          <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden surface-neutral">
              {/* ステップインジケーター */}
              <div className="flex items-center justify-center space-x-8 py-4 border-b border-border">
                {Object.entries(stepLabels).map(([step, label], index) => {
                  const isActive = currentStep === step;
                  const isCompleted =
                    currentStep === 'complete' && step !== 'complete';
                  const stepNumber = index + 1;

                  return (
                    <div key={step} className="flex items-center space-x-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          isCompleted
                            ? 'surface-accent'
                            : isActive
                              ? 'surface-primary'
                              : 'surface-neutral'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          stepNumber
                        )}
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
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="overflow-y-auto flex-1">
                <AlertDialogHeader className="pb-4">
                  <AlertDialogTitle className="text-theme-text-primary">
                    {currentStep === 'select' &&
                      (hasSlots ? '時間枠を選択' : '予約確認')}
                    {currentStep === 'confirm' && '予約内容の確認'}
                    {currentStep === 'complete' && '予約完了'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-theme-text-secondary">
                    {currentStep === 'select' &&
                      (hasSlots
                        ? 'ご希望の時間枠を選択してください'
                        : '以下の撮影会を予約しますか？')}
                    {currentStep === 'confirm' &&
                      '内容をご確認の上、予約を確定してください'}
                    {currentStep === 'complete' && '予約が正常に完了しました'}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 pb-4">
                  {/* ステップ1: 時間枠選択 */}
                  {currentStep === 'select' && hasSlots && (
                    <div className="space-y-4">
                      {slots.map((slot, index) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          index={index}
                          isSelected={selectedSlotId === slot.id}
                          onSelect={handleSlotSelect}
                        />
                      ))}
                    </div>
                  )}

                  {/* ステップ1: 通常撮影会の場合 */}
                  {currentStep === 'select' && !hasSlots && (
                    <SessionInfoDisplay session={session} />
                  )}

                  {/* ステップ2: 予約確認 */}
                  {currentStep === 'confirm' && (
                    <div className="space-y-4">
                      <Card className="surface-neutral">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-theme-text-primary">
                            予約内容
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="font-medium text-theme-text-primary">
                              撮影会
                            </div>
                            <div className="text-theme-text-secondary">
                              {session.title}
                            </div>
                          </div>

                          {selectedSlot && (
                            <div>
                              <div className="font-medium text-theme-text-primary">
                                選択した時間枠
                              </div>
                              <div className="text-theme-text-secondary">
                                枠 {selectedSlot.slot_number}:{' '}
                                <FormattedDateTime
                                  value={new Date(selectedSlot.start_time)}
                                  format="time-range"
                                  endValue={new Date(selectedSlot.end_time)}
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="font-medium text-theme-text-primary">
                              料金
                            </div>
                            <div className="text-theme-text-secondary">
                              {(selectedSlot?.price_per_person ||
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
                          </div>
                        </CardContent>
                      </Card>

                      <div className="text-xs text-theme-text-muted space-y-1">
                        <div>
                          • 予約のキャンセルは撮影会開始の24時間前まで可能です
                        </div>
                        <div>• 遅刻される場合は主催者にご連絡ください</div>
                        <div>
                          • 体調不良の場合は無理をせず参加をお控えください
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ステップ3: 完了 */}
                  {currentStep === 'complete' && (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 surface-accent rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-theme-text-primary">
                          予約が完了しました！
                        </h3>
                        <p className="text-theme-text-secondary mt-2">
                          撮影会の詳細はメッセージ機能でご確認いただけます
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <AlertDialogFooter className="border-t border-border pt-4">
                {currentStep === 'select' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="border-border text-theme-text-secondary"
                    >
                      戻る
                    </Button>
                    <Button
                      onClick={() =>
                        hasSlots ? transitionToStep('confirm') : handleBooking()
                      }
                      disabled={hasSlots && !selectedSlotId}
                      className="surface-primary"
                    >
                      {hasSlots ? (
                        <>
                          次へ
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      ) : (
                        '予約する'
                      )}
                    </Button>
                  </div>
                )}

                {currentStep === 'confirm' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => transitionToStep('select')}
                      className="border-border text-theme-text-secondary"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      戻る
                    </Button>
                    <Button
                      onClick={handleBooking}
                      disabled={isBooking}
                      className="surface-primary"
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
                )}

                {currentStep === 'complete' && (
                  <Button
                    onClick={handleComplete}
                    className="w-full surface-accent"
                  >
                    完了
                  </Button>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      };
      Component.displayName = 'DesktopStepFlow';
      return Component;
    },
    // 依存関係を最小化: slots, sessionは必要なので追加
    [
      isOpen,
      onClose,
      currentStep,
      hasSlots,
      selectedSlotId,
      handleBooking,
      transitionToStep,
      handleComplete,
      handleSlotSelect,
      isBooking,
      slots, // slotsは必要
      session, // sessionは必要
    ]
  );

  // スマホ用ActionSheetコンポーネント（メモ化）
  const MobileActionSheet = useCallback(() => {
    const actionButtons: ActionButton[] = [];

    if (hasSlots) {
      // スロット制の場合
      slots.forEach((slot, index) => {
        const isSlotFull = slot.current_participants >= slot.max_participants;
        const slotStartTime = new Date(slot.start_time);
        const slotEndTime = new Date(slot.end_time);

        if (!isSlotFull) {
          actionButtons.push({
            id: slot.id,
            label: `枠 ${index + 1} - ${formatTimeString(slotStartTime)} - ${formatTimeString(slotEndTime)} (${formatPriceString(slot.price_per_person)})`,
            onClick: () => {
              setSelectedSlotId(slot.id);
              // ActionSheetを閉じて確認ダイアログを表示
              transitionToStep('confirm');
            },
            variant: 'default',
          });
        }
      });
    } else {
      // 通常撮影会の場合
      actionButtons.push({
        id: 'book-session',
        label: `予約する - ${session.title} (${formatPriceString(session.price_per_person)})`,
        onClick: () => {
          // 直接予約処理
          transitionToStep('confirm');
        },
        variant: 'default',
      });
    }

    return (
      <>
        <ActionSheet
          trigger={<div />}
          open={isOpen && currentStep === 'select'}
          onOpenChange={open => {
            if (!open) onClose();
          }}
          title={hasSlots ? '時間枠を選択' : '予約確認'}
          description={
            hasSlots
              ? 'ご希望の時間枠を選択してください'
              : '以下の撮影会を予約しますか？'
          }
          actions={actionButtons}
          maxColumns={1}
        />

        {/* 確認ダイアログ（モバイル用） */}
        <AlertDialog
          open={currentStep === 'confirm'}
          onOpenChange={open => {
            if (!open) {
              transitionToStep('select');
              setSelectedSlotId(null);
            }
          }}
        >
          <AlertDialogContent className="max-w-sm surface-neutral">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-theme-text-primary">
                予約確認
              </AlertDialogTitle>
              <AlertDialogDescription className="text-theme-text-secondary">
                内容をご確認の上、予約を確定してください
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div>
                <div className="font-medium text-theme-text-primary">
                  撮影会
                </div>
                <div className="text-sm text-theme-text-secondary">
                  {session.title}
                </div>
              </div>

              {selectedSlot && (
                <div>
                  <div className="font-medium text-theme-text-primary">
                    選択した時間枠
                  </div>
                  <div className="text-sm text-theme-text-secondary">
                    枠 {selectedSlot.slot_number}:{' '}
                    <FormattedDateTime
                      value={new Date(selectedSlot.start_time)}
                      format="time-range"
                      endValue={new Date(selectedSlot.end_time)}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="font-medium text-theme-text-primary">料金</div>
                <div className="text-sm text-theme-text-secondary">
                  {(selectedSlot?.price_per_person ||
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
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  transitionToStep('select');
                  setSelectedSlotId(null);
                }}
                className="text-theme-text-secondary border-border"
              >
                戻る
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBooking}
                disabled={isBooking}
                className="surface-primary"
              >
                {isBooking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    予約中...
                  </>
                ) : (
                  '予約確定'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 完了ダイアログ（モバイル用） */}
        <AlertDialog open={currentStep === 'complete'} onOpenChange={() => {}}>
          <AlertDialogContent className="max-w-sm surface-neutral">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-theme-text-primary">
                予約完了
              </AlertDialogTitle>
              <AlertDialogDescription className="text-theme-text-secondary">
                予約が正常に完了しました
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="text-center py-4">
              <div className="w-12 h-12 surface-accent rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-sm text-theme-text-secondary">
                撮影会の詳細はメッセージ機能でご確認いただけます
              </p>
            </div>

            <AlertDialogFooter>
              <Button
                onClick={handleComplete}
                className="w-full surface-accent"
              >
                完了
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }, [
    hasSlots,
    slots,
    session,
    isOpen,
    currentStep,
    onClose,
    transitionToStep,
    selectedSlot,
    handleBooking,
    isBooking,
    handleComplete,
    formatTimeString,
    formatPriceString,
  ]);

  // レスポンシブに応じてコンポーネントを切り替え
  return isMobile ? <MobileActionSheet /> : <DesktopStepFlow />;
});

// スロットカードコンポーネント（メモ化）
const SlotCard = memo(
  function SlotCard({
    slot,
    index,
    isSelected,
    onSelect,
  }: {
    slot: PhotoSessionSlot;
    index: number;
    isSelected: boolean;
    onSelect: (slotId: string) => void;
  }) {
    const isSlotFull = slot.current_participants >= slot.max_participants;
    const slotStartTime = useMemo(
      () => new Date(slot.start_time),
      [slot.start_time]
    );
    const slotEndTime = useMemo(() => new Date(slot.end_time), [slot.end_time]);

    const handleClick = useCallback(() => {
      if (!isSlotFull) {
        onSelect(slot.id);
      }
    }, [isSlotFull, onSelect, slot.id]);

    const cardClassName = useMemo(() => {
      const baseClasses =
        'p-4 border-2 rounded-lg cursor-pointer transition-all duration-200';

      if (isSlotFull) {
        return `${baseClasses} surface-neutral opacity-50 cursor-not-allowed`;
      }

      if (isSelected) {
        return `${baseClasses} surface-primary border-theme-primary`;
      }

      return `${baseClasses} surface-neutral border-border hover:surface-primary hover:border-theme-primary/50`;
    }, [isSlotFull, isSelected]);

    const badgeVariant = useMemo(() => {
      if (isSlotFull) return 'destructive';
      if (isSelected) return 'default';
      return 'outline';
    }, [isSlotFull, isSelected]);

    const badgeText = useMemo(() => {
      if (isSlotFull) return '満席';
      if (isSelected) return '選択中';
      return '空きあり';
    }, [isSlotFull, isSelected]);

    return (
      <div className={cardClassName} onClick={handleClick}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-lg">枠 {index + 1}</h4>
          <Badge variant={badgeVariant} className="text-sm">
            {badgeText}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-theme-text-muted mb-1">
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
              {slot.price_per_person === 0 ? (
                '無料'
              ) : (
                <FormattedPrice value={slot.price_per_person} format="simple" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  // 比較関数を追加: isSelectedの変更のみで再レンダリング
  (prevProps, nextProps) => {
    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.slot.id === nextProps.slot.id &&
      prevProps.slot.current_participants ===
        nextProps.slot.current_participants &&
      prevProps.index === nextProps.index
    );
  }
);

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
