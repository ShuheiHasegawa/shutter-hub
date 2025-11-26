'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { getAdminLotteryEntries } from '@/app/actions/admin-lottery';
import { logger } from '@/lib/utils/logger';
import { Trophy, Clock } from 'lucide-react';
import type { AdminLotteryEntry } from '@/types/database';

interface AdminLotteryWinnersListProps {
  adminLotterySessionId: string;
  slots: Array<{
    id: string;
    slot_number: number;
  }>;
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

export function AdminLotteryWinnersList({
  adminLotterySessionId,
  slots: _slots,
}: AdminLotteryWinnersListProps) {
  const [winners, setWinners] = useState<
    Array<{
      slot_id: string;
      slot_number: number;
      winners: Array<{
        user_id: string;
        display_name: string;
        email: string;
        avatar_url?: string;
        preferred_model_name?: string;
        cheki_unsigned_count: number;
        cheki_signed_count: number;
        selected_at?: string;
      }>;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    const loadWinners = async () => {
      setIsLoading(true);
      try {
        const result = await getAdminLotteryEntries(adminLotterySessionId);
        if (result.error) {
          logger.error('当選者リスト取得エラー:', {
            error: result.error,
            adminLotterySessionId,
          });
          return;
        }

        const entries = (result.data || []) as EntryWithDetails[];
        const selectedEntries = entries.filter(e => e.status === 'selected');

        // スロットごとにグループ化
        const winnersBySlot = selectedEntries.reduce(
          (acc, entry) => {
            const slotId = entry.slot_id || 'no_slot';
            const slot = entry.slot;
            const slotNumber = slot?.slot_number || 0;

            if (!acc[slotId]) {
              acc[slotId] = {
                slot_id: slotId,
                slot_number: slotNumber,
                winners: [],
              };
            }

            const user = entry.user;
            const preferredModel = entry.preferred_model;

            acc[slotId].winners.push({
              user_id: entry.user_id,
              display_name: user?.display_name || 'Unknown',
              email: user?.email || '',
              avatar_url: user?.avatar_url || undefined,
              preferred_model_name: preferredModel?.display_name,
              cheki_unsigned_count: entry.cheki_unsigned_count || 0,
              cheki_signed_count: entry.cheki_signed_count || 0,
              selected_at: entry.selected_at || undefined,
            });

            return acc;
          },
          {} as Record<
            string,
            {
              slot_id: string;
              slot_number: number;
              winners: Array<{
                user_id: string;
                display_name: string;
                email: string;
                avatar_url?: string;
                preferred_model_name?: string;
                cheki_unsigned_count: number;
                cheki_signed_count: number;
                selected_at?: string;
              }>;
            }
          >
        );

        // スロット番号でソート
        const sortedWinners = Object.values(winnersBySlot).sort(
          (a, b) => a.slot_number - b.slot_number
        );

        setWinners(sortedWinners);
      } catch (error) {
        logger.error('当選者リスト取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWinners();
  }, [adminLotterySessionId]);

  // 最初のタブを自動選択
  useEffect(() => {
    if (winners.length > 0 && !activeTab) {
      setActiveTab(winners[0].slot_id);
    }
  }, [winners, activeTab]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            当選者リスト
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

  if (winners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            当選者リスト
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            当選者がいません
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalWinners = winners.reduce(
    (sum, slot) => sum + slot.winners.length,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          当選者リスト
          <Badge variant="secondary" className="ml-2">
            {totalWinners}名
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            {winners.map(slot => (
              <TabsTrigger
                key={slot.slot_id}
                value={slot.slot_id}
                className="flex items-center gap-2"
              >
                <span>枠{slot.slot_number}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {slot.winners.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {winners.map(slot => (
            <TabsContent
              key={slot.slot_id}
              value={slot.slot_id}
              className="mt-0"
            >
              {/* デスクトップ表示用テーブル（xl以上） */}
              <div className="hidden xl:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>当選者</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>推しモデル</TableHead>
                      <TableHead>チェキ</TableHead>
                      <TableHead>確定日時</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slot.winners.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          当選者がいません
                        </TableCell>
                      </TableRow>
                    ) : (
                      slot.winners.map((winner, index) => (
                        <TableRow key={winner.user_id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={winner.avatar_url || undefined}
                                />
                                <AvatarFallback>
                                  {winner.display_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="font-medium">
                                {winner.display_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{winner.email}</div>
                          </TableCell>
                          <TableCell>
                            {winner.preferred_model_name ? (
                              <Badge variant="secondary" className="text-xs">
                                {winner.preferred_model_name}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {winner.cheki_unsigned_count > 0 ||
                            winner.cheki_signed_count > 0 ? (
                              <div className="text-sm">
                                <div>
                                  サインなし: {winner.cheki_unsigned_count}枚
                                </div>
                                {winner.cheki_signed_count > 0 && (
                                  <div>
                                    サインあり: {winner.cheki_signed_count}枚
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
                            {winner.selected_at ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(winner.selected_at).toLocaleString(
                                  'ja-JP',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* モバイル・タブレット表示用の詳細カード（xl未満の画面） */}
              <div className="xl:hidden space-y-3">
                {slot.winners.map((winner, index) => (
                  <Card key={winner.user_id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={winner.avatar_url || undefined} />
                            <AvatarFallback>
                              {winner.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {winner.display_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {winner.email}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {winner.preferred_model_name && (
                              <Badge variant="secondary" className="text-xs">
                                推し: {winner.preferred_model_name}
                              </Badge>
                            )}
                            {(winner.cheki_unsigned_count > 0 ||
                              winner.cheki_signed_count > 0) && (
                              <Badge variant="outline" className="text-xs">
                                チェキ: サインなし{winner.cheki_unsigned_count}
                                枚
                                {winner.cheki_signed_count > 0 &&
                                  ` / サインあり${winner.cheki_signed_count}枚`}
                              </Badge>
                            )}
                            {winner.selected_at && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(winner.selected_at).toLocaleString(
                                  'ja-JP'
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
