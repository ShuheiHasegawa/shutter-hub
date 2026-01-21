'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ActionBar,
  ActionBarSpacer,
  ActionBarButton,
} from '@/components/ui/action-bar';
import type { LotteryEntryConfirmation as LotteryEntryConfirmationType } from '@/types/multi-slot-lottery';
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Camera,
  AlertCircle,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface LotteryEntryConfirmationProps {
  confirmation: LotteryEntryConfirmationType;
  lotterySession?: {
    cheki_selection_scope?: 'per_slot' | 'total_only';
    entry_end_time?: string;
    status?: string;
  };
  onEdit?: () => void;
}

export function LotteryEntryConfirmation({
  confirmation,
  lotterySession,
  onEdit,
}: LotteryEntryConfirmationProps) {
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? ja : enUS;

  const { group, slot_entries, estimated_probability } = confirmation;

  // チェキ選択範囲の判定
  const chekiSelectionScope =
    lotterySession?.cheki_selection_scope || 'per_slot';
  const isTotalOnlyCheki = chekiSelectionScope === 'total_only';

  // エントリー期間内かどうかを判定（編集ボタンの有効化条件）
  const isWithinEntryPeriod = lotterySession?.entry_end_time
    ? new Date() <= new Date(lotterySession.entry_end_time)
    : false;

  // 抽選実行済みかどうか
  const isLotteryCompleted =
    lotterySession?.status === 'completed' ||
    lotterySession?.status === 'closed';

  // 編集可能かどうか
  const canEdit =
    isWithinEntryPeriod && !isLotteryCompleted && (group.update_count || 0) < 3;

  // アクションバーボタンの定義
  const actionBarButtons: ActionBarButton[] = [];

  if (onEdit) {
    actionBarButtons.push({
      id: 'edit',
      label: '編集',
      variant: 'cta',
      onClick: onEdit,
      disabled: !canEdit,
      icon: <Edit className="h-4 w-4" />,
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            エントリー確認
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* エントリー概要 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">応募枠数</span>
              <Badge variant="secondary">{group.total_slots_applied}枠</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">キャンセルポリシー</span>
              <Badge
                variant={
                  group.cancellation_policy === 'all_or_nothing'
                    ? 'destructive'
                    : 'default'
                }
              >
                {group.cancellation_policy === 'all_or_nothing'
                  ? '全当選のみ参加'
                  : '部分当選でも参加'}
              </Badge>
            </div>
            {/* 変更回数表示 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">変更回数</span>
              <Badge
                variant={
                  (group.update_count || 0) >= 3
                    ? 'destructive'
                    : (group.update_count || 0) > 0
                      ? 'secondary'
                      : 'outline'
                }
              >
                {group.update_count || 0}回 / 最大3回
              </Badge>
            </div>
            {estimated_probability !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">推定当選確率</span>
                <Badge variant="outline" className="text-lg">
                  {estimated_probability.toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>

          {/* スロット詳細 */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">応募枠詳細</h3>
            <div className="space-y-4">
              {slot_entries.map(entry => (
                <Card key={entry.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* スロット情報 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            枠{entry.slot?.slot_number || 'N/A'}
                          </span>
                        </div>
                        <Badge
                          variant={
                            entry.status === 'won'
                              ? 'default'
                              : entry.status === 'lost'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {entry.status === 'won'
                            ? '当選'
                            : entry.status === 'lost'
                              ? '落選'
                              : 'エントリー中'}
                        </Badge>
                      </div>

                      {entry.slot && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(entry.slot.start_time), 'HH:mm', {
                              locale: dateLocale,
                            })}
                            {' - '}
                            {format(new Date(entry.slot.end_time), 'HH:mm', {
                              locale: dateLocale,
                            })}
                          </div>
                          {entry.slot.costume_description && (
                            <span>{entry.slot.costume_description}</span>
                          )}
                        </div>
                      )}

                      {/* 推しモデル */}
                      {entry.preferred_model_id && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            推しモデル:
                          </span>
                          <span className="font-medium">
                            {entry.preferred_model?.display_name || 'Unknown'}
                          </span>
                        </div>
                      )}

                      {/* チェキ枚数（per_slotの場合のみ表示） */}
                      {!isTotalOnlyCheki &&
                        (entry.cheki_unsigned_count > 0 ||
                          entry.cheki_signed_count > 0) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Camera className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              チェキ:
                            </span>
                            {entry.cheki_unsigned_count > 0 && (
                              <span>
                                サインなし {entry.cheki_unsigned_count}枚
                              </span>
                            )}
                            {entry.cheki_unsigned_count > 0 &&
                              entry.cheki_signed_count > 0 && <span> / </span>}
                            {entry.cheki_signed_count > 0 && (
                              <span>
                                サインあり {entry.cheki_signed_count}枚
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* チェキ合計（total_onlyの場合は常に表示、per_slotの場合は合計がある場合のみ表示） */}
          {slot_entries.some(
            entry =>
              (entry.cheki_unsigned_count || 0) > 0 ||
              (entry.cheki_signed_count || 0) > 0
          ) && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isTotalOnlyCheki ? 'チェキ枚数' : 'チェキ合計'}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    サインなし:{' '}
                    {slot_entries.reduce(
                      (sum, entry) => sum + (entry.cheki_unsigned_count || 0),
                      0
                    )}
                    枚
                  </span>
                  <span className="text-sm">
                    サインあり:{' '}
                    {slot_entries.reduce(
                      (sum, entry) => sum + (entry.cheki_signed_count || 0),
                      0
                    )}
                    枚
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 注意事項 */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  エントリー完了
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
                  <li>抽選結果は抽選日時に発表されます</li>
                  {group.cancellation_policy === 'all_or_nothing' && (
                    <li>
                      全枠が当選しない場合、全てのエントリーがキャンセルされます
                    </li>
                  )}
                  {group.cancellation_policy === 'partial_ok' && (
                    <li>一部の枠が落選しても、当選した枠には参加できます</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクションバー */}
      {actionBarButtons.length > 0 && (
        <>
          <ActionBarSpacer />
          <ActionBar
            actions={actionBarButtons}
            maxColumns={actionBarButtons.length === 1 ? 1 : 2}
            background="blur"
          />
        </>
      )}
    </>
  );
}
