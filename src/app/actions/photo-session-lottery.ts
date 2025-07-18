'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
// 抽選予約システムのServer Actions

export interface CreateLotterySessionData {
  photo_session_id: string;
  entry_start_time: string;
  entry_end_time: string;
  lottery_date: string;
  max_winners: number;
}

export interface LotteryEntryData {
  lottery_session_id: string;
  message?: string;
}

// 抽選撮影会を作成
export async function createLotterySession(data: CreateLotterySessionData) {
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

    // 抽選セッション作成
    const { data: lotterySession, error: createError } = await supabase
      .from('lottery_sessions')
      .insert({
        photo_session_id: data.photo_session_id,
        entry_start_time: data.entry_start_time,
        entry_end_time: data.entry_end_time,
        lottery_date: data.lottery_date,
        max_winners: data.max_winners,
        status: 'upcoming',
      })
      .select()
      .single();

    if (createError) {
      logger.error('抽選セッション作成エラー:', createError);
      return { error: 'Failed to create lottery session' };
    }

    revalidatePath('/dashboard');
    return { data: lotterySession };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 抽選エントリーを作成
export async function enterLottery(data: LotteryEntryData) {
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

    // 抽選セッション情報取得
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select('*')
      .eq('id', data.lottery_session_id)
      .single();

    if (sessionError || !lotterySession) {
      return { error: 'Lottery session not found' };
    }

    // エントリー期間チェック
    const now = new Date();
    const entryStart = new Date(lotterySession.entry_start_time);
    const entryEnd = new Date(lotterySession.entry_end_time);

    if (now < entryStart) {
      return { error: 'Entry period has not started yet' };
    }

    if (now > entryEnd) {
      return { error: 'Entry period has ended' };
    }

    if (lotterySession.status !== 'accepting') {
      return { error: 'Lottery is not accepting entries' };
    }

    // 重複エントリーチェック
    const { data: existingEntry, error: checkError } = await supabase
      .from('lottery_entries')
      .select('id')
      .eq('lottery_session_id', data.lottery_session_id)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('エントリーチェックエラー:', checkError);
      return { error: 'Failed to check existing entry' };
    }

    if (existingEntry) {
      return { error: 'Already entered in this lottery' };
    }

    // エントリー作成
    const { data: entry, error: entryError } = await supabase
      .from('lottery_entries')
      .insert({
        lottery_session_id: data.lottery_session_id,
        user_id: user.id,
        message: data.message,
        status: 'entered',
      })
      .select()
      .single();

    if (entryError) {
      logger.error('エントリー作成エラー:', entryError);
      return { error: 'Failed to enter lottery' };
    }

    revalidatePath('/photo-sessions');
    return { data: entry };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 抽選を実行
export async function conductLottery(lotterySessionId: string) {
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

    // 抽選実行（ストアドプロシージャを使用）
    const { data: result, error } = await supabase.rpc('conduct_lottery', {
      lottery_session_id: lotterySessionId,
    });

    if (error) {
      logger.error('抽選実行エラー:', error);
      return { error: 'Failed to conduct lottery' };
    }

    revalidatePath('/dashboard');
    return { data: result };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 抽選撮影会の詳細を取得
export async function getLotterySession(photoSessionId: string) {
  try {
    const supabase = await createClient();

    const { data: lotterySession, error } = await supabase
      .from('lottery_sessions')
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
      logger.error('抽選セッション取得エラー:', error);
      return { error: 'Failed to fetch lottery session' };
    }

    return { data: lotterySession };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 抽選エントリー一覧を取得
export async function getLotteryEntries(lotterySessionId: string) {
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

    // 抽選セッションの所有者チェック
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions!inner(organizer_id)
      `
      )
      .eq('id', lotterySessionId)
      .single();

    if (sessionError || !lotterySession) {
      return { error: 'Lottery session not found' };
    }

    if (lotterySession.photo_session.organizer_id !== user.id) {
      return { error: 'Unauthorized' };
    }

    // エントリー一覧取得
    const { data: entries, error } = await supabase
      .from('lottery_entries')
      .select(
        `
        *,
        user:profiles!lottery_entries_user_id_fkey(*)
      `
      )
      .eq('lottery_session_id', lotterySessionId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('エントリー一覧取得エラー:', error);
      return { error: 'Failed to fetch lottery entries' };
    }

    return { data: entries };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// ユーザーの抽選エントリー状況を取得
export async function getUserLotteryEntry(lotterySessionId: string) {
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
      .from('lottery_entries')
      .select('*')
      .eq('lottery_session_id', lotterySessionId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('エントリー取得エラー:', error);
      return { error: 'Failed to fetch lottery entry' };
    }

    return { data: entry };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 抽選撮影会のステータスを更新
export async function updateLotterySessionStatus(
  lotterySessionId: string,
  status: 'upcoming' | 'accepting' | 'closed' | 'completed'
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

    // 抽選セッションの所有者チェック
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions!inner(organizer_id)
      `
      )
      .eq('id', lotterySessionId)
      .single();

    if (sessionError || !lotterySession) {
      return { error: 'Lottery session not found' };
    }

    if (lotterySession.photo_session.organizer_id !== user.id) {
      return { error: 'Unauthorized' };
    }

    // ステータス更新
    const { data: updatedSession, error: updateError } = await supabase
      .from('lottery_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', lotterySessionId)
      .select()
      .single();

    if (updateError) {
      logger.error('ステータス更新エラー:', updateError);
      return { error: 'Failed to update lottery status' };
    }

    revalidatePath('/dashboard');
    return { data: updatedSession };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}
