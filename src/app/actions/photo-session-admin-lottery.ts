'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  AdminLotteryPhotoSession,
  AdminLotteryEntry,
  AdminLotteryPhotoSessionWithDetails,
  AdminLotteryEntryWithUser,
  AdminLotteryStats,
  SelectionCriteria,
} from '@/types/database';

// 管理抽選撮影会を作成
export async function createAdminLotteryPhotoSession(data: {
  photo_session_id: string;
  entry_start: string;
  entry_end: string;
  selection_deadline: string;
  winners_count: number;
  created_by: string;
}) {
  try {
    const supabase = await createClient();

    const { data: adminLotterySession, error } = await supabase
      .from('admin_lottery_photo_sessions')
      .insert({
        photo_session_id: data.photo_session_id,
        entry_start: data.entry_start,
        entry_end: data.entry_end,
        selection_deadline: data.selection_deadline,
        winners_count: data.winners_count,
        created_by: data.created_by,
        status: 'upcoming',
      })
      .select()
      .single();

    if (error) {
      console.error('管理抽選撮影会作成エラー:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, data: adminLotterySession };
  } catch (error) {
    console.error('管理抽選撮影会作成エラー:', error);
    return { success: false, error: '管理抽選撮影会の作成に失敗しました' };
  }
}

// 管理抽選エントリーを作成
export async function createAdminLotteryEntry(
  adminLotterySessionId: string,
  userId: string,
  applicationMessage?: string
) {
  try {
    const supabase = await createClient();

    // ストアドプロシージャを使用してエントリーを作成
    const { data, error } = await supabase.rpc('create_admin_lottery_entry', {
      admin_lottery_session_id: adminLotterySessionId,
      user_id: userId,
      message: applicationMessage || null,
    });

    if (error) {
      console.error('管理抽選エントリーエラー:', error);
      return { success: false, error: error.message };
    }

    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.message };
    }

    revalidatePath('/photo-sessions');
    return { success: true, data: { entry_id: result.entry_id } };
  } catch (error) {
    console.error('管理抽選エントリーエラー:', error);
    return { success: false, error: '管理抽選エントリーに失敗しました' };
  }
}

// 応募者を選出
export async function selectAdminLotteryWinners(
  adminLotterySessionId: string,
  selectedUserIds: string[],
  selectedByUserId: string,
  selectionNotes?: string
) {
  try {
    const supabase = await createClient();

    // ストアドプロシージャを使用して選出を実行
    const { data, error } = await supabase.rpc('select_admin_lottery_winners', {
      admin_lottery_session_id: adminLotterySessionId,
      selected_user_ids: selectedUserIds,
      selected_by_user_id: selectedByUserId,
      selection_notes: selectionNotes || null,
    });

    if (error) {
      console.error('管理抽選選出エラー:', error);
      return { success: false, error: error.message };
    }

    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.message };
    }

    // 選出者の撮影会予約を自動作成
    await createBookingsForSelectedWinners(
      adminLotterySessionId,
      selectedUserIds
    );

    revalidatePath('/dashboard');
    revalidatePath('/photo-sessions');

    return {
      success: true,
      data: {
        winners_count: result.winners_count,
        message: result.message,
      },
    };
  } catch (error) {
    console.error('管理抽選選出エラー:', error);
    return { success: false, error: '応募者の選出に失敗しました' };
  }
}

// 選出者の撮影会予約を自動作成
async function createBookingsForSelectedWinners(
  adminLotterySessionId: string,
  selectedUserIds: string[]
) {
  try {
    const supabase = await createClient();

    // 管理抽選撮影会から撮影会IDを取得
    const { data: adminLotterySession, error: sessionError } = await supabase
      .from('admin_lottery_photo_sessions')
      .select('photo_session_id')
      .eq('id', adminLotterySessionId)
      .single();

    if (sessionError || !adminLotterySession) {
      console.error('管理抽選撮影会取得エラー:', sessionError);
      return;
    }

    // 各選出者の予約を作成
    for (const userId of selectedUserIds) {
      const { error: bookingError } = await supabase.from('bookings').insert({
        photo_session_id: adminLotterySession.photo_session_id,
        user_id: userId,
        status: 'confirmed',
      });

      if (bookingError) {
        console.error('選出者予約作成エラー:', bookingError);
      }
    }

    // 撮影会の参加者数を更新
    const { error: updateError } = await supabase
      .from('photo_sessions')
      .update({
        current_participants: selectedUserIds.length,
      })
      .eq('id', adminLotterySession.photo_session_id);

    if (updateError) {
      console.error('撮影会参加者数更新エラー:', updateError);
    }
  } catch (error) {
    console.error('選出者予約作成エラー:', error);
  }
}

// 管理抽選撮影会の詳細を取得
export async function getAdminLotteryPhotoSession(id: string): Promise<{
  success: boolean;
  data?: AdminLotteryPhotoSessionWithDetails;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('admin_lottery_photo_sessions')
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
      console.error('管理抽選撮影会取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as AdminLotteryPhotoSessionWithDetails };
  } catch (error) {
    console.error('管理抽選撮影会取得エラー:', error);
    return { success: false, error: '管理抽選撮影会の取得に失敗しました' };
  }
}

// 管理抽選エントリー一覧を取得
export async function getAdminLotteryEntries(
  adminLotterySessionId: string
): Promise<{
  success: boolean;
  data?: AdminLotteryEntryWithUser[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('admin_lottery_entries')
      .select(
        `
        *,
        user:profiles!admin_lottery_entries_user_id_fkey(*)
      `
      )
      .eq('admin_lottery_photo_session_id', adminLotterySessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('管理抽選エントリー取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as AdminLotteryEntryWithUser[] };
  } catch (error) {
    console.error('管理抽選エントリー取得エラー:', error);
    return { success: false, error: '管理抽選エントリーの取得に失敗しました' };
  }
}

// ユーザーの管理抽選エントリー状況を取得
export async function getUserAdminLotteryEntry(
  adminLotterySessionId: string,
  userId: string
): Promise<{
  success: boolean;
  data?: AdminLotteryEntry;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('admin_lottery_entries')
      .select('*')
      .eq('admin_lottery_photo_session_id', adminLotterySessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('ユーザー管理抽選エントリー取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data };
  } catch (error) {
    console.error('ユーザー管理抽選エントリー取得エラー:', error);
    return { success: false, error: 'エントリー状況の取得に失敗しました' };
  }
}

// 管理抽選撮影会のステータスを更新
export async function updateAdminLotteryPhotoSessionStatus(
  id: string,
  status: AdminLotteryPhotoSession['status']
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('admin_lottery_photo_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('管理抽選撮影会ステータス更新エラー:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/photo-sessions');
    return { success: true };
  } catch (error) {
    console.error('管理抽選撮影会ステータス更新エラー:', error);
    return { success: false, error: 'ステータスの更新に失敗しました' };
  }
}

// 管理抽選統計情報を取得
export async function getAdminLotteryStats(
  adminLotterySessionId: string
): Promise<{
  success: boolean;
  data?: AdminLotteryStats;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_admin_lottery_stats', {
      admin_lottery_session_id: adminLotterySessionId,
    });

    if (error) {
      console.error('管理抽選統計取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] as AdminLotteryStats };
  } catch (error) {
    console.error('管理抽選統計取得エラー:', error);
    return { success: false, error: '統計情報の取得に失敗しました' };
  }
}

// 選出基準を作成
export async function createSelectionCriteria(data: {
  admin_lottery_photo_session_id: string;
  criteria_name: string;
  weight: number;
  description?: string;
}) {
  try {
    const supabase = await createClient();

    const { data: criteria, error } = await supabase
      .from('selection_criteria')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('選出基準作成エラー:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, data: criteria };
  } catch (error) {
    console.error('選出基準作成エラー:', error);
    return { success: false, error: '選出基準の作成に失敗しました' };
  }
}

// 選出基準一覧を取得
export async function getSelectionCriteria(
  adminLotterySessionId: string
): Promise<{
  success: boolean;
  data?: SelectionCriteria[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('selection_criteria')
      .select('*')
      .eq('admin_lottery_photo_session_id', adminLotterySessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('選出基準取得エラー:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SelectionCriteria[] };
  } catch (error) {
    console.error('選出基準取得エラー:', error);
    return { success: false, error: '選出基準の取得に失敗しました' };
  }
}

// 管理抽選撮影会一覧を取得
export async function getAdminLotteryPhotoSessions(options?: {
  status?: AdminLotteryPhotoSession['status'];
  organizerId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: AdminLotteryPhotoSessionWithDetails[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('admin_lottery_photo_sessions')
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
      console.error('管理抽選撮影会一覧取得エラー:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as AdminLotteryPhotoSessionWithDetails[],
    };
  } catch (error) {
    console.error('管理抽選撮影会一覧取得エラー:', error);
    return { success: false, error: '管理抽選撮影会一覧の取得に失敗しました' };
  }
}
