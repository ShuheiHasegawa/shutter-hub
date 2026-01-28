'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  createMultiSlotLotteryEntry,
  updateMultiSlotLotteryEntry,
} from '@/app/actions/multi-slot-lottery';
import { getPhotoSessionModelsAction } from '@/app/actions/photo-session-models';
import type {
  LotterySessionWithSettings,
  SlotEntryData,
  CancellationPolicy,
  LotteryEntryGroup,
  LotterySlotEntry,
} from '@/types/multi-slot-lottery';
import type { PhotoSessionSlot } from '@/types/photo-session';
import { Plus, Minus, ArrowLeft, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import { ActionBar, ActionBarSpacer } from '@/components/ui/action-bar';

interface MultiSlotLotteryEntryFormProps {
  lotterySession: LotterySessionWithSettings;
  slots: PhotoSessionSlot[];
  organizerId: string;
  photoSessionId: string;
  existingEntry?: {
    group: LotteryEntryGroup;
    slot_entries: LotterySlotEntry[];
  } | null;
  onEntrySuccess?: () => void;
  onCancel?: () => void;
  entryCount?: {
    entries_by_slot: Array<{
      slot_id: string;
      slot_number: number;
      entry_count: number;
    }>;
    max_entries: number | null;
  } | null;
}

export function MultiSlotLotteryEntryForm({
  lotterySession,
  slots,
  organizerId: _organizerId,
  photoSessionId,
  existingEntry,
  onEntrySuccess,
  onCancel,
  entryCount,
}: MultiSlotLotteryEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? ja : enUS;

  // 既存エントリーがある場合は初期値を設定
  const initialSelectedSlotIds = existingEntry
    ? new Set(existingEntry.slot_entries.map(entry => entry.slot_id))
    : new Set<string>();

  const initialSlotEntries = existingEntry
    ? existingEntry.slot_entries.reduce(
        (acc, entry) => {
          acc[entry.slot_id] = {
            slot_id: entry.slot_id,
            preferred_model_id: entry.preferred_model_id || undefined,
            cheki_unsigned_count: entry.cheki_unsigned_count || 0,
            cheki_signed_count: entry.cheki_signed_count || 0,
          };
          return acc;
        },
        {} as Record<string, SlotEntryData>
      )
    : {};

  const initialCancellationPolicy = existingEntry
    ? existingEntry.group.cancellation_policy
    : 'partial_ok';

  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(
    initialSelectedSlotIds
  );
  const [slotEntries, setSlotEntries] =
    useState<Record<string, SlotEntryData>>(initialSlotEntries);
  const [cancellationPolicy, setCancellationPolicy] =
    useState<CancellationPolicy>(initialCancellationPolicy);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionModels, setSessionModels] = useState<
    Array<{
      model_id: string;
      display_name: string;
      avatar_url?: string;
    }>
  >([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // 既存エントリーかどうか
  const isUpdateMode = !!existingEntry;
  const remainingUpdates = existingEntry
    ? Math.max(0, 3 - (existingEntry.group.update_count || 0))
    : 3;

  // 撮影会に紐づくモデルを取得
  useEffect(() => {
    if (
      lotterySession.enable_model_selection &&
      photoSessionId &&
      sessionModels.length === 0 &&
      !isLoadingModels
    ) {
      setIsLoadingModels(true);
      getPhotoSessionModelsAction(photoSessionId)
        .then(result => {
          if (result && result.success && result.models) {
            setSessionModels(result.models);
          } else {
            logger.warn('モデル情報が取得できませんでした:', result?.error);
            setSessionModels([]);
          }
        })
        .catch(error => {
          logger.error('モデル取得エラー:', error);
          setSessionModels([]);
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotterySession.enable_model_selection, photoSessionId]);

  // スロットがエントリー上限に達しているかチェック
  const isSlotEntryFull = useCallback(
    (slotId: string) => {
      if (
        !entryCount ||
        entryCount.max_entries === null ||
        entryCount.max_entries === undefined
      ) {
        return false;
      }

      const slotEntry = entryCount.entries_by_slot.find(
        e => e.slot_id === slotId
      );
      return slotEntry && slotEntry.entry_count >= entryCount.max_entries;
    },
    [entryCount]
  );

  // スロット選択のトグル
  const toggleSlot = useCallback(
    (slotId: string) => {
      // エントリー上限に達している場合は選択不可
      if (isSlotEntryFull(slotId)) {
        toast({
          title: 'エントリー上限',
          description: 'この枠のエントリー上限に達しています',
          variant: 'destructive',
        });
        return;
      }

      setSelectedSlotIds(prev => {
        const isCurrentlySelected = prev.has(slotId);
        const newSelected = new Set(prev);

        if (isCurrentlySelected) {
          // 選択解除
          newSelected.delete(slotId);
          setSlotEntries(prevEntries => {
            const newEntries = { ...prevEntries };
            delete newEntries[slotId];
            return newEntries;
          });
        } else {
          // 選択追加
          newSelected.add(slotId);
          setSlotEntries(prevEntries => ({
            ...prevEntries,
            [slotId]: {
              slot_id: slotId,
              preferred_model_id: undefined,
              cheki_unsigned_count: 0,
              cheki_signed_count: 0,
            },
          }));
        }

        return newSelected;
      });
    },
    [isSlotEntryFull, toast]
  );

  // スロットエントリーデータの更新
  const updateSlotEntry = (slotId: string, updates: Partial<SlotEntryData>) => {
    setSlotEntries(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        ...updates,
      },
    }));
  };

  // チェキ枚数の増減
  const adjustChekiCount = (
    slotId: string,
    type: 'unsigned' | 'signed',
    delta: number
  ) => {
    const entry = slotEntries[slotId];
    if (!entry) return;

    const currentCount =
      type === 'unsigned'
        ? entry.cheki_unsigned_count
        : entry.cheki_signed_count;
    const newCount = Math.max(0, currentCount + delta);

    updateSlotEntry(slotId, {
      [type === 'unsigned' ? 'cheki_unsigned_count' : 'cheki_signed_count']:
        newCount,
    });
  };

  // エントリー送信
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!user) {
      toast({
        title: t('loginRequired'),
        description: t('loginRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (selectedSlotIds.size === 0) {
      toast({
        title: tErrors('title'),
        description: '少なくとも1つの枠を選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // デバッグ: lotterySessionの内容を確認
      logger.debug('エントリー送信前のlotterySession確認', {
        lottery_session_id: lotterySession.id,
        entry_start_time: lotterySession.entry_start_time,
        entry_end_time: lotterySession.entry_end_time,
        status: lotterySession.status,
      });

      const slotEntriesArray = Array.from(selectedSlotIds).map(
        slotId => slotEntries[slotId]
      );

      const entryData = {
        lottery_session_id: lotterySession.id,
        slot_entries: slotEntriesArray,
        cancellation_policy: cancellationPolicy,
        message: message.trim() || undefined,
      };

      // 既存エントリーがある場合は更新、ない場合は新規作成
      const result = isUpdateMode
        ? await updateMultiSlotLotteryEntry(entryData)
        : await createMultiSlotLotteryEntry(entryData);

      if (!result.success) {
        logger.error('エントリー失敗', {
          error: result.error,
          lottery_session_id: lotterySession.id,
          entry_start_time: lotterySession.entry_start_time,
          entry_end_time: lotterySession.entry_end_time,
          isUpdateMode,
        });
        toast({
          title: tErrors('title'),
          description: result.error || 'エントリーに失敗しました',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: isUpdateMode
          ? '抽選エントリーを更新しました'
          : '抽選エントリーが完了しました',
      });

      setMessage('');
      setSelectedSlotIds(new Set());
      setSlotEntries({});
      onEntrySuccess?.();
    } catch (error) {
      logger.error('複数スロット抽選エントリーエラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 当選確率の推定（簡易版）
  const estimateProbability = () => {
    if (!lotterySession.enable_lottery_weight) {
      return null;
    }

    const selectedCount = selectedSlotIds.size;
    if (selectedCount === 0) return null;

    // 簡易計算: 応募数に応じた重みを考慮
    const baseWeight = 1.0;
    const weightMultiplier = lotterySession.weight_multiplier || 1.0;
    const calculatedWeight =
      lotterySession.weight_calculation_method === 'linear'
        ? selectedCount * weightMultiplier
        : baseWeight + (selectedCount - 1) * weightMultiplier;

    // 仮のエントリー数（実際には取得が必要）
    const estimatedEntries = 100; // 仮の値
    const estimatedWinners = 50; // 仮の値

    // 重み付き確率の簡易計算
    const probability =
      (calculatedWeight / (estimatedEntries * baseWeight)) * estimatedWinners;
    return Math.min(100, Math.max(0, probability * 100));
  };

  const estimatedProb = estimateProbability();

  // チェキ合計枚数
  const totalCheki = Object.values(slotEntries).reduce(
    (sum, entry) =>
      sum + (entry.cheki_unsigned_count || 0) + (entry.cheki_signed_count || 0),
    0
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* ステップインジケーター */}
      <div className="space-y-4 py-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-theme-text-muted">
            <span>ステップ 1 / 1</span>
            <span className="font-medium text-theme-text-primary">
              {isUpdateMode ? '抽選エントリー更新' : '抽選エントリー'}
            </span>
          </div>
          <Progress value={100} className="h-2 bg-surface-neutral" />
        </div>
        {/* 変更回数表示（更新モードの場合） */}
        {isUpdateMode && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">変更回数</span>
            <Badge
              variant={remainingUpdates === 0 ? 'destructive' : 'secondary'}
            >
              {existingEntry.group.update_count || 0}回 / 最大3回
            </Badge>
            {remainingUpdates === 0 && (
              <span className="text-xs text-destructive ml-2">
                これ以上変更できません
              </span>
            )}
          </div>
        )}
      </div>

      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-lg">複数枠抽選エントリー</CardTitle>
          <CardDescription>
            複数の枠に同時にエントリーできます。応募数が多いほど当選確率が高くなります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            id="lottery-entry-form"
          >
            {/* スロット選択 */}
            <div className="space-y-4">
              <Label className="text-base font-medium">応募する枠を選択</Label>
              <div className="grid gap-4">
                {slots.map(slot => {
                  const isSelected = selectedSlotIds.has(slot.id);
                  const entry = slotEntries[slot.id];
                  const isEntryFull = isSlotEntryFull(slot.id);
                  const isDisabled = isEntryFull;

                  return (
                    <Card
                      key={slot.id}
                      className={`transition-all ${
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed bg-card-neutral-1'
                          : isSelected
                            ? 'cursor-pointer border-primary bg-primary/5'
                            : 'cursor-pointer border-border hover:border-primary/50'
                      }`}
                      onClick={e => {
                        if (isDisabled) {
                          return;
                        }
                        // 詳細設定エリアやCheckboxがクリックされた場合は無視
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('[role="checkbox"]') ||
                          target.closest('button') ||
                          target.closest('input') ||
                          target.closest('[role="combobox"]') ||
                          target.closest('[data-radix-select-trigger]') ||
                          target.closest('[data-radix-select-content]')
                        ) {
                          return;
                        }
                        toggleSlot(slot.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                id={`slot-${slot.id}`}
                                checked={isSelected}
                                disabled={isDisabled}
                                onCheckedChange={() => toggleSlot(slot.id)}
                                onClick={e => e.stopPropagation()}
                              />
                              <Label
                                htmlFor={`slot-${slot.id}`}
                                className={`text-base font-semibold ${
                                  isDisabled
                                    ? 'cursor-not-allowed'
                                    : 'cursor-pointer'
                                }`}
                              >
                                枠{slot.slot_number}
                              </Label>
                              <Badge variant="outline">
                                {format(new Date(slot.start_time), 'HH:mm', {
                                  locale: dateLocale,
                                })}
                                {' - '}
                                {format(new Date(slot.end_time), 'HH:mm', {
                                  locale: dateLocale,
                                })}
                              </Badge>
                              {isEntryFull && (
                                <Badge
                                  variant="destructive"
                                  className="text-sm"
                                >
                                  エントリー上限
                                </Badge>
                              )}
                            </div>
                            {slot.costume_description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {slot.costume_description}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              定員: {slot.max_participants}名 / 料金: ¥
                              {slot.price_per_person?.toLocaleString()}
                            </p>

                            {/* 枠詳細設定（選択時のみ表示） */}
                            {isSelected &&
                              ((lotterySession.enable_model_selection &&
                                (lotterySession.model_selection_scope ===
                                  'per_slot' ||
                                  selectedSlotIds.size === 1)) ||
                                (lotterySession.enable_cheki_selection &&
                                  lotterySession.cheki_selection_scope ===
                                    'per_slot')) && (
                                <div
                                  className="mt-4 space-y-4 pt-4 border-t"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {/* 推しモデル選択 */}
                                  {lotterySession.enable_model_selection &&
                                    (lotterySession.model_selection_scope ===
                                      'per_slot' ||
                                      selectedSlotIds.size === 1) && (
                                      <div className="space-y-2">
                                        <Label className="text-sm">
                                          推しモデル（{t('optional')}）
                                        </Label>
                                        <Select
                                          value={
                                            entry?.preferred_model_id || 'none'
                                          }
                                          onValueChange={value =>
                                            updateSlotEntry(slot.id, {
                                              preferred_model_id:
                                                value === 'none'
                                                  ? undefined
                                                  : value,
                                            })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="推しモデルを選択" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">
                                              選択しない
                                            </SelectItem>
                                            {sessionModels.map(model => (
                                              <SelectItem
                                                key={model.model_id}
                                                value={model.model_id}
                                              >
                                                {model.display_name ||
                                                  'Unknown'}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                  {/* チェキ枚数選択（枠ごと） */}
                                  {lotterySession.enable_cheki_selection &&
                                    lotterySession.cheki_selection_scope ===
                                      'per_slot' && (
                                      <div
                                        className="space-y-4"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <Label className="text-sm">
                                          チェキ枚数
                                        </Label>
                                        <div className="grid grid-cols-2 gap-4">
                                          {/* サインなし */}
                                          <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">
                                              サインなし
                                            </Label>
                                            <div className="flex items-center gap-2">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  adjustChekiCount(
                                                    slot.id,
                                                    'unsigned',
                                                    -1
                                                  );
                                                }}
                                              >
                                                <Minus className="h-4 w-4" />
                                              </Button>
                                              <Input
                                                type="number"
                                                min="0"
                                                value={
                                                  entry?.cheki_unsigned_count ||
                                                  0
                                                }
                                                onChange={e => {
                                                  const value =
                                                    parseInt(e.target.value) ||
                                                    0;
                                                  updateSlotEntry(slot.id, {
                                                    cheki_unsigned_count:
                                                      Math.max(0, value),
                                                  });
                                                }}
                                                onClick={e =>
                                                  e.stopPropagation()
                                                }
                                                className="w-16 text-center"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  adjustChekiCount(
                                                    slot.id,
                                                    'unsigned',
                                                    1
                                                  );
                                                }}
                                              >
                                                <Plus className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>

                                          {/* サインあり */}
                                          <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">
                                              サインあり
                                            </Label>
                                            <div className="flex items-center gap-2">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  adjustChekiCount(
                                                    slot.id,
                                                    'signed',
                                                    -1
                                                  );
                                                }}
                                              >
                                                <Minus className="h-4 w-4" />
                                              </Button>
                                              <Input
                                                type="number"
                                                min="0"
                                                value={
                                                  entry?.cheki_signed_count || 0
                                                }
                                                onChange={e => {
                                                  const value =
                                                    parseInt(e.target.value) ||
                                                    0;
                                                  updateSlotEntry(slot.id, {
                                                    cheki_signed_count:
                                                      Math.max(0, value),
                                                  });
                                                }}
                                                onClick={e =>
                                                  e.stopPropagation()
                                                }
                                                className="w-16 text-center"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  adjustChekiCount(
                                                    slot.id,
                                                    'signed',
                                                    1
                                                  );
                                                }}
                                              >
                                                <Plus className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 推しモデル選択（撮影会全体） */}
            {lotterySession.enable_model_selection &&
              lotterySession.model_selection_scope === 'session_wide' &&
              selectedSlotIds.size > 0 && (
                <div className="space-y-2">
                  <Label>推しモデル（{t('optional')}）</Label>
                  <Select
                    value={
                      Object.values(slotEntries)[0]?.preferred_model_id ||
                      'none'
                    }
                    onValueChange={value => {
                      const modelId = value === 'none' ? undefined : value;
                      // 全スロットに同じモデルを設定
                      setSlotEntries(prev => {
                        const newEntries = { ...prev };
                        Object.keys(newEntries).forEach(slotId => {
                          newEntries[slotId] = {
                            ...newEntries[slotId],
                            preferred_model_id: modelId,
                          };
                        });
                        return newEntries;
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="推しモデルを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">選択しない</SelectItem>
                      {sessionModels.map(model => (
                        <SelectItem key={model.model_id} value={model.model_id}>
                          {model.display_name || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {/* チェキ合計表示（total_onlyの場合） */}
            {lotterySession.enable_cheki_selection &&
              lotterySession.cheki_selection_scope === 'total_only' &&
              selectedSlotIds.size > 0 && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <Label className="text-base font-medium">
                    チェキ枚数（合計）
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        サインなし
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const total = Object.values(slotEntries).reduce(
                              (sum, entry) =>
                                sum + (entry.cheki_unsigned_count || 0),
                              0
                            );
                            if (total > 0) {
                              Object.keys(slotEntries).forEach(slotId => {
                                const entry = slotEntries[slotId];
                                const current = entry.cheki_unsigned_count || 0;
                                const newValue = Math.max(0, current - 1);
                                updateSlotEntry(slotId, {
                                  cheki_unsigned_count: newValue,
                                });
                              });
                            }
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={Object.values(slotEntries).reduce(
                            (sum, entry) =>
                              sum + (entry.cheki_unsigned_count || 0),
                            0
                          )}
                          readOnly
                          className="w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            // 最初のスロットに追加
                            const firstSlotId = Array.from(selectedSlotIds)[0];
                            if (firstSlotId) {
                              adjustChekiCount(firstSlotId, 'unsigned', 1);
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        サインあり
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const total = Object.values(slotEntries).reduce(
                              (sum, entry) =>
                                sum + (entry.cheki_signed_count || 0),
                              0
                            );
                            if (total > 0) {
                              Object.keys(slotEntries).forEach(slotId => {
                                const entry = slotEntries[slotId];
                                const current = entry.cheki_signed_count || 0;
                                const newValue = Math.max(0, current - 1);
                                updateSlotEntry(slotId, {
                                  cheki_signed_count: newValue,
                                });
                              });
                            }
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={Object.values(slotEntries).reduce(
                            (sum, entry) =>
                              sum + (entry.cheki_signed_count || 0),
                            0
                          )}
                          readOnly
                          className="w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            // 最初のスロットに追加
                            const firstSlotId = Array.from(selectedSlotIds)[0];
                            if (firstSlotId) {
                              adjustChekiCount(firstSlotId, 'signed', 1);
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    合計: {totalCheki}枚
                  </p>
                </div>
              )}

            {/* キャンセルポリシー選択 */}
            <div className="space-y-4 p-4 border rounded-lg">
              <Label className="text-base font-medium">
                部分落選時のキャンセルポリシー
              </Label>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    id="policy_partial"
                    name="cancellation_policy"
                    value="partial_ok"
                    checked={cancellationPolicy === 'partial_ok'}
                    onChange={() => setCancellationPolicy('partial_ok')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="policy_partial"
                      className="font-medium cursor-pointer"
                    >
                      B. 一部落選しても当選した部があれば参加したい
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      一部の枠が落選しても、当選した枠には参加します。
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    id="policy_all"
                    name="cancellation_policy"
                    value="all_or_nothing"
                    checked={cancellationPolicy === 'all_or_nothing'}
                    onChange={() => setCancellationPolicy('all_or_nothing')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="policy_all"
                      className="font-medium cursor-pointer"
                    >
                      A. 一部でも落選の場合は全てキャンセルしたい
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      応募した全ての枠が当選しない場合、全てキャンセルします。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 当選確率表示 */}
            {estimatedProb !== null && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">推定当選確率</span>
                  <Badge variant="secondary" className="text-lg">
                    {estimatedProb.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedSlotIds.size}枠応募により、当選確率が
                  {lotterySession.weight_calculation_method === 'linear'
                    ? `${selectedSlotIds.size}倍`
                    : '向上'}
                  しています
                </p>
              </div>
            )}

            {/* メッセージ */}
            <div className="space-y-2">
              <Label>
                {t('applicationMessage')} ({t('optional')})
              </Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('applicationMessagePlaceholder')}
                rows={4}
                maxLength={500}
                disabled={isSubmitting}
              />
              <div className="text-xs text-muted-foreground">
                {message.length}/500
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* アクションバー */}
      <ActionBarSpacer />
      <ActionBar
        actions={[
          ...(onCancel
            ? [
                {
                  id: 'cancel',
                  label: '戻る',
                  variant: 'neutral' as const,
                  onClick: onCancel,
                  icon: <ArrowLeft className="h-4 w-4" />,
                },
              ]
            : []),
          {
            id: 'submit',
            label:
              selectedSlotIds.size > 0
                ? `${selectedSlotIds.size}枠でエントリー`
                : 'エントリー',
            variant: 'cta' as const,
            onClick: () => {
              // フォーム送信をトリガー
              handleSubmit();
            },
            disabled: isSubmitting || selectedSlotIds.size === 0,
            loading: isSubmitting,
            icon: <Check className="h-4 w-4" />,
          },
        ]}
        maxColumns={2}
        background="blur"
      />
    </div>
  );
}
