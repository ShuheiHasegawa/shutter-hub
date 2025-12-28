'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getAdminLotteryEntries,
  selectAdminLotteryWinners,
} from '@/app/actions/admin-lottery';
import { logger } from '@/lib/utils/logger';
import { useToast } from '@/hooks/use-toast';
import { Crown, MessageSquare, CheckCircle2, Sparkles } from 'lucide-react';
import type { AdminLotteryEntry } from '@/types/database';

interface AdminLotterySelectionProps {
  adminLotterySessionId: string;
  maxSelections: number;
  slots: Array<{
    id: string;
    slot_number: number;
    max_participants: number;
  }>;
  enableLotteryWeight?: boolean;
  onSelectionComplete?: () => void;
}

interface EntryWithDetails extends AdminLotteryEntry {
  user: {
    id: string;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
  slot?: {
    id: string;
    slot_number: number;
  };
  preferred_model?: {
    id: string;
    display_name: string;
  };
}

export function AdminLotterySelection({
  adminLotterySessionId,
  maxSelections,
  slots,
  enableLotteryWeight = false,
  onSelectionComplete,
}: AdminLotterySelectionProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<EntryWithDetails[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionReason, setSelectionReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  // エントリーを取得
  useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true);
      try {
        const result = await getAdminLotteryEntries(adminLotterySessionId);
        if (result.error) {
          toast({
            title: 'エラー',
            description: result.error,
            variant: 'destructive',
          });
          return;
        }

        const entriesData = (result.data || []) as EntryWithDetails[];
        setEntries(entriesData);

        // 当選確率が有効な場合、上位N名をデフォルトでチェック
        if (enableLotteryWeight && entriesData.length > 0) {
          // スロット別にグループ化
          const entriesBySlot = entriesData.reduce(
            (acc, entry) => {
              const slotId = entry.slot_id || 'no_slot';
              if (!acc[slotId]) {
                acc[slotId] = [];
              }
              acc[slotId].push(entry);
              return acc;
            },
            {} as Record<string, EntryWithDetails[]>
          );

          // 各スロットでlottery_weightが高い順にソート
          Object.keys(entriesBySlot).forEach(slotId => {
            entriesBySlot[slotId].sort((a, b) => {
              const weightA = a.lottery_weight || 1.0;
              const weightB = b.lottery_weight || 1.0;
              return weightB - weightA;
            });
          });

          // 各スロットの上位エントリーを選択（スロットごとの最大参加者数を考慮）
          const defaultSelected: string[] = [];
          slots.forEach(slot => {
            const slotEntries = entriesBySlot[slot.id] || [];
            const appliedSlotEntries = slotEntries.filter(
              e => e.status === 'applied'
            );
            // スロットごとの上限を考慮（全体の上限も考慮）
            const slotMax = Math.min(
              slot.max_participants,
              maxSelections - defaultSelected.length
            );
            const topEntries = appliedSlotEntries.slice(0, slotMax);
            topEntries.forEach(entry => {
              if (defaultSelected.length < maxSelections) {
                defaultSelected.push(entry.id);
              }
            });
          });

          setSelectedEntryIds(defaultSelected);
        }
      } catch (error) {
        logger.error('エントリー取得エラー:', error);
        toast({
          title: 'エラー',
          description: 'エントリーの取得に失敗しました',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [adminLotterySessionId, enableLotteryWeight, maxSelections, slots, toast]);

  // 最初のタブを自動選択
  useEffect(() => {
    if (slots.length > 0 && !activeTab) {
      setActiveTab(slots[0].id);
    }
  }, [slots, activeTab]);

  // スロット別にエントリーをグループ化
  const entriesBySlot = useMemo(() => {
    const grouped: Record<string, EntryWithDetails[]> = {};
    entries.forEach(entry => {
      const slotId = entry.slot_id || 'no_slot';
      if (!grouped[slotId]) {
        grouped[slotId] = [];
      }
      grouped[slotId].push(entry);
    });

    // 各スロットでlottery_weightが高い順にソート
    Object.keys(grouped).forEach(slotId => {
      grouped[slotId].sort((a, b) => {
        if (enableLotteryWeight) {
          const weightA = a.lottery_weight || 1.0;
          const weightB = b.lottery_weight || 1.0;
          return weightB - weightA;
        }
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    });

    return grouped;
  }, [entries, enableLotteryWeight]);

  // 推奨選択を適用（上位N名を自動選択）
  const handleApplyRecommended = () => {
    const recommended: string[] = [];
    slots.forEach(slot => {
      const slotEntries = entriesBySlot[slot.id] || [];
      const appliedSlotEntries = slotEntries.filter(
        e => e.status === 'applied'
      );
      // スロットごとの上限を考慮（全体の上限も考慮）
      const slotMax = Math.min(
        slot.max_participants,
        maxSelections - recommended.length
      );
      const topEntries = appliedSlotEntries.slice(0, slotMax);
      topEntries.forEach(entry => {
        if (recommended.length < maxSelections) {
          recommended.push(entry.id);
        }
      });
    });
    setSelectedEntryIds(recommended.slice(0, maxSelections));
  };

  // 当選者を確定
  const handleConfirmSelection = async () => {
    if (selectedEntryIds.length === 0) {
      toast({
        title: 'エラー',
        description: '当選者を選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsSelecting(true);
    try {
      const result = await selectAdminLotteryWinners({
        session_id: adminLotterySessionId,
        entry_ids: selectedEntryIds,
        selection_reason: selectionReason.trim() || undefined,
      });

      if (result.error) {
        toast({
          title: 'エラー',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '成功',
        description: `${selectedEntryIds.length}名の当選者を確定しました`,
      });

      setShowConfirmDialog(false);
      setSelectionReason('');
      onSelectionComplete?.();
    } catch (error) {
      logger.error('当選者確定エラー:', error);
      toast({
        title: 'エラー',
        description: '当選者の確定に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSelecting(false);
    }
  };

  // 選択済みの当選者数
  const selectedCount = selectedEntryIds.length;
  const remaining = maxSelections - selectedCount;

  // lottery_weightの最大値を計算（視覚化用）
  const maxWeight = useMemo(() => {
    if (!enableLotteryWeight || entries.length === 0) return 1.0;
    return Math.max(...entries.map(e => e.lottery_weight || 1.0), 1.0);
  }, [entries, enableLotteryWeight]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            当選者選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            読み込み中...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            当選者選択
          </CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              選択: {selectedCount} / {maxSelections}名
            </Badge>
            {remaining > 0 && (
              <Badge variant="outline">残り: {remaining}名</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 操作ボタン */}
        <div className="flex gap-2">
          {enableLotteryWeight && (
            <Button
              variant="outline"
              onClick={handleApplyRecommended}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              推奨選択を適用
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setSelectedEntryIds([])}
            disabled={selectedEntryIds.length === 0}
          >
            選択をクリア
          </Button>
          <Button
            variant="cta"
            onClick={() => setShowConfirmDialog(true)}
            disabled={selectedEntryIds.length === 0 || isSelecting}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            選択を確定 ({selectedCount}名)
          </Button>
        </div>

        {/* スロット別タブ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            {slots.map(slot => {
              const slotEntries = entriesBySlot[slot.id] || [];
              // const appliedCount = slotEntries.filter(
              //   e => e.status === 'applied'
              // ).length;
              const selectedCountInSlot = slotEntries.filter(
                e => e.status === 'applied' && selectedEntryIds.includes(e.id)
              ).length;
              return (
                <TabsTrigger
                  key={slot.id}
                  value={slot.id}
                  className="flex items-center gap-2"
                >
                  <span>枠{slot.slot_number}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {slot.max_participants}名まで
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedCountInSlot}/{slot.max_participants}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {slots.map(slot => {
            const slotEntries = entriesBySlot[slot.id] || [];
            const appliedEntries = slotEntries.filter(
              e => e.status === 'applied'
            );
            // このスロットで選択されているエントリー数
            const selectedCountInSlot = appliedEntries.filter(e =>
              selectedEntryIds.includes(e.id)
            ).length;

            return (
              <TabsContent key={slot.id} value={slot.id} className="mt-0">
                {/* デスクトップ表示用テーブル（xl以上） */}
                <div className="hidden xl:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              appliedEntries.length > 0 &&
                              appliedEntries.every(e =>
                                selectedEntryIds.includes(e.id)
                              )
                            }
                            onCheckedChange={checked => {
                              if (checked) {
                                // スロットごとの上限を考慮
                                const availableSlots =
                                  slot.max_participants - selectedCountInSlot;
                                const entriesToAdd = appliedEntries
                                  .map(e => e.id)
                                  .filter(id => !selectedEntryIds.includes(id))
                                  .slice(
                                    0,
                                    Math.min(
                                      availableSlots,
                                      maxSelections - selectedCount
                                    )
                                  );
                                const newSelected = [
                                  ...selectedEntryIds,
                                  ...entriesToAdd,
                                ];
                                setSelectedEntryIds(newSelected);
                              } else {
                                setSelectedEntryIds(
                                  selectedEntryIds.filter(
                                    id => !appliedEntries.some(e => e.id === id)
                                  )
                                );
                              }
                            }}
                            disabled={
                              selectedCountInSlot >= slot.max_participants ||
                              selectedCount >= maxSelections
                            }
                          />
                        </TableHead>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>応募者</TableHead>
                        <TableHead>メールアドレス</TableHead>
                        {enableLotteryWeight && <TableHead>当選確率</TableHead>}
                        <TableHead>推しモデル</TableHead>
                        <TableHead>チェキ</TableHead>
                        <TableHead>応募メッセージ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appliedEntries.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={enableLotteryWeight ? 8 : 7}
                            className="text-center py-8 text-muted-foreground"
                          >
                            応募者がいません
                          </TableCell>
                        </TableRow>
                      ) : (
                        appliedEntries.map((entry, index) => {
                          const isSelected = selectedEntryIds.includes(
                            entry.id
                          );
                          const weight = entry.lottery_weight || 1.0;
                          const weightPercent =
                            enableLotteryWeight && maxWeight > 0
                              ? (weight / maxWeight) * 100
                              : 0;

                          return (
                            <TableRow
                              key={entry.id}
                              className={
                                isSelected
                                  ? 'bg-primary/5 border-primary/20'
                                  : ''
                              }
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={checked => {
                                    if (checked) {
                                      // スロットごとの上限チェック
                                      if (
                                        selectedCountInSlot >=
                                        slot.max_participants
                                      ) {
                                        toast({
                                          title: 'この枠の上限に達しています',
                                          description: `枠${slot.slot_number}は最大${slot.max_participants}名まで選択できます`,
                                          variant: 'destructive',
                                        });
                                        return;
                                      }
                                      // 全体の上限チェック
                                      if (selectedCount >= maxSelections) {
                                        toast({
                                          title: '全体の上限に達しています',
                                          description: `最大${maxSelections}名まで選択できます`,
                                          variant: 'destructive',
                                        });
                                        return;
                                      }
                                      setSelectedEntryIds([
                                        ...selectedEntryIds,
                                        entry.id,
                                      ]);
                                    } else {
                                      setSelectedEntryIds(
                                        selectedEntryIds.filter(
                                          id => id !== entry.id
                                        )
                                      );
                                    }
                                  }}
                                  disabled={
                                    !isSelected &&
                                    (selectedCountInSlot >=
                                      slot.max_participants ||
                                      selectedCount >= maxSelections)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={entry.user?.avatar_url || undefined}
                                    />
                                    <AvatarFallback>
                                      {entry.user?.display_name
                                        ?.charAt(0)
                                        .toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="font-medium">
                                    {entry.user?.display_name || 'Unknown'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {entry.user?.email || '-'}
                                </div>
                              </TableCell>
                              {enableLotteryWeight && (
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">
                                      {weight.toFixed(2)}
                                    </div>
                                    <Progress
                                      value={weightPercent}
                                      className="h-2"
                                    />
                                  </div>
                                </TableCell>
                              )}
                              <TableCell>
                                {entry.preferred_model?.display_name ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {entry.preferred_model.display_name}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.cheki_unsigned_count ||
                                entry.cheki_signed_count ? (
                                  <div className="text-sm">
                                    {(entry.cheki_unsigned_count ?? 0) > 0 && (
                                      <div>
                                        サインなし:{' '}
                                        {entry.cheki_unsigned_count ?? 0}枚
                                      </div>
                                    )}
                                    {(entry.cheki_signed_count ?? 0) > 0 && (
                                      <div>
                                        サインあり:{' '}
                                        {entry.cheki_signed_count ?? 0}枚
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.application_message ? (
                                  <div className="max-w-xs">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                      <MessageSquare className="h-3 w-3" />
                                      メッセージ
                                    </div>
                                    <p className="text-sm line-clamp-2">
                                      {entry.application_message}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* モバイル・タブレット表示用の詳細カード（xl未満の画面） */}
                <div className="xl:hidden space-y-3">
                  {/* モバイル用全選択チェックボックス */}
                  {appliedEntries.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={
                          appliedEntries.length > 0 &&
                          appliedEntries.every(e =>
                            selectedEntryIds.includes(e.id)
                          )
                        }
                        onCheckedChange={checked => {
                          if (checked) {
                            // スロットごとの上限を考慮
                            const availableSlots =
                              slot.max_participants - selectedCountInSlot;
                            const entriesToAdd = appliedEntries
                              .map(e => e.id)
                              .filter(id => !selectedEntryIds.includes(id))
                              .slice(
                                0,
                                Math.min(
                                  availableSlots,
                                  maxSelections - selectedCount
                                )
                              );
                            const newSelected = [
                              ...selectedEntryIds,
                              ...entriesToAdd,
                            ];
                            setSelectedEntryIds(newSelected);
                          } else {
                            setSelectedEntryIds(
                              selectedEntryIds.filter(
                                id => !appliedEntries.some(e => e.id === id)
                              )
                            );
                          }
                        }}
                        disabled={
                          selectedCountInSlot >= slot.max_participants ||
                          selectedCount >= maxSelections
                        }
                      />
                      <span className="text-sm font-medium">
                        この枠を全て選択
                      </span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {selectedCountInSlot}/{slot.max_participants}
                      </Badge>
                    </div>
                  )}
                  {appliedEntries.map((entry, index) => {
                    const isSelected = selectedEntryIds.includes(entry.id);
                    const weight = entry.lottery_weight || 1.0;
                    const weightPercent =
                      enableLotteryWeight && maxWeight > 0
                        ? (weight / maxWeight) * 100
                        : 0;

                    return (
                      <Card
                        key={entry.id}
                        className={`p-4 ${
                          isSelected ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={checked => {
                              if (checked) {
                                // スロットごとの上限チェック
                                if (
                                  selectedCountInSlot >= slot.max_participants
                                ) {
                                  toast({
                                    title: 'この枠の上限に達しています',
                                    description: `枠${slot.slot_number}は最大${slot.max_participants}名まで選択できます`,
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                // 全体の上限チェック
                                if (selectedCount >= maxSelections) {
                                  toast({
                                    title: '全体の上限に達しています',
                                    description: `最大${maxSelections}名まで選択できます`,
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                setSelectedEntryIds([
                                  ...selectedEntryIds,
                                  entry.id,
                                ]);
                              } else {
                                setSelectedEntryIds(
                                  selectedEntryIds.filter(id => id !== entry.id)
                                );
                              }
                            }}
                            disabled={
                              !isSelected &&
                              (selectedCountInSlot >= slot.max_participants ||
                                selectedCount >= maxSelections)
                            }
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                {index + 1}
                              </span>
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={entry.user?.avatar_url || undefined}
                                />
                                <AvatarFallback>
                                  {entry.user?.display_name
                                    ?.charAt(0)
                                    .toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {entry.user?.display_name || 'Unknown'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {entry.user?.email || '-'}
                                </div>
                              </div>
                            </div>
                            {enableLotteryWeight && (
                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  当選確率: {weight.toFixed(2)}
                                </div>
                                <Progress
                                  value={weightPercent}
                                  className="h-2"
                                />
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              {entry.preferred_model?.display_name && (
                                <Badge variant="secondary" className="text-xs">
                                  推し: {entry.preferred_model.display_name}
                                </Badge>
                              )}
                              {(entry.cheki_unsigned_count ||
                                entry.cheki_signed_count) && (
                                <Badge variant="outline" className="text-xs">
                                  チェキ: サインなし
                                  {entry.cheki_unsigned_count ?? 0}枚
                                  {(entry.cheki_signed_count ?? 0) > 0 &&
                                    ` / サインあり${entry.cheki_signed_count ?? 0}枚`}
                                </Badge>
                              )}
                            </div>
                            {entry.application_message && (
                              <div className="bg-muted p-2 rounded text-sm">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <MessageSquare className="h-3 w-3" />
                                  応募メッセージ
                                </div>
                                <p className="line-clamp-2">
                                  {entry.application_message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* 確定ダイアログ */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>当選者を確定しますか？</DialogTitle>
              <DialogDescription>
                {selectedCount}
                名の当選者を確定します。この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="selection-reason">選択理由（任意）</Label>
                <Textarea
                  id="selection-reason"
                  value={selectionReason}
                  onChange={e => setSelectionReason(e.target.value)}
                  placeholder="選択理由を入力してください（任意）"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {selectionReason.length}/500
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                キャンセル
              </Button>
              <Button
                variant="cta"
                onClick={handleConfirmSelection}
                disabled={isSelecting}
                className="gap-2"
              >
                {isSelecting ? (
                  '確定中...'
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    確定する
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
