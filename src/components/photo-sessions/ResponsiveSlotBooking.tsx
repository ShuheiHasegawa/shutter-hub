'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
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
import { formatTimeLocalized, formatDateLocalized } from '@/lib/utils/date';
import { createSlotBooking } from '@/lib/photo-sessions/slots';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import { useToast } from '@/hooks/use-toast';

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

export function ResponsiveSlotBooking({
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { toast } = useToast();

  const hasSlots = slots && slots.length > 0;

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
      setIsTransitioning(false);
    }
  }, [isOpen]);

  // スムーズなステップ遷移関数
  const transitionToStep = (nextStep: BookingStep) => {
    setIsTransitioning(true);
    // 短いディレイでスムーズな遷移
    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsTransitioning(false);
    }, 150);
  };

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
    onClose();
    // ページをリロードして最新の状態を反映
    window.location.reload();
  };

  // 選択されたスロットの取得
  const selectedSlot = useMemo(
    () => (selectedSlotId ? slots.find(s => s.id === selectedSlotId) : null),
    [selectedSlotId, slots]
  );

  // スロット選択ハンドラーをメモ化
  const handleSlotSelect = useCallback((slotId: string) => {
    setSelectedSlotId(slotId);
  }, []);

  // PC用ステップ式コンポーネント
  const DesktopStepFlow = () => (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden dark:bg-gray-900 dark:border-gray-700">
        {/* トランジション中のオーバーレイ */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* ステップインジケーター */}
        <div className="flex items-center justify-center space-x-8 py-4 border-b dark:border-gray-700">
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
                      ? 'bg-green-500 text-white dark:bg-green-600'
                      : isActive
                        ? 'bg-blue-500 text-white dark:bg-blue-600'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
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
                      ? 'text-blue-600 dark:text-blue-400'
                      : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
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
            <AlertDialogTitle className="dark:text-white">
              {currentStep === 'select' &&
                (hasSlots ? '時間枠を選択' : '予約確認')}
              {currentStep === 'confirm' && '予約内容の確認'}
              {currentStep === 'complete' && '予約完了'}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
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
              <div className="space-y-3">
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
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg dark:text-white">
                      予約内容
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                  <div>
                    • 予約のキャンセルは撮影会開始の24時間前まで可能です
                  </div>
                  <div>• 遅刻される場合は主催者にご連絡ください</div>
                  <div>• 体調不良の場合は無理をせず参加をお控えください</div>
                </div>
              </div>
            )}

            {/* ステップ3: 完了 */}
            {currentStep === 'complete' && (
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
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter className="border-t dark:border-gray-700 pt-4">
          {currentStep === 'select' && (
            <>
              <AlertDialogCancel className="dark:text-gray-300 dark:border-gray-600">
                キャンセル
              </AlertDialogCancel>
              <Button
                onClick={() =>
                  hasSlots ? transitionToStep('confirm') : handleBooking()
                }
                disabled={(hasSlots && !selectedSlotId) || isTransitioning}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
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
            </>
          )}

          {currentStep === 'confirm' && (
            <>
              <Button
                variant="outline"
                onClick={() => transitionToStep('select')}
                disabled={isTransitioning}
                className="dark:border-gray-600 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <Button
                onClick={handleBooking}
                disabled={isBooking || isTransitioning}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
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
            </>
          )}

          {currentStep === 'complete' && (
            <Button
              onClick={handleComplete}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
            >
              完了
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // スマホ用ActionSheetコンポーネント
  const MobileActionSheet = () => {
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
            label: `枠 ${index + 1} - ${formatTimeLocalized(slotStartTime, 'ja')} - ${formatTimeLocalized(slotEndTime, 'ja')} (¥${slot.price_per_person.toLocaleString()})`,
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
        label: `予約する - ${session.title} (¥${session.price_per_person.toLocaleString()})`,
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
            if (!open && !isTransitioning) {
              transitionToStep('select');
              setSelectedSlotId(null);
            }
          }}
        >
          <AlertDialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-white">
                予約確認
              </AlertDialogTitle>
              <AlertDialogDescription className="dark:text-gray-300">
                内容をご確認の上、予約を確定してください
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  撮影会
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {session.title}
                </div>
              </div>

              {selectedSlot && (
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    選択した時間枠
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    枠 {selectedSlot.slot_number}:{' '}
                    {formatTimeLocalized(
                      new Date(selectedSlot.start_time),
                      'ja'
                    )}{' '}
                    -{' '}
                    {formatTimeLocalized(new Date(selectedSlot.end_time), 'ja')}
                  </div>
                </div>
              )}

              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  料金
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {(selectedSlot?.price_per_person ||
                    session.price_per_person) === 0
                    ? '無料'
                    : `¥${(selectedSlot?.price_per_person || session.price_per_person).toLocaleString()}`}
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  transitionToStep('select');
                  setSelectedSlotId(null);
                }}
                disabled={isTransitioning}
                className="dark:text-gray-300 dark:border-gray-600"
              >
                戻る
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBooking}
                disabled={isBooking || isTransitioning}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
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
          <AlertDialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-white">
                予約完了
              </AlertDialogTitle>
              <AlertDialogDescription className="dark:text-gray-300">
                予約が正常に完了しました
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                撮影会の詳細はメッセージ機能でご確認いただけます
              </p>
            </div>

            <AlertDialogFooter>
              <Button
                onClick={handleComplete}
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              >
                完了
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  // レスポンシブに応じてコンポーネントを切り替え
  return isMobile ? <MobileActionSheet /> : <DesktopStepFlow />;
}

// スロットカードコンポーネント（メモ化）
const SlotCard = memo(function SlotCard({
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
      return `${baseClasses} bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600`;
    }

    if (isSelected) {
      return `${baseClasses} bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-100`;
    }

    return `${baseClasses} bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 dark:bg-gray-800 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:bg-blue-900/10`;
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
        <h4 className="font-semibold text-lg dark:text-white">
          枠 {index + 1}
        </h4>
        <Badge variant={badgeVariant} className="text-sm">
          {badgeText}
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
    </div>
  );
});

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
