'use client';

import { useState, useEffect } from 'react';
import { getAdminLotteryEntries } from '@/app/actions/admin-lottery';
import { logger } from '@/lib/utils/logger';
import {
  LotteryWinnersListBase,
  type SlotWinner,
} from './shared/LotteryWinnersListBase';
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
  const [winners, setWinners] = useState<SlotWinner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          {} as Record<string, SlotWinner>
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

  return (
    <LotteryWinnersListBase
      winners={winners}
      isLoading={isLoading}
      showBookingStatus={false}
      dateField="selected_at"
    />
  );
}
