'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';

export interface PriorityBookingSettings {
  id?: string;
  photo_session_id: string;
  ticket_priority_enabled: boolean;
  rank_priority_enabled: boolean;
  ticket_priority_start?: string;
  ticket_priority_end?: string;
  vip_priority_start?: string;
  vip_priority_end?: string;
  platinum_priority_start?: string;
  platinum_priority_end?: string;
  gold_priority_start?: string;
  gold_priority_end?: string;
  silver_priority_start?: string;
  silver_priority_end?: string;
  general_booking_start: string;
}

export interface PriorityTicket {
  id?: string;
  photo_session_id: string;
  user_id: string;
  granted_by: string;
  ticket_type: 'general' | 'vip' | 'special';
  expires_at: string;
  notes?: string;
}

export interface UserRank {
  id?: string;
  user_id: string;
  rank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip';
  participation_count: number;
  total_bookings: number;
  average_rating: number;
  points: number;
  manually_set: boolean;
  manually_set_reason?: string;
}

export interface PriorityBookingEligibility {
  can_book: boolean;
  booking_type: 'ticket_priority' | 'rank_priority' | 'general';
  reason: string;
  available_from: string;
}

// 優先予約設定の作成・更新
export async function createOrUpdatePriorityBookingSettings(
  settings: PriorityBookingSettings
): Promise<{
  success: boolean;
  error?: string;
  data?: PriorityBookingSettings;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 撮影会の開催者かチェック
    const { data: photoSession } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', settings.photo_session_id)
      .single();

    if (!photoSession || photoSession.organizer_id !== user.id) {
      return { success: false, error: '権限がありません' };
    }

    const { data, error } = await supabase
      .from('priority_booking_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('優先予約設定エラー:', error);
      return { success: false, error: '優先予約設定の保存に失敗しました' };
    }

    revalidatePath('/photo-sessions');
    return { success: true, data };
  } catch (error) {
    logger.error('優先予約設定エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 優先予約設定の取得
export async function getPriorityBookingSettings(
  photoSessionId: string
): Promise<{
  success: boolean;
  error?: string;
  data?: PriorityBookingSettings;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('priority_booking_settings')
      .select('*')
      .eq('photo_session_id', photoSessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      logger.error('優先予約設定取得エラー:', error);
      return { success: false, error: '優先予約設定の取得に失敗しました' };
    }

    return { success: true, data: data || undefined };
  } catch (error) {
    logger.error('優先予約設定取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 優先チケットの作成
export async function createPriorityTicket(
  ticket: PriorityTicket
): Promise<{ success: boolean; error?: string; data?: PriorityTicket }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 撮影会の開催者かチェック
    const { data: photoSession } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', ticket.photo_session_id)
      .single();

    if (!photoSession || photoSession.organizer_id !== user.id) {
      return { success: false, error: '権限がありません' };
    }

    const { data, error } = await supabase
      .from('priority_tickets')
      .insert({
        ...ticket,
        granted_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('優先チケット作成エラー:', error);
      return { success: false, error: '優先チケットの作成に失敗しました' };
    }

    revalidatePath('/photo-sessions');
    return { success: true, data };
  } catch (error) {
    logger.error('優先チケット作成エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 優先チケットの一覧取得
export async function getPriorityTickets(
  photoSessionId: string
): Promise<{ success: boolean; error?: string; data?: PriorityTicket[] }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('priority_tickets')
      .select(
        `
        *,
        user:profiles!priority_tickets_user_id_fkey(display_name, avatar_url),
        granted_by_user:profiles!priority_tickets_granted_by_fkey(display_name)
      `
      )
      .eq('photo_session_id', photoSessionId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('優先チケット取得エラー:', error);
      return { success: false, error: '優先チケットの取得に失敗しました' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error('優先チケット取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ユーザーランクの取得
export async function getUserRank(
  userId?: string
): Promise<{ success: boolean; error?: string; data?: UserRank }> {
  try {
    const supabase = await createClient();

    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: '認証が必要です' };
      }
      targetUserId = user.id;
    }

    const { data, error } = await supabase
      .from('user_ranks')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      logger.error('ユーザーランク取得エラー:', error);
      return { success: false, error: 'ユーザーランクの取得に失敗しました' };
    }

    return { success: true, data: data || undefined };
  } catch (error) {
    logger.error('ユーザーランク取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ユーザーランクの計算・更新
export async function calculateUserRank(userId?: string): Promise<{
  success: boolean;
  error?: string;
  data?: { new_rank: string; points_earned: number; rank_changed: boolean };
}> {
  try {
    const supabase = await createClient();

    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: '認証が必要です' };
      }
      targetUserId = user.id;
    }

    const { data, error } = await supabase.rpc('calculate_user_rank', {
      target_user_id: targetUserId,
    });

    if (error) {
      logger.error('ユーザーランク計算エラー:', error);
      return { success: false, error: 'ユーザーランクの計算に失敗しました' };
    }

    return { success: true, data: data?.[0] };
  } catch (error) {
    logger.error('ユーザーランク計算エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 優先予約可能性チェック
export async function checkPriorityBookingEligibility(
  photoSessionId: string,
  userId?: string
): Promise<{
  success: boolean;
  error?: string;
  data?: PriorityBookingEligibility;
}> {
  try {
    const supabase = await createClient();

    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: '認証が必要です' };
      }
      targetUserId = user.id;
    }

    const { data, error } = await supabase.rpc(
      'check_priority_booking_eligibility',
      {
        target_photo_session_id: photoSessionId,
        target_user_id: targetUserId,
      }
    );

    if (error) {
      logger.error('優先予約可能性チェックエラー:', error);
      return {
        success: false,
        error: '優先予約可能性のチェックに失敗しました',
      };
    }

    return { success: true, data: data?.[0] };
  } catch (error) {
    logger.error('優先予約可能性チェックエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 優先予約の作成（チケット使用含む）
export async function createPriorityBooking(
  photoSessionId: string,
  bookingType: 'ticket_priority' | 'rank_priority' | 'general'
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 優先予約可能性をチェック
    const eligibilityResult = await checkPriorityBookingEligibility(
      photoSessionId,
      user.id
    );
    if (!eligibilityResult.success || !eligibilityResult.data?.can_book) {
      return {
        success: false,
        error: eligibilityResult.data?.reason || '現在予約できません',
      };
    }

    // チケット優先の場合はチケットを使用
    let ticketId: string | undefined;
    if (bookingType === 'ticket_priority') {
      const { data: ticketResult, error: ticketError } = await supabase.rpc(
        'use_priority_ticket',
        {
          target_photo_session_id: photoSessionId,
          target_user_id: user.id,
        }
      );

      if (ticketError || !ticketResult?.[0]?.success) {
        return {
          success: false,
          error: ticketResult?.[0]?.message || 'チケットの使用に失敗しました',
        };
      }

      ticketId = ticketResult[0].ticket_id;
    }

    // 通常の予約作成処理を呼び出し
    const { createPhotoSessionBooking } = await import(
      './photo-session-booking'
    );
    const bookingResult = await createPhotoSessionBooking(
      photoSessionId,
      user.id
    );

    if (!bookingResult.success) {
      return bookingResult;
    }

    // 優先予約ログを記録
    await supabase.from('priority_booking_logs').insert({
      photo_session_id: photoSessionId,
      user_id: user.id,
      booking_type: bookingType,
      user_rank:
        eligibilityResult.data?.booking_type === 'rank_priority'
          ? (await getUserRank(user.id)).data?.rank
          : undefined,
      ticket_id: ticketId,
      success: true,
    });

    revalidatePath('/photo-sessions');
    revalidatePath('/bookings');

    return bookingResult;
  } catch (error) {
    logger.error('優先予約作成エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ユーザーランクの手動設定（管理者用）
export async function setUserRankManually(
  userId: string,
  rank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip',
  reason: string
): Promise<{ success: boolean; error?: string; data?: UserRank }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 管理者権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'organizer') {
      return { success: false, error: '管理者権限が必要です' };
    }

    // 現在のランクを取得
    const currentRankResult = await getUserRank(userId);
    const currentRank = currentRankResult.data?.rank;

    // ランク履歴を記録
    if (currentRank && currentRank !== rank) {
      await supabase.from('user_rank_history').insert({
        user_id: userId,
        old_rank: currentRank,
        new_rank: rank,
        reason: 'manual_adjustment',
        changed_by: user.id,
      });
    }

    // ランクを更新
    const { data, error } = await supabase
      .from('user_ranks')
      .upsert({
        user_id: userId,
        rank,
        manually_set: true,
        manually_set_by: user.id,
        manually_set_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('ユーザーランク手動設定エラー:', error);
      return { success: false, error: 'ユーザーランクの設定に失敗しました' };
    }

    revalidatePath('/admin');
    return { success: true, data };
  } catch (error) {
    logger.error('ユーザーランク手動設定エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
