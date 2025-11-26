'use server';

import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import { requireAuthForAction } from '@/lib/auth/server-actions';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/app/actions/notifications';

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
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // ストアドプロシージャを使用して当選者選出
    const { data: result, error } = await supabase.rpc(
      'select_admin_lottery_winners',
      {
        p_session_id: data.session_id,
        p_entry_ids: data.entry_ids,
        p_selected_by_user_id: user.id,
        p_selection_reason: data.selection_reason,
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
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合はnullを返す（エラーではない）
        logger.info('管理抽選セッションが見つかりません:', photoSessionId);
        return { data: null };
      }
      logger.error('管理抽選セッション取得エラー:', error);
      return { error: 'Failed to fetch admin lottery session' };
    }

    return { data: adminLotterySession };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 管理抽選応募一覧を取得（スロット別、lottery_weight計算付き）
export async function getAdminLotteryEntries(sessionId: string) {
  try {
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // 管理抽選セッションの所有者チェック（複数スロット抽選設定も取得）
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

    // 応募一覧取得（スロット情報、推しモデル情報を含む）
    const { data: entries, error } = await supabase
      .from('admin_lottery_entries')
      .select(
        `
        *,
        user:profiles!admin_lottery_entries_user_id_fkey(*),
        slot:photo_session_slots(id, slot_number),
        preferred_model:profiles!admin_lottery_entries_preferred_model_id_fkey(id, display_name)
      `
      )
      .eq('admin_lottery_session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('応募一覧取得エラー:', error);
      return { error: 'Failed to fetch admin lottery entries' };
    }

    // lottery_weightが有効な場合、各エントリーのlottery_weightを計算
    if (
      adminLotterySession.enable_lottery_weight &&
      entries &&
      entries.length > 0
    ) {
      // 各ユーザーが応募したスロット数を計算
      const userSlotCounts = new Map<string, number>();
      entries.forEach(entry => {
        const count = userSlotCounts.get(entry.user_id) || 0;
        userSlotCounts.set(entry.user_id, count + 1);
      });

      // 各エントリーのlottery_weightを計算・更新
      const weightMultiplier = adminLotterySession.weight_multiplier || 1.0;
      const calculationMethod =
        adminLotterySession.weight_calculation_method || 'linear';

      for (const entry of entries) {
        const totalSlotsApplied = userSlotCounts.get(entry.user_id) || 1;

        let calculatedWeight: number;
        if (calculationMethod === 'linear') {
          // 線形: 応募スロット数 * 倍率
          calculatedWeight = totalSlotsApplied * weightMultiplier;
        } else if (calculationMethod === 'bonus') {
          // ボーナス: 1.0 + (応募スロット数 - 1) * 倍率
          calculatedWeight = 1.0 + (totalSlotsApplied - 1) * weightMultiplier;
        } else {
          // custom: 線形と同じ
          calculatedWeight = totalSlotsApplied * weightMultiplier;
        }

        // lottery_weightが未設定または異なる場合は更新
        if (
          !entry.lottery_weight ||
          entry.lottery_weight !== calculatedWeight
        ) {
          const { error: updateError } = await supabase
            .from('admin_lottery_entries')
            .update({ lottery_weight: calculatedWeight })
            .eq('id', entry.id);

          if (updateError) {
            logger.error('lottery_weight更新エラー:', updateError);
          } else {
            entry.lottery_weight = calculatedWeight;
          }
        }
      }
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
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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

// 運営者が対応すべき管理抽選一覧を取得（ダッシュボード警告用）
export async function getPendingAdminLotterySelections() {
  try {
    // 認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // 現在時刻と3日後の日時
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 運営者が所有する管理抽選で、未完了かつ選択期限が近い（または過ぎている）ものを取得
    const { data: pendingSessions, error } = await supabase
      .from('admin_lottery_sessions')
      .select(
        `
        id,
        status,
        selection_deadline,
        max_selections,
        photo_session:photo_sessions!inner(
          id,
          title,
          organizer_id,
          start_time
        )
      `
      )
      .eq('photo_session.organizer_id', user.id)
      .neq('status', 'completed')
      .lte('selection_deadline', threeDaysLater.toISOString())
      .order('selection_deadline', { ascending: true });

    if (error) {
      logger.error('未処理管理抽選取得エラー:', error);
      return { error: 'Failed to fetch pending admin lottery sessions' };
    }

    // 結果を整形
    const result = (pendingSessions || []).map(session => {
      const deadline = new Date(session.selection_deadline);
      const isOverdue = deadline < now;
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      return {
        id: session.id,
        photoSessionId: session.photo_session?.id,
        photoSessionTitle: session.photo_session?.title,
        eventDate: session.photo_session?.start_time,
        selectionDeadline: session.selection_deadline,
        maxSelections: session.max_selections,
        status: session.status,
        isOverdue,
        daysUntilDeadline,
      };
    });

    return { data: result };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 期限超過した管理抽選の自動選択を実行する
export async function autoSelectAdminLotteryWinners(sessionId?: string) {
  try {
    // 認証チェック（管理者または運営者のみ実行可能）
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    const now = new Date();

    // 対象の管理抽選セッションを取得
    let query = supabase
      .from('admin_lottery_sessions')
      .select(
        `
        id,
        max_selections,
        status,
        selection_deadline,
        enable_lottery_weight,
        weight_calculation_method,
        weight_multiplier,
        photo_session:photo_sessions!inner(
          id,
          title,
          organizer_id
        )
      `
      )
      .neq('status', 'completed')
      .lt('selection_deadline', now.toISOString());

    // 特定のセッションIDが指定されている場合
    if (sessionId) {
      query = query.eq('id', sessionId);
    }

    const { data: overdueSessions, error: fetchError } = await query;

    if (fetchError) {
      logger.error('期限超過セッション取得エラー:', fetchError);
      return { error: 'Failed to fetch overdue sessions' };
    }

    if (!overdueSessions || overdueSessions.length === 0) {
      return {
        data: { processedCount: 0, message: '処理対象の管理抽選はありません' },
      };
    }

    const results: Array<{
      sessionId: string;
      photoSessionTitle: string;
      selectedCount: number;
      organizerId: string;
    }> = [];

    for (const session of overdueSessions) {
      // 運営者のみが自分のセッションを処理できる（または管理者）
      if (session.photo_session.organizer_id !== user.id) {
        logger.warn('権限なし: 他の運営者のセッションは処理できません', {
          sessionId: session.id,
          userId: user.id,
        });
        continue;
      }

      // 応募エントリーを取得
      const { data: entries, error: entriesError } = await supabase
        .from('admin_lottery_entries')
        .select('*')
        .eq('admin_lottery_session_id', session.id)
        .eq('status', 'applied')
        .order('lottery_weight', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (entriesError) {
        logger.error('エントリー取得エラー:', entriesError);
        continue;
      }

      if (!entries || entries.length === 0) {
        // 応募者がいない場合はステータスを完了に更新
        await supabase
          .from('admin_lottery_sessions')
          .update({ status: 'completed', updated_at: now.toISOString() })
          .eq('id', session.id);
        continue;
      }

      // lottery_weightが有効な場合は重み順、そうでない場合は応募順で選択
      let sortedEntries = entries;
      if (session.enable_lottery_weight) {
        sortedEntries = entries.sort((a, b) => {
          const weightA = a.lottery_weight || 0;
          const weightB = b.lottery_weight || 0;
          if (weightB !== weightA) return weightB - weightA;
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }

      // 上位N件を選択
      const entriesToSelect = sortedEntries.slice(0, session.max_selections);
      const entryIdsToSelect = entriesToSelect.map(e => e.id);

      // ストアドプロシージャを使用して当選者選出
      const { error: selectError } = await supabase.rpc(
        'select_admin_lottery_winners',
        {
          p_session_id: session.id,
          p_entry_ids: entryIdsToSelect,
          p_selected_by_user_id: user.id,
          p_selection_reason: '選択期限超過による自動選択',
        }
      );

      if (selectError) {
        logger.error('自動選択エラー:', selectError);
        continue;
      }

      results.push({
        sessionId: session.id,
        photoSessionTitle: session.photo_session.title,
        selectedCount: entryIdsToSelect.length,
        organizerId: session.photo_session.organizer_id,
      });

      // 運営者に通知を送信
      try {
        await createNotification({
          userId: session.photo_session.organizer_id,
          type: 'admin_lottery_auto_selection',
          category: 'photo_session',
          priority: 'high',
          title: '管理抽選の自動選択が実行されました',
          message: `「${session.photo_session.title}」の当選者選択期限が過ぎたため、自動選択が実行されました。${entryIdsToSelect.length}名が当選者として選択されました。`,
          data: {
            admin_lottery_session_id: session.id,
            photo_session_id: session.photo_session.id,
            photo_session_title: session.photo_session.title,
            selected_count: entryIdsToSelect.length,
          },
          relatedEntityType: 'photo_session',
          relatedEntityId: session.photo_session.id,
          actionUrl: `/photo-sessions/${session.photo_session.id}`,
          actionLabel: '詳細を確認',
        });
      } catch (notificationError) {
        logger.error('自動選択通知送信エラー:', notificationError);
        // 通知エラーは処理を中断しない
      }

      logger.info('自動選択完了:', {
        sessionId: session.id,
        photoSessionTitle: session.photo_session.title,
        selectedCount: entryIdsToSelect.length,
      });
    }

    return {
      data: {
        processedCount: results.length,
        results,
        message: `${results.length}件の管理抽選で自動選択を実行しました`,
      },
    };
  } catch (error) {
    logger.error('自動選択処理エラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}
