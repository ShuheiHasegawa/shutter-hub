'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  LotteryPhotoSession,
  LotteryEntry,
  LotteryPhotoSessionWithDetails,
  LotteryEntryWithUser,
} from '@/types/database';

// 抽選撮影会を作成
export async function createLotteryPhotoSession(data: {
  photo_session_id: string;
  entry_start: string;
  entry_end: string;
  lottery_date: string;
  winners_count: number;
}) {
  try {
    const supabase = await createClient();

    const { data: lotterySession, error } = await supabase
      .from('lottery_photo_sessions')
      .insert({
        photo_session_id: data.photo_session_id,
        entry_start: data.entry_start,
        entry_end: data.entry_end,
        lottery_date: data.lottery_date,
        winners_count: data.winners_count,
        status: 'upcoming',
      })
      .select()
      .single();

    if (error) {
      console.error('抽選撮影会作成エラー:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, data: lotterySession };
  } catch (error) {
    console.error('抽選撮影会作成エラー:', error);
    return { success: false, error: '抽選撮影会の作成に失敗しました' };
  }
}

// 抽選エントリーを作成
export async function createLotteryEntry(
  lotterySessionId: string,
  userId: string,
  applicationMessage?: string
) {
  try {
    const supabase = await createClient();

    // ストアドプロシージャを使用してエントリーを作成
    const { data, error } = await supabase.rpc('create_lottery_entry', {
      lottery_session_id: lotterySessionId,
      user_id: userId,
      message: applicationMessage || null,
    });

    if (error) {
      console.error('抽選エントリーエラー:', error);
      return { success: false, error: error.message };
    }

    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.message };
    }

    revalidatePath('/photo-sessions');
    return { success: true, data: { entry_id: result.entry_id } };
  } catch (error) {
    console.error('抽選エントリーエラー:', error);
    return { success: false, error: '抽選エントリーに失敗しました' };
  }
}

// 抽選を実行
export async function conductLottery(
  lotterySessionId: string,
  randomSeed?: string
) {
  try {
    const supabase = await createClient();

    // ストアドプロシージャを使用して抽選を実行
    const { data, error } = await supabase.rpc('conduct_lottery', {
      lottery_session_id: lotterySessionId,
      random_seed: randomSeed || null,
    });

    if (error) {
      console.error('抽選実行エラー:', error);
      return { success: false, error: error.message };
    }

    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.message };
    }

    // 当選者の撮影会予約を自動作成
    await createBookingsForWinners(lotterySessionId);

    revalidatePath('/dashboard');
    revalidatePath('/photo-sessions');

    return {
      success: true,
      data: {
        winners_count: result.winners_count,
        total_entries: result.total_entries,
        message: result.message,
      },
    };
  } catch (error) {
    console.error('抽選実行エラー:', error);
    return { success: false, error: '抽選の実行に失敗しました' };
  }
}

// 当選者の撮影会予約を自動作成
async function createBookingsForWinners(lotterySessionId: string) {
  try {
    const supabase = await createClient();

    // 当選者を取得
    const { data: winners, error: winnersError } = await supabase
      .from('lottery_entries')
      .select(
        `
        user_id,
        lottery_photo_session_id,
        lottery_photo_sessions!inner(photo_session_id)
      `
      )
      .eq('lottery_photo_session_id', lotterySessionId)
      .eq('status', 'won');

    if (winnersError) {
      console.error('当選者取得エラー:', winnersError);
      return;
    }

    if (!winners || winners.length === 0) {
      return;
    }

    // 抽選撮影会から撮影会IDを取得
    const { data: lotterySession, error: lotteryError } = await supabase
      .from('lottery_photo_sessions')
      .select('photo_session_id')
      .eq('id', lotterySessionId)
      .single();

    if (lotteryError || !lotterySession) {
      console.error('抽選撮影会取得エラー:', lotteryError);
      return;
    }

    // 各当選者の予約を作成
    for (const winner of winners) {
      const { error: bookingError } = await supabase.from('bookings').insert({
        photo_session_id: lotterySession.photo_session_id,
        user_id: winner.user_id,
        status: 'confirmed',
      });

      if (bookingError) {
        console.error('当選者予約作成エラー:', bookingError);
      }
    }

    // 撮影会の参加者数を更新
    const photoSessionId = lotterySession.photo_session_id;
    if (photoSessionId) {
      const { error: updateError } = await supabase
        .from('photo_sessions')
        .update({
          current_participants: winners.length,
        })
        .eq('id', photoSessionId);

      if (updateError) {
        console.error('撮影会参加者数更新エラー:', updateError);
      }
    }
  } catch (error) {
    console.error('当選者予約作成エラー:', error);
  }
}

// 抽選撮影会の詳細を取得
export async function getLotteryPhotoSession(id: string): Promise<{
  success: boolean;
  data?: LotteryPhotoSessionWithDetails;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lottery_photo_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions!inner(
          *,
          organizer:profiles!photo_sessions_organizer_id_fkey(*)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('抽選撮影会取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as LotteryPhotoSessionWithDetails };
  } catch (error) {
    console.error('抽選撮影会取得エラー:', error);
    return { success: false, error: '抽選撮影会の取得に失敗しました' };
  }
}

// 抽選エントリー一覧を取得
export async function getLotteryEntries(lotterySessionId: string): Promise<{
  success: boolean;
  data?: LotteryEntryWithUser[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lottery_entries')
      .select(
        `
        *,
        user:profiles!lottery_entries_user_id_fkey(*)
      `
      )
      .eq('lottery_photo_session_id', lotterySessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('抽選エントリー取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as LotteryEntryWithUser[] };
  } catch (error) {
    console.error('抽選エントリー取得エラー:', error);
    return { success: false, error: '抽選エントリーの取得に失敗しました' };
  }
}

// ユーザーの抽選エントリー状況を取得
export async function getUserLotteryEntry(
  lotterySessionId: string,
  userId: string
): Promise<{
  success: boolean;
  data?: LotteryEntry;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lottery_entries')
      .select('*')
      .eq('lottery_photo_session_id', lotterySessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('ユーザー抽選エントリー取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data };
  } catch (error) {
    console.error('ユーザー抽選エントリー取得エラー:', error);
    return { success: false, error: 'エントリー状況の取得に失敗しました' };
  }
}

// 抽選撮影会のステータスを更新
export async function updateLotteryPhotoSessionStatus(
  id: string,
  status: LotteryPhotoSession['status']
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('lottery_photo_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('抽選撮影会ステータス更新エラー:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/photo-sessions');
    return { success: true };
  } catch (error) {
    console.error('抽選撮影会ステータス更新エラー:', error);
    return { success: false, error: 'ステータスの更新に失敗しました' };
  }
}

// 抽選撮影会一覧を取得
export async function getLotteryPhotoSessions(options?: {
  status?: LotteryPhotoSession['status'];
  organizerId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: LotteryPhotoSessionWithDetails[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('lottery_photo_sessions')
      .select(
        `
        *,
        photo_session:photo_sessions!inner(
          *,
          organizer:profiles!photo_sessions_organizer_id_fkey(*)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.organizerId) {
      query = query.eq('photo_session.organizer_id', options.organizerId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('抽選撮影会一覧取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as LotteryPhotoSessionWithDetails[] };
  } catch (error) {
    console.error('抽選撮影会一覧取得エラー:', error);
    return { success: false, error: '抽選撮影会一覧の取得に失敗しました' };
  }
}
