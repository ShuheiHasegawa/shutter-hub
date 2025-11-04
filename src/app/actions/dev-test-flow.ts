'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';

/**
 * 開発用：テスト用撮影会一括作成機能
 * 過去の日時に撮影会を作成し、予約を確認済みにしてレビュー可能な状態にする
 */

export interface CreateTestPhotoSessionData {
  organizer_id: string;
  participant_id: string;
  title?: string;
  days_ago?: number; // 何日前の撮影会にするか（デフォルト: 1日前）
  hours_duration?: number; // 撮影時間（時間、デフォルト: 2時間）
}

export interface CreateTestPhotoSessionResult {
  success: boolean;
  error?: string;
  data?: {
    photo_session_id: string;
    booking_id: string;
    photo_session_url: string;
    booking_url: string;
  };
}

/**
 * テスト用撮影会を作成し、予約を確認済みにしてレビュー可能な状態にする
 */
export async function createTestPhotoSessionWithBooking(
  data: CreateTestPhotoSessionData
): Promise<CreateTestPhotoSessionResult> {
  try {
    // 開発ツールではService Roleクライアントを使用してRLSをバイパス
    const supabase = createServiceRoleClient();

    // ユーザーIDの存在確認
    const { data: organizerProfile, error: organizerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.organizer_id)
      .single();

    if (organizerError || !organizerProfile) {
      logger.error('主催者プロフィール取得エラー:', organizerError);
      return {
        success: false,
        error: `主催者IDが存在しません: ${data.organizer_id}`,
      };
    }

    const { data: participantProfile, error: participantError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.participant_id)
      .single();

    if (participantError || !participantProfile) {
      logger.error('参加者プロフィール取得エラー:', participantError);
      return {
        success: false,
        error: `参加者IDが存在しません: ${data.participant_id}`,
      };
    }

    const daysAgo = data.days_ago || 1;
    const hoursDuration = data.hours_duration || 2;
    const now = new Date();
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() - daysAgo);
    startTime.setHours(14, 0, 0, 0); // 14:00開始

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + hoursDuration);

    const title =
      data.title || `テスト撮影会 ${startTime.toLocaleDateString('ja-JP')}`;

    // 1. 撮影会を作成
    const { data: photoSession, error: sessionError } = await supabase
      .from('photo_sessions')
      .insert({
        organizer_id: data.organizer_id,
        title: title,
        description: '開発ツールによるテスト用撮影会です。',
        location: 'テストスタジオ',
        address: '東京都渋谷区テスト1-2-3',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        max_participants: 5,
        price_per_person: 5000,
        booking_type: 'first_come',
        allow_multiple_bookings: false,
        block_users_with_bad_ratings: false,
        is_published: true,
        current_participants: 0,
      })
      .select()
      .single();

    if (sessionError) {
      logger.error('撮影会作成エラー:', sessionError);
      return {
        success: false,
        error: `撮影会の作成に失敗しました: ${sessionError.message || JSON.stringify(sessionError)}`,
      };
    }

    // 2. スロットを作成（1つのスロット）
    const { error: slotError } = await supabase
      .from('photo_session_slots')
      .insert({
        photo_session_id: photoSession.id,
        slot_number: 1,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        price_per_person: 5000,
        max_participants: 5,
        current_participants: 0,
        is_active: true,
      });

    if (slotError) {
      logger.error('スロット作成エラー:', slotError);
      // 撮影会を削除
      await supabase.from('photo_sessions').delete().eq('id', photoSession.id);
      return {
        success: false,
        error: `スロットの作成に失敗しました: ${slotError.message || JSON.stringify(slotError)}`,
      };
    }

    // 3. 予約を作成（参加者として）
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        photo_session_id: photoSession.id,
        user_id: data.participant_id,
        status: 'confirmed', // 直接確認済み状態で作成
      })
      .select()
      .single();

    if (bookingError) {
      logger.error('予約作成エラー:', bookingError);
      // 撮影会とスロットを削除
      await supabase
        .from('photo_session_slots')
        .delete()
        .eq('photo_session_id', photoSession.id);
      await supabase.from('photo_sessions').delete().eq('id', photoSession.id);
      return {
        success: false,
        error: `予約の作成に失敗しました: ${bookingError.message || JSON.stringify(bookingError)}`,
      };
    }

    // 4. スロットの参加者数を更新
    const { data: slot } = await supabase
      .from('photo_session_slots')
      .select('id')
      .eq('photo_session_id', photoSession.id)
      .eq('slot_number', 1)
      .single();

    if (slot) {
      await supabase
        .from('photo_session_slots')
        .update({
          current_participants: 1,
        })
        .eq('id', slot.id);

      // 撮影会の参加者数も更新
      await supabase
        .from('photo_sessions')
        .update({
          current_participants: 1,
        })
        .eq('id', photoSession.id);
    }

    // 5. 予約にスロットIDを関連付け
    await supabase
      .from('bookings')
      .update({
        slot_id: slot?.id,
      })
      .eq('id', booking.id);

    revalidatePath('/photo-sessions');
    revalidatePath(`/photo-sessions/${photoSession.id}`);

    return {
      success: true,
      data: {
        photo_session_id: photoSession.id,
        booking_id: booking.id,
        photo_session_url: `/ja/photo-sessions/${photoSession.id}`,
        booking_url: `/ja/bookings/${booking.id}`,
      },
    };
  } catch (error) {
    logger.error('テスト撮影会作成エラー:', error);
    const errorMessage =
      error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return {
      success: false,
      error: `予期しないエラーが発生しました: ${errorMessage}`,
    };
  }
}

/**
 * 既存の撮影会に対して予約を確認済みにする（テスト用）
 */
export async function confirmBookingForTest(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 開発ツールではService Roleクライアントを使用
    const supabase = createServiceRoleClient();

    // 予約を確認済み状態に更新
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      logger.error('予約確認エラー:', error);
      return { success: false, error: '予約の確認に失敗しました' };
    }

    revalidatePath('/bookings');

    return { success: true };
  } catch (error) {
    logger.error('予約確認エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
