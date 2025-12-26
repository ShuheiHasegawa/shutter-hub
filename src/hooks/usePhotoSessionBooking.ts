'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PhotoSessionWithOrganizer } from '@/types/database';

interface BookingState {
  isLoading: boolean;
  canBook: boolean;
  reason: string | null;
  userBooking: {
    id: string;
    photo_session_id: string;
    user_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  } | null;
  availableSlots: number;
}

export function usePhotoSessionBooking(
  session: PhotoSessionWithOrganizer,
  initialUserBooking?: {
    id: string;
    photo_session_id: string;
    user_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  } | null
) {
  const { user } = useAuth();
  const [bookingState, setBookingState] = useState<BookingState>({
    isLoading: true,
    canBook: false,
    reason: null,
    userBooking: initialUserBooking || null,
    availableSlots: 0,
  });

  const supabase = createClient();

  // 予約状態をチェックする関数
  const checkBookingState = useCallback(async () => {
    if (!user) {
      setBookingState({
        isLoading: false,
        canBook: false,
        reason: 'ログインが必要です',
        userBooking: initialUserBooking || null,
        availableSlots: session.max_participants - session.current_participants,
      });
      return;
    }

    setBookingState(prev => ({ ...prev, isLoading: true }));

    try {
      // サーバーサイドで取得済みの予約情報を使用
      const existingBooking = initialUserBooking || null;

      // 撮影会情報は既に取得済みなので、sessionオブジェクトを直接使用
      const availableSlots =
        session.max_participants - session.current_participants;
      const now = new Date();
      const startTime = new Date(session.start_time);

      let canBook = true;
      let reason = null;

      // 各種チェック
      if (!session.is_published) {
        canBook = false;
        reason = 'この撮影会は公開されていません';
      } else if (startTime <= now) {
        canBook = false;
        reason = 'この撮影会は既に開始または終了しています';
      } else if (existingBooking && !session.allow_multiple_bookings) {
        // 複数予約が許可されていない場合、既存予約があれば予約不可
        canBook = false;
        reason =
          '既に予約済みです。この撮影会では複数枠の予約は許可されていません';
      } else if (availableSlots <= 0) {
        canBook = false;
        reason = '満席です';
      }

      setBookingState({
        isLoading: false,
        canBook,
        reason,
        userBooking: existingBooking,
        availableSlots,
      });
    } catch (error) {
      logger.error('予約状態チェックエラー:', error);
      setBookingState({
        isLoading: false,
        canBook: false,
        reason: '予約状態の確認に失敗しました',
        userBooking: initialUserBooking || null,
        availableSlots: 0,
      });
    }
  }, [
    user,
    session.id,
    session.max_participants,
    session.current_participants,
    session.is_published,
    session.start_time,
    session.allow_multiple_bookings,
    initialUserBooking,
  ]);

  // 初回チェック
  useEffect(() => {
    checkBookingState();
  }, [user, session.id]);

  // リアルタイム更新の購読（統合チャンネル）
  useEffect(() => {
    if (!user) return;

    // 1つのチャンネルで複数のテーブル変更を監視
    const channel = supabase
      .channel(`photo_session_booking_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_sessions',
          filter: `id=eq.${session.id}`,
        },
        () => {
          checkBookingState();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `photo_session_id=eq.${session.id}`,
        },
        () => {
          checkBookingState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, session.id, checkBookingState]);

  return {
    ...bookingState,
    refresh: checkBookingState,
  };
}

// 撮影会の残席数をリアルタイムで監視するフック
export function usePhotoSessionCapacity(sessionId: string) {
  const [capacity, setCapacity] = useState<{
    maxParticipants: number;
    currentParticipants: number;
    availableSlots: number;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // 初回データ取得
    const fetchCapacity = async () => {
      const { data, error } = await supabase
        .from('photo_sessions')
        .select('max_participants, current_participants')
        .eq('id', sessionId)
        .single();

      if (data && !error) {
        setCapacity({
          maxParticipants: data.max_participants,
          currentParticipants: data.current_participants,
          availableSlots: data.max_participants - data.current_participants,
        });
      }
    };

    fetchCapacity();

    // リアルタイム更新の購読
    const channel = supabase
      .channel(`capacity_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photo_sessions',
          filter: `id=eq.${sessionId}`,
        },
        payload => {
          const newData = payload.new as {
            max_participants: number;
            current_participants: number;
          };
          setCapacity({
            maxParticipants: newData.max_participants,
            currentParticipants: newData.current_participants,
            availableSlots:
              newData.max_participants - newData.current_participants,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return capacity;
}
