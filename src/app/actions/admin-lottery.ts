'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';

// 管理抽選システムのServer Actions

export interface CreateAdminLotterySessionData {
  photo_session_id: string;
  entry_start_time: string;
  entry_end_time: string;
  selection_deadline: string;
  max_winners: number;
  selection_criteria?: Record<string, unknown>;
}

export interface AdminLotteryEntryData {
  admin_lottery_session_id: string;
  application_message?: string;
}

export interface SelectWinnersData {
  session_id: string;
  entry_ids: string[];
  selection_reason?: string;
}

// 管理抽選セッションを作成
export async function createAdminLotterySession(
  data: CreateAdminLotterySessionData
) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 撮影会の所有者チェック
    const { data: photoSession, error: sessionError } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', data.photo_session_id)
      .single();

    if (sessionError || !photoSession) {
      return { error: 'Photo session not found' };
    }

    if (photoSession.organizer_id !== user.id) {
      return { error: 'Unauthorized' };
    }

    // 管理抽選セッション作成
    const { data: adminLotterySession, error: createError } = await supabase
      .from('admin_lottery_sessions')
      .insert({
        photo_session_id: data.photo_session_id,
        entry_start_time: data.entry_start_time,
        entry_end_time: data.entry_end_time,
        selection_deadline: data.selection_deadline,
        max_winners: data.max_winners,
        selection_criteria: data.selection_criteria || {},
        status: 'upcoming',
      })
      .select()
      .single();

    if (createError) {
      logger.error('管理抽選セッション作成エラー:', createError);
      return { error: 'Failed to create admin lottery session' };
    }

    revalidatePath('/dashboard');
    return { data: adminLotterySession };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 管理抽選に応募
export async function applyToAdminLottery(data: AdminLotteryEntryData) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 管理抽選セッション情報取得
    const { data: adminLotterySession, error: sessionError } = await supabase
      .from('admin_lottery_sessions')
      .select('*')
      .eq('id', data.admin_lottery_session_id)
      .single();

    if (sessionError || !adminLotterySession) {
      return { error: 'Admin lottery session not found' };
    }

    // 応募期間チェック
    const now = new Date();
    const entryStart = new Date(adminLotterySession.entry_start_time);
    const entryEnd = new Date(adminLotterySession.entry_end_time);

    if (now < entryStart) {
      return { error: 'Entry period has not started yet' };
    }

    if (now > entryEnd) {
      return { error: 'Entry period has ended' };
    }

    if (adminLotterySession.status !== 'accepting') {
      return { error: 'Admin lottery is not accepting entries' };
    }

    // 重複応募チェック
    const { data: existingEntry, error: checkError } = await supabase
      .from('admin_lottery_entries')
      .select('id')
      .eq('admin_lottery_session_id', data.admin_lottery_session_id)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('応募チェックエラー:', checkError);
      return { error: 'Failed to check existing entry' };
    }

    if (existingEntry) {
      return { error: 'Already applied to this admin lottery' };
    }

    // 応募作成
    const { data: entry, error: entryError } = await supabase
      .from('admin_lottery_entries')
      .insert({
        admin_lottery_session_id: data.admin_lottery_session_id,
        user_id: user.id,
        application_message: data.application_message,
        status: 'applied',
      })
      .select()
      .single();

    if (entryError) {
      logger.error('応募作成エラー:', entryError);
      return { error: 'Failed to apply to admin lottery' };
    }

    revalidatePath('/photo-sessions');
    return { data: entry };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 当選者を選出
export async function selectAdminLotteryWinners(data: SelectWinnersData) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // ストアドプロシージャを使用して当選者選出
    const { data: result, error } = await supabase.rpc(
      'select_admin_lottery_winners',
      {
        session_id: data.session_id,
        entry_ids: data.entry_ids,
        selected_by_user_id: user.id,
        selection_reason: data.selection_reason,
      }
    );

    if (error) {
      logger.error('当選者選出エラー:', error);
      return { error: 'Failed to select winners' };
    }

    if (result && result.length > 0 && !result[0].success) {
      return { error: result[0].message };
    }

    revalidatePath('/dashboard');
    return { data: result[0] };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 選出を取り消し
export async function undoAdminLotterySelection(data: SelectWinnersData) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // ストアドプロシージャを使用して選出取り消し
    const { data: result, error } = await supabase.rpc(
      'undo_admin_lottery_selection',
      {
        session_id: data.session_id,
        entry_ids: data.entry_ids,
        selected_by_user_id: user.id,
        reason: data.selection_reason,
      }
    );

    if (error) {
      logger.error('選出取り消しエラー:', error);
      return { error: 'Failed to undo selection' };
    }

    revalidatePath('/dashboard');
    return { data: result[0] };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 管理抽選セッションの詳細を取得
export async function getAdminLotterySession(photoSessionId: string) {
  try {
    const supabase = await createClient();

    const { data: adminLotterySession, error } = await supabase
      .from('admin_lottery_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions(
          *,
          organizer:profiles!photo_sessions_organizer_id_fkey(*)
        )
      `
      )
      .eq('photo_session_id', photoSessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('管理抽選セッション取得エラー:', error);
      return { error: 'Failed to fetch admin lottery session' };
    }

    return { data: adminLotterySession };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 管理抽選応募一覧を取得
export async function getAdminLotteryEntries(sessionId: string) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 管理抽選セッションの所有者チェック
    const { data: adminLotterySession, error: sessionError } = await supabase
      .from('admin_lottery_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions!inner(organizer_id)
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !adminLotterySession) {
      return { error: 'Admin lottery session not found' };
    }

    if (adminLotterySession.photo_session.organizer_id !== user.id) {
      return { error: 'Unauthorized' };
    }

    // 応募一覧取得
    const { data: entries, error } = await supabase
      .from('admin_lottery_entries')
      .select(
        `
        *,
        user:profiles!admin_lottery_entries_user_id_fkey(*)
      `
      )
      .eq('admin_lottery_session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('応募一覧取得エラー:', error);
      return { error: 'Failed to fetch admin lottery entries' };
    }

    return { data: entries };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// ユーザーの管理抽選応募状況を取得
export async function getUserAdminLotteryEntry(sessionId: string) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    const { data: entry, error } = await supabase
      .from('admin_lottery_entries')
      .select('*')
      .eq('admin_lottery_session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('応募取得エラー:', error);
      return { error: 'Failed to fetch admin lottery entry' };
    }

    return { data: entry };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 管理抽選セッションのステータスを更新
export async function updateAdminLotterySessionStatus(
  sessionId: string,
  status: 'upcoming' | 'accepting' | 'selecting' | 'completed'
) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 管理抽選セッションの所有者チェック
    const { data: adminLotterySession, error: sessionError } = await supabase
      .from('admin_lottery_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions!inner(organizer_id)
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !adminLotterySession) {
      return { error: 'Admin lottery session not found' };
    }

    if (adminLotterySession.photo_session.organizer_id !== user.id) {
      return { error: 'Unauthorized' };
    }

    // ステータス更新
    const { data: updatedSession, error: updateError } = await supabase
      .from('admin_lottery_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      logger.error('ステータス更新エラー:', updateError);
      return { error: 'Failed to update admin lottery status' };
    }

    revalidatePath('/dashboard');
    return { data: updatedSession };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 選出履歴を取得
export async function getAdminLotterySelectionHistory(sessionId: string) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 管理抽選セッションの所有者チェック
    const { data: adminLotterySession, error: sessionError } = await supabase
      .from('admin_lottery_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions!inner(organizer_id)
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !adminLotterySession) {
      return { error: 'Admin lottery session not found' };
    }

    if (adminLotterySession.photo_session.organizer_id !== user.id) {
      return { error: 'Unauthorized' };
    }

    // 選出履歴取得
    const { data: history, error } = await supabase
      .from('admin_lottery_selection_history')
      .select(
        `
        *,
        selected_by_user:profiles!admin_lottery_selection_history_selected_by_fkey(*),
        entry:admin_lottery_entries(
          *,
          user:profiles!admin_lottery_entries_user_id_fkey(*)
        )
      `
      )
      .eq('admin_lottery_session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('選出履歴取得エラー:', error);
      return { error: 'Failed to fetch selection history' };
    }

    return { data: history };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}
