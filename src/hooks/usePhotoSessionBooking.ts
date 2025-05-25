'use client';

import { useState, useEffect } from 'react';
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

export function usePhotoSessionBooking(session: PhotoSessionWithOrganizer) {
  const { user } = useAuth();
  const [bookingState, setBookingState] = useState<BookingState>({
    isLoading: true,
    canBook: false,
    reason: null,
    userBooking: null,
    availableSlots: 0,
  });

  const supabase = createClient();

  // 予約状態をチェックする関数
  const checkBookingState = async () => {
    if (!user) {
      setBookingState({
        isLoading: false,
        canBook: false,
        reason: 'ログインが必要です',
        userBooking: null,
        availableSlots: session.max_participants - session.current_participants,
      });
      return;
    }

    setBookingState(prev => ({ ...prev, isLoading: true }));

    try {
      // 現在の撮影会情報を取得
      const { data: currentSession, error: sessionError } = await supabase
        .from('photo_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      if (sessionError || !currentSession) {
        setBookingState({
          isLoading: false,
          canBook: false,
          reason: '撮影会情報の取得に失敗しました',
          userBooking: null,
          availableSlots: 0,
        });
        return;
      }

      // ユーザーの既存予約をチェック
      const { data: existingBooking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('photo_session_id', session.id)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .single();

      const availableSlots =
        currentSession.max_participants - currentSession.current_participants;
      const now = new Date();
      const startTime = new Date(currentSession.start_time);

      let canBook = true;
      let reason = null;

      // 各種チェック
      if (!currentSession.is_published) {
        canBook = false;
        reason = 'この撮影会は公開されていません';
      } else if (startTime <= now) {
        canBook = false;
        reason = 'この撮影会は既に開始または終了しています';
      } else if (existingBooking && !bookingError) {
        canBook = false;
        reason = '既に予約済みです';
      } else if (availableSlots <= 0) {
        canBook = false;
        reason = '満席です';
      }

      setBookingState({
        isLoading: false,
        canBook,
        reason,
        userBooking: existingBooking || null,
        availableSlots,
      });
    } catch (error) {
      console.error('予約状態チェックエラー:', error);
      setBookingState({
        isLoading: false,
        canBook: false,
        reason: '予約状態の確認に失敗しました',
        userBooking: null,
        availableSlots: 0,
      });
    }
  };

  // 初回チェック
  useEffect(() => {
    checkBookingState();
  }, [user, session.id]);

  // リアルタイム更新の購読
  useEffect(() => {
    if (!user) return;

    // 撮影会の変更を監視
    const sessionChannel = supabase
      .channel(`photo_session_${session.id}`)
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
      .subscribe();

    // 予約の変更を監視
    const bookingChannel = supabase
      .channel(`bookings_${session.id}`)
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
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [user, session.id]);

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
