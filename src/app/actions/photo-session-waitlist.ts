'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface WaitlistEntry {
  id?: string;
  photo_session_id: string;
  user_id: string;
  queue_position: number;
  status: 'waiting' | 'promoted' | 'expired' | 'cancelled';
  auto_promote: boolean;
  notification_sent: boolean;
  promotion_deadline?: string;
  message?: string;
  promotion_reason?: string;
  created_at?: string;
  promoted_at?: string;
  expired_at?: string;
  cancelled_at?: string;
}

export interface WaitlistSettings {
  id?: string;
  photo_session_id: string;
  enabled: boolean;
  max_waitlist_size: number;
  auto_promote_enabled: boolean;
  promotion_deadline_hours: number;
  email_notifications: boolean;
  push_notifications: boolean;
}

export interface WaitlistNotification {
  id?: string;
  waitlist_entry_id: string;
  user_id: string;
  photo_session_id: string;
  notification_type:
    | 'promotion_available'
    | 'position_changed'
    | 'deadline_reminder';
  title: string;
  message: string;
  sent: boolean;
  sent_at?: string;
  read: boolean;
  read_at?: string;
  email_sent: boolean;
  push_sent: boolean;
  created_at?: string;
}

// キャンセル待ちに登録
export async function joinWaitlist(
  photoSessionId: string,
  message?: string
): Promise<{
  success: boolean;
  error?: string;
  data?: { position: number; waitlist_entry_id: string };
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data, error } = await supabase.rpc('join_waitlist', {
      target_photo_session_id: photoSessionId,
      target_user_id: user.id,
      user_message: message || null,
    });

    if (error) {
      console.error('キャンセル待ち登録エラー:', error);
      return { success: false, error: 'キャンセル待ちの登録に失敗しました' };
    }

    const result = data?.[0];
    if (!result?.success) {
      return {
        success: false,
        error: result?.message || 'キャンセル待ちの登録に失敗しました',
      };
    }

    revalidatePath('/photo-sessions');
    revalidatePath(`/photo-sessions/${photoSessionId}`);

    return {
      success: true,
      data: {
        position: result.queue_position,
        waitlist_entry_id: result.waitlist_entry_id,
      },
    };
  } catch (error) {
    console.error('キャンセル待ち登録エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// キャンセル待ちをキャンセル
export async function cancelWaitlistEntry(
  waitlistEntryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data, error } = await supabase.rpc('cancel_waitlist_entry', {
      target_waitlist_entry_id: waitlistEntryId,
      target_user_id: user.id,
    });

    if (error) {
      console.error('キャンセル待ちキャンセルエラー:', error);
      return {
        success: false,
        error: 'キャンセル待ちのキャンセルに失敗しました',
      };
    }

    const result = data?.[0];
    if (!result?.success) {
      return {
        success: false,
        error: result?.message || 'キャンセル待ちのキャンセルに失敗しました',
      };
    }

    revalidatePath('/photo-sessions');
    revalidatePath('/bookings');

    return { success: true };
  } catch (error) {
    console.error('キャンセル待ちキャンセルエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ユーザーのキャンセル待ち状況を取得
export async function getUserWaitlistEntry(
  photoSessionId: string,
  userId?: string
): Promise<{ success: boolean; error?: string; data?: WaitlistEntry }> {
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
      .from('waitlist_entries')
      .select('*')
      .eq('photo_session_id', photoSessionId)
      .eq('user_id', targetUserId)
      .in('status', ['waiting', 'promoted'])
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      console.error('キャンセル待ち状況取得エラー:', error);
      return {
        success: false,
        error: 'キャンセル待ち状況の取得に失敗しました',
      };
    }

    return { success: true, data: data || undefined };
  } catch (error) {
    console.error('キャンセル待ち状況取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 撮影会のキャンセル待ち一覧を取得
export async function getPhotoSessionWaitlist(
  photoSessionId: string
): Promise<{ success: boolean; error?: string; data?: WaitlistEntry[] }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('waitlist_entries')
      .select(
        `
        *,
        user:profiles!waitlist_entries_user_id_fkey(display_name, avatar_url)
      `
      )
      .eq('photo_session_id', photoSessionId)
      .in('status', ['waiting', 'promoted'])
      .order('queue_position', { ascending: true });

    if (error) {
      console.error('キャンセル待ち一覧取得エラー:', error);
      return {
        success: false,
        error: 'キャンセル待ち一覧の取得に失敗しました',
      };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('キャンセル待ち一覧取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// キャンセル待ち設定の取得
export async function getWaitlistSettings(
  photoSessionId: string
): Promise<{ success: boolean; error?: string; data?: WaitlistSettings }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('waitlist_settings')
      .select('*')
      .eq('photo_session_id', photoSessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      console.error('キャンセル待ち設定取得エラー:', error);
      return {
        success: false,
        error: 'キャンセル待ち設定の取得に失敗しました',
      };
    }

    return { success: true, data: data || undefined };
  } catch (error) {
    console.error('キャンセル待ち設定取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// キャンセル待ち設定の作成・更新
export async function createOrUpdateWaitlistSettings(
  settings: WaitlistSettings
): Promise<{ success: boolean; error?: string; data?: WaitlistSettings }> {
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
      .from('waitlist_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('キャンセル待ち設定エラー:', error);
      return {
        success: false,
        error: 'キャンセル待ち設定の保存に失敗しました',
      };
    }

    revalidatePath('/photo-sessions');
    return { success: true, data };
  } catch (error) {
    console.error('キャンセル待ち設定エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 手動でキャンセル待ちから繰り上げ
export async function promoteFromWaitlist(
  photoSessionId: string,
  slotsAvailable: number = 1
): Promise<{
  success: boolean;
  error?: string;
  data?: { promoted_count: number; promoted_users: string[] };
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
      .eq('id', photoSessionId)
      .single();

    if (!photoSession || photoSession.organizer_id !== user.id) {
      return { success: false, error: '権限がありません' };
    }

    const { data, error } = await supabase.rpc('promote_from_waitlist', {
      target_photo_session_id: photoSessionId,
      slots_available: slotsAvailable,
    });

    if (error) {
      console.error('キャンセル待ち繰り上げエラー:', error);
      return {
        success: false,
        error: 'キャンセル待ちの繰り上げに失敗しました',
      };
    }

    const result = data?.[0];
    revalidatePath('/photo-sessions');
    revalidatePath(`/photo-sessions/${photoSessionId}`);

    return {
      success: true,
      data: {
        promoted_count: result?.promoted_count || 0,
        promoted_users: result?.promoted_users || [],
      },
    };
  } catch (error) {
    console.error('キャンセル待ち繰り上げエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 繰り上げ当選から予約を確定
export async function confirmPromotedBooking(
  waitlistEntryId: string
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // キャンセル待ちエントリーを取得
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('id', waitlistEntryId)
      .eq('user_id', user.id)
      .eq('status', 'promoted')
      .single();

    if (waitlistError || !waitlistEntry) {
      return { success: false, error: '有効な繰り上げ当選が見つかりません' };
    }

    // 期限をチェック
    if (
      waitlistEntry.promotion_deadline &&
      new Date(waitlistEntry.promotion_deadline) < new Date()
    ) {
      return { success: false, error: '繰り上げ期限が過ぎています' };
    }

    // 通常の予約作成処理を呼び出し
    const { createPhotoSessionBooking } = await import(
      './photo-session-booking'
    );
    const bookingResult = await createPhotoSessionBooking(
      waitlistEntry.photo_session_id,
      user.id
    );

    if (!bookingResult.success) {
      return bookingResult;
    }

    // キャンセル待ちエントリーを完了状態に更新（削除ではなく履歴として残す）
    await supabase
      .from('waitlist_entries')
      .update({
        status: 'promoted', // 実際には新しいステータス 'confirmed' を追加することも可能
        notification_sent: true,
      })
      .eq('id', waitlistEntryId);

    // 履歴を記録
    await supabase.from('waitlist_history').insert({
      waitlist_entry_id: waitlistEntryId,
      photo_session_id: waitlistEntry.photo_session_id,
      user_id: user.id,
      action: 'confirmed',
      old_status: 'promoted',
      new_status: 'confirmed',
      reason: 'ユーザーが繰り上げ当選を確定',
    });

    revalidatePath('/photo-sessions');
    revalidatePath('/bookings');

    return bookingResult;
  } catch (error) {
    console.error('繰り上げ予約確定エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ユーザーの通知一覧を取得
export async function getUserWaitlistNotifications(userId?: string): Promise<{
  success: boolean;
  error?: string;
  data?: WaitlistNotification[];
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

    const { data, error } = await supabase
      .from('waitlist_notifications')
      .select(
        `
        *,
        photo_session:photo_sessions(title, start_time)
      `
      )
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('キャンセル待ち通知取得エラー:', error);
      return {
        success: false,
        error: 'キャンセル待ち通知の取得に失敗しました',
      };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('キャンセル待ち通知取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 通知を既読にする
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    const { error } = await supabase
      .from('waitlist_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('通知既読エラー:', error);
      return { success: false, error: '通知の既読処理に失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('通知既読エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 期限切れの繰り上げを処理（バッチ処理用）
export async function expireWaitlistPromotions(): Promise<{
  success: boolean;
  error?: string;
  data?: { expired_count: number; expired_users: string[] };
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('expire_waitlist_promotions');

    if (error) {
      console.error('期限切れ処理エラー:', error);
      return { success: false, error: '期限切れ処理に失敗しました' };
    }

    const result = data?.[0];

    return {
      success: true,
      data: {
        expired_count: result?.expired_count || 0,
        expired_users: result?.expired_users || [],
      },
    };
  } catch (error) {
    console.error('期限切れ処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
