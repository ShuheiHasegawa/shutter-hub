'use client';

import { useState, useEffect } from 'react';
import { getLotteryWinners } from '@/app/actions/multi-slot-lottery';
import { logger } from '@/lib/utils/logger';
import {
  LotteryWinnersListBase,
  type SlotWinner,
} from './shared/LotteryWinnersListBase';

interface LotteryWinnersListProps {
  lotterySessionId: string;
}

export function LotteryWinnersList({
  lotterySessionId,
}: LotteryWinnersListProps) {
  const [winners, setWinners] = useState<SlotWinner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWinners = async () => {
      setIsLoading(true);
      try {
        const result = await getLotteryWinners(lotterySessionId);
        if (result.success && result.data) {
          setWinners(result.data);
        } else {
          logger.error('当選者リスト取得エラー:', {
            error: result.error,
            lotterySessionId,
          });
        }
      } catch (error) {
        logger.error('当選者リスト取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWinners();
  }, [lotterySessionId]);

  return (
    <LotteryWinnersListBase
      winners={winners}
      isLoading={isLoading}
      showBookingStatus={true}
      dateField="won_at"
    />
  );
}
