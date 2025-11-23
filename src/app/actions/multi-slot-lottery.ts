'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type {
  CreateMultiSlotLotteryEntryData,
  LotteryEntryGroup,
  LotterySlotEntry,
  LotteryResult,
  LotteryStatistics,
} from '@/types/multi-slot-lottery';

/**
 * 複数スロット抽選エントリーを作成
 */
export async function createMultiSlotLotteryEntry(
  data: CreateMultiSlotLotteryEntryData
): Promise<{ success: boolean; error?: string; group_id?: string }> {
  const supabase = await createClient();

  try {
    // ユーザー認証確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 抽選セッションの存在確認
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select('*')
      .eq('id', data.lottery_session_id)
      .single();

    if (sessionError || !lotterySession) {
      logger.error('抽選セッション取得エラー', {
        lottery_session_id: data.lottery_session_id,
        error: sessionError,
      });
      return { success: false, error: '抽選セッションが見つかりません' };
    }

    logger.debug('抽選セッション取得成功', {
      lottery_session_id: lotterySession.id,
      entry_start_time: lotterySession.entry_start_time,
      entry_end_time: lotterySession.entry_end_time,
      status: lotterySession.status,
    });

    // エントリー期間の確認
    const now = new Date();

    // エントリー期間が設定されているか確認
    if (!lotterySession.entry_start_time || !lotterySession.entry_end_time) {
      logger.error('エントリー期間が設定されていません', {
        lottery_session_id: data.lottery_session_id,
        entry_start_time: lotterySession.entry_start_time,
        entry_end_time: lotterySession.entry_end_time,
      });
      return {
        success: false,
        error: 'エントリー期間が設定されていません',
      };
    }

    const entryStart = new Date(lotterySession.entry_start_time);
    const entryEnd = new Date(lotterySession.entry_end_time);

    logger.debug('エントリー期間チェック', {
      now: now.toISOString(),
      entryStart: entryStart.toISOString(),
      entryEnd: entryEnd.toISOString(),
      isBeforeStart: now < entryStart,
      isAfterEnd: now > entryEnd,
    });

    if (now < entryStart || now > entryEnd) {
      return {
        success: false,
        error: `エントリー期間外です（期間: ${entryStart.toLocaleString('ja-JP')} ～ ${entryEnd.toLocaleString('ja-JP')}）`,
      };
    }

    // 既存のグループを確認
    const { data: existingGroup } = await supabase
      .from('lottery_entry_groups')
      .select('id, update_count')
      .eq('lottery_session_id', data.lottery_session_id)
      .eq('user_id', user.id)
      .single();

    // 既存エントリーがある場合は更新処理を呼び出す
    if (existingGroup) {
      // updateMultiSlotLotteryEntry関数を呼び出し
      const updateResult = await updateMultiSlotLotteryEntry(data);
      return updateResult;
    }

    // スロットの存在確認
    const slotIds = data.slot_entries.map(entry => entry.slot_id);
    const { data: slots, error: slotsError } = await supabase
      .from('photo_session_slots')
      .select('id, photo_session_id, slot_number')
      .in('id', slotIds);

    if (slotsError || !slots || slots.length !== slotIds.length) {
      return {
        success: false,
        error: '無効なスロットが含まれています',
      };
    }

    // 撮影会IDを取得
    const photoSessionId = slots[0].photo_session_id;

    // スロットごとのエントリー上限チェック（max_entriesが設定されている場合）
    if (
      lotterySession.max_entries !== null &&
      lotterySession.max_entries !== undefined
    ) {
      for (const slotId of slotIds) {
        // 現在のスロットのエントリー数を取得
        const { count: currentEntryCount, error: countError } = await supabase
          .from('lottery_slot_entries')
          .select('id', { count: 'exact', head: true })
          .eq('lottery_session_id', data.lottery_session_id)
          .eq('slot_id', slotId)
          .eq('status', 'entered');

        if (countError) {
          logger.error('エントリー数取得エラー:', countError);
          return {
            success: false,
            error: 'エントリー数の確認に失敗しました',
          };
        }

        // 上限チェック
        if ((currentEntryCount || 0) >= lotterySession.max_entries) {
          const slot = slots.find(s => s.id === slotId);
          return {
            success: false,
            error: `枠${slot?.slot_number || ''}のエントリー上限（${lotterySession.max_entries}件）に達しています`,
          };
        }
      }
    }

    // 推しモデル選択が有効な場合、モデルの所属確認
    if (lotterySession.enable_model_selection) {
      const modelIds = data.slot_entries
        .map(entry => entry.preferred_model_id)
        .filter((id): id is string => !!id);

      if (modelIds.length > 0) {
        const { data: organizerModels, error: modelsError } = await supabase
          .from('organizer_models')
          .select('model_id')
          .eq(
            'organizer_id',
            (
              await supabase
                .from('photo_sessions')
                .select('organizer_id')
                .eq('id', photoSessionId)
                .single()
            ).data?.organizer_id
          )
          .in('model_id', modelIds)
          .eq('status', 'active');

        if (modelsError || !organizerModels) {
          return {
            success: false,
            error: '無効なモデルが含まれています',
          };
        }
      }
    }

    // トランザクション開始（Supabaseでは複数クエリで実現）
    // 1. グループを作成
    const { data: group, error: groupError } = await supabase
      .from('lottery_entry_groups')
      .insert({
        lottery_session_id: data.lottery_session_id,
        user_id: user.id,
        cancellation_policy: data.cancellation_policy,
        total_slots_applied: data.slot_entries.length,
        group_status: 'entered',
      })
      .select()
      .single();

    if (groupError || !group) {
      logger.error('グループ作成エラー:', groupError);
      return {
        success: false,
        error: 'エントリーの作成に失敗しました',
      };
    }

    // 2. スロットエントリーを作成
    const slotEntries = data.slot_entries.map(entry => ({
      lottery_session_id: data.lottery_session_id,
      lottery_entry_group_id: group.id,
      slot_id: entry.slot_id,
      user_id: user.id,
      preferred_model_id: entry.preferred_model_id || null,
      cheki_unsigned_count: entry.cheki_unsigned_count || 0,
      cheki_signed_count: entry.cheki_signed_count || 0,
      lottery_weight: 1.0, // 初期値、抽選時に再計算
      status: 'entered' as const,
    }));

    const { error: entriesError } = await supabase
      .from('lottery_slot_entries')
      .insert(slotEntries);

    if (entriesError) {
      // ロールバック: グループを削除
      await supabase.from('lottery_entry_groups').delete().eq('id', group.id);

      logger.error('スロットエントリー作成エラー:', entriesError);
      return {
        success: false,
        error: 'エントリーの作成に失敗しました',
      };
    }

    return {
      success: true,
      group_id: group.id,
    };
  } catch (error) {
    logger.error('複数スロット抽選エントリー作成エラー:', error);
    return {
      success: false,
      error: 'エントリーの作成中にエラーが発生しました',
    };
  }
}

/**
 * 複数スロット抽選エントリーを更新
 */
export async function updateMultiSlotLotteryEntry(
  data: CreateMultiSlotLotteryEntryData
): Promise<{ success: boolean; error?: string; group_id?: string }> {
  const supabase = await createClient();

  try {
    // ユーザー認証確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 抽選セッションの存在確認
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select('*')
      .eq('id', data.lottery_session_id)
      .single();

    if (sessionError || !lotterySession) {
      logger.error('抽選セッション取得エラー', {
        lottery_session_id: data.lottery_session_id,
        error: sessionError,
      });
      return { success: false, error: '抽選セッションが見つかりません' };
    }

    // エントリー期間の確認
    const now = new Date();

    if (!lotterySession.entry_start_time || !lotterySession.entry_end_time) {
      return {
        success: false,
        error: 'エントリー期間が設定されていません',
      };
    }

    const entryStart = new Date(lotterySession.entry_start_time);
    const entryEnd = new Date(lotterySession.entry_end_time);

    if (now < entryStart || now > entryEnd) {
      return {
        success: false,
        error: `エントリー期間外です（期間: ${entryStart.toLocaleString('ja-JP')} ～ ${entryEnd.toLocaleString('ja-JP')}）`,
      };
    }

    // 抽選実行済みチェック
    if (
      lotterySession.status === 'completed' ||
      lotterySession.status === 'closed'
    ) {
      return {
        success: false,
        error: '抽選が実行済みのため変更できません',
      };
    }

    // 既存のグループを取得
    const { data: existingGroup, error: groupFetchError } = await supabase
      .from('lottery_entry_groups')
      .select('id, update_count')
      .eq('lottery_session_id', data.lottery_session_id)
      .eq('user_id', user.id)
      .single();

    if (groupFetchError || !existingGroup) {
      return {
        success: false,
        error: 'エントリーが見つかりません',
      };
    }

    // 変更回数制限チェック（3回まで）
    if (existingGroup.update_count >= 3) {
      return {
        success: false,
        error: '変更回数の上限に達しています（最大3回）',
      };
    }

    // スロットの存在確認
    const slotIds = data.slot_entries.map(entry => entry.slot_id);
    const { data: slots, error: slotsError } = await supabase
      .from('photo_session_slots')
      .select('id, photo_session_id, slot_number')
      .in('id', slotIds);

    if (slotsError || !slots || slots.length !== slotIds.length) {
      return {
        success: false,
        error: '無効なスロットが含まれています',
      };
    }

    // 撮影会IDを取得
    const photoSessionId = slots[0].photo_session_id;

    // スロットごとのエントリー上限チェック（max_entriesが設定されている場合）
    if (
      lotterySession.max_entries !== null &&
      lotterySession.max_entries !== undefined
    ) {
      for (const slotId of slotIds) {
        // 現在のスロットのエントリー数を取得
        const { count: currentEntryCount, error: countError } = await supabase
          .from('lottery_slot_entries')
          .select('id', { count: 'exact', head: true })
          .eq('lottery_session_id', data.lottery_session_id)
          .eq('slot_id', slotId)
          .eq('status', 'entered');

        if (countError) {
          logger.error('エントリー数取得エラー:', countError);
          return {
            success: false,
            error: 'エントリー数の確認に失敗しました',
          };
        }

        // 既存エントリーを除外してカウント（更新の場合）
        let finalEntryCount = currentEntryCount || 0;
        const { count: existingEntryCount, error: existingCountError } =
          await supabase
            .from('lottery_slot_entries')
            .select('id', { count: 'exact', head: true })
            .eq('lottery_entry_group_id', existingGroup.id)
            .eq('slot_id', slotId)
            .eq('status', 'entered');

        if (!existingCountError && existingEntryCount) {
          finalEntryCount = Math.max(0, finalEntryCount - existingEntryCount);
        }

        // 上限チェック
        if (finalEntryCount >= lotterySession.max_entries) {
          const slot = slots.find(s => s.id === slotId);
          return {
            success: false,
            error: `枠${slot?.slot_number || ''}のエントリー上限（${lotterySession.max_entries}件）に達しています`,
          };
        }
      }
    }

    // 推しモデル選択が有効な場合、モデルの所属確認
    if (lotterySession.enable_model_selection) {
      const modelIds = data.slot_entries
        .map(entry => entry.preferred_model_id)
        .filter((id): id is string => !!id);

      if (modelIds.length > 0) {
        const { data: photoSession } = await supabase
          .from('photo_sessions')
          .select('organizer_id')
          .eq('id', photoSessionId)
          .single();

        const { data: organizerModels, error: modelsError } = await supabase
          .from('organizer_models')
          .select('model_id')
          .eq('organizer_id', photoSession?.organizer_id)
          .in('model_id', modelIds)
          .eq('status', 'active');

        if (modelsError || !organizerModels) {
          return {
            success: false,
            error: '無効なモデルが含まれています',
          };
        }
      }
    }

    // トランザクション処理
    // 1. 既存のlottery_slot_entriesを削除
    const { error: deleteError } = await supabase
      .from('lottery_slot_entries')
      .delete()
      .eq('lottery_entry_group_id', existingGroup.id);

    if (deleteError) {
      logger.error('スロットエントリー削除エラー:', deleteError);
      return {
        success: false,
        error: 'エントリーの更新に失敗しました',
      };
    }

    // 2. 新しいlottery_slot_entriesを作成
    const slotEntries = data.slot_entries.map(entry => ({
      lottery_session_id: data.lottery_session_id,
      lottery_entry_group_id: existingGroup.id,
      slot_id: entry.slot_id,
      user_id: user.id,
      preferred_model_id: entry.preferred_model_id || null,
      cheki_unsigned_count: entry.cheki_unsigned_count || 0,
      cheki_signed_count: entry.cheki_signed_count || 0,
      lottery_weight: 1.0, // 初期値、抽選時に再計算
      status: 'entered' as const,
    }));

    const { error: entriesError } = await supabase
      .from('lottery_slot_entries')
      .insert(slotEntries);

    if (entriesError) {
      logger.error('スロットエントリー作成エラー:', entriesError);
      return {
        success: false,
        error: 'エントリーの更新に失敗しました',
      };
    }

    // 3. lottery_entry_groupsを更新（update_countをインクリメント、updated_atを更新）
    const { error: updateError } = await supabase
      .from('lottery_entry_groups')
      .update({
        cancellation_policy: data.cancellation_policy,
        total_slots_applied: data.slot_entries.length,
        update_count: existingGroup.update_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingGroup.id);

    if (updateError) {
      logger.error('グループ更新エラー:', updateError);
      return {
        success: false,
        error: 'エントリーの更新に失敗しました',
      };
    }

    return {
      success: true,
      group_id: existingGroup.id,
    };
  } catch (error) {
    logger.error('複数スロット抽選エントリー更新エラー:', error);
    return {
      success: false,
      error: 'エントリーの更新中にエラーが発生しました',
    };
  }
}

/**
 * 重み付き抽選を実行
 */
export async function executeWeightedLottery(
  lotterySessionId: string
): Promise<LotteryResult> {
  const supabase = await createClient();

  try {
    // ユーザー認証確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: 'ログインが必要です',
        total_winners: 0,
        total_entries: 0,
      };
    }

    // 抽選セッションの存在確認と主催者確認
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select('*, photo_sessions!inner(organizer_id)')
      .eq('id', lotterySessionId)
      .single();

    if (sessionError || !lotterySession) {
      return {
        success: false,
        message: '抽選セッションが見つかりません',
        total_winners: 0,
        total_entries: 0,
      };
    }

    // 主催者確認
    const photoSessionForExecute = Array.isArray(lotterySession.photo_sessions)
      ? lotterySession.photo_sessions[0]
      : lotterySession.photo_sessions;
    if (
      !photoSessionForExecute ||
      photoSessionForExecute.organizer_id !== user.id
    ) {
      return {
        success: false,
        message: '主催者のみ抽選を実行できます',
        total_winners: 0,
        total_entries: 0,
      };
    }

    // 抽選実行
    const { data: lotteryResult, error: lotteryError } = await supabase.rpc(
      'execute_weighted_lottery',
      {
        p_lottery_session_id: lotterySessionId,
      }
    );

    if (lotteryError || !lotteryResult || lotteryResult.length === 0) {
      logger.error('抽選実行エラー:', lotteryError);
      return {
        success: false,
        message: '抽選の実行に失敗しました',
        total_winners: 0,
        total_entries: 0,
      };
    }

    const result = lotteryResult[0];

    // 予約を作成
    const { data: bookingResult, error: bookingError } = await supabase.rpc(
      'create_bookings_from_lottery_winners',
      {
        p_lottery_session_id: lotterySessionId,
      }
    );

    if (bookingError) {
      logger.error('予約作成エラー:', bookingError);
      // 抽選は成功しているので、警告として扱う
    }

    return {
      success: result.success,
      message: result.message,
      total_winners: result.total_winners || 0,
      total_entries: result.total_entries || 0,
      bookings_created: bookingResult?.[0]?.bookings_created || 0,
    };
  } catch (error) {
    logger.error('重み付き抽選実行エラー:', error);
    return {
      success: false,
      message: '抽選の実行中にエラーが発生しました',
      total_winners: 0,
      total_entries: 0,
    };
  }
}

/**
 * ユーザーのエントリー情報を取得
 */
export async function getUserLotteryEntry(lotterySessionId: string): Promise<{
  success: boolean;
  data?: {
    group: LotteryEntryGroup;
    slot_entries: LotterySlotEntry[];
  };
  error?: string;
}> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // グループを取得
    const { data: group, error: groupError } = await supabase
      .from('lottery_entry_groups')
      .select('*')
      .eq('lottery_session_id', lotterySessionId)
      .eq('user_id', user.id)
      .single();

    if (groupError || !group) {
      return { success: false, error: 'エントリーが見つかりません' };
    }

    // スロットエントリーを取得
    const { data: slotEntries, error: entriesError } = await supabase
      .from('lottery_slot_entries')
      .select(
        `
        *,
        slot:photo_session_slots(*),
        preferred_model:profiles!lottery_slot_entries_preferred_model_id_fkey(id, display_name)
        `
      )
      .eq('lottery_entry_group_id', group.id)
      .order('created_at');

    if (entriesError) {
      return { success: false, error: 'エントリー情報の取得に失敗しました' };
    }

    return {
      success: true,
      data: {
        group: group as LotteryEntryGroup,
        slot_entries: (slotEntries || []) as LotterySlotEntry[],
      },
    };
  } catch (error) {
    logger.error('エントリー情報取得エラー:', error);
    return {
      success: false,
      error: 'エントリー情報の取得中にエラーが発生しました',
    };
  }
}

/**
 * 抽選エントリー数を取得（一般ユーザー向け）
 */
export async function getLotteryEntryCount(lotterySessionId: string): Promise<{
  success: boolean;
  data?: {
    total_entries: number;
    total_groups: number;
    entries_by_slot: Array<{
      slot_id: string;
      slot_number: number;
      entry_count: number;
    }>;
  };
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // エントリーグループ数を取得
    const { count: groupsCount, error: groupsError } = await supabase
      .from('lottery_entry_groups')
      .select('*', { count: 'exact', head: true })
      .eq('lottery_session_id', lotterySessionId);

    if (groupsError) {
      logger.error('エントリーグループ数取得エラー:', groupsError);
      return { success: false, error: 'エントリー数の取得に失敗しました' };
    }

    // スロットエントリー数を取得
    const { count: slotEntriesCount, error: slotEntriesError } = await supabase
      .from('lottery_slot_entries')
      .select('*', { count: 'exact', head: true })
      .eq('lottery_session_id', lotterySessionId);

    if (slotEntriesError) {
      logger.error('スロットエントリー数取得エラー:', slotEntriesError);
      return { success: false, error: 'エントリー数の取得に失敗しました' };
    }

    // スロットごとのエントリー数を取得
    const { data: slotEntries, error: slotEntriesDetailError } = await supabase
      .from('lottery_slot_entries')
      .select(
        `
        slot_id,
        slot:photo_session_slots!inner(id, slot_number)
        `
      )
      .eq('lottery_session_id', lotterySessionId);

    if (slotEntriesDetailError) {
      logger.error('スロット別エントリー数取得エラー:', slotEntriesDetailError);
      return {
        success: false,
        error: 'スロット別エントリー数の取得に失敗しました',
      };
    }

    // スロットごとに集計
    const entriesBySlot = (slotEntries || []).reduce(
      (acc, entry) => {
        const slotId = entry.slot_id;
        const slot = Array.isArray(entry.slot) ? entry.slot[0] : entry.slot;
        const slotNumber = slot?.slot_number || 0;
        if (!acc[slotId]) {
          acc[slotId] = {
            slot_id: slotId,
            slot_number: slotNumber,
            entry_count: 0,
          };
        }
        acc[slotId].entry_count++;
        return acc;
      },
      {} as Record<
        string,
        { slot_id: string; slot_number: number; entry_count: number }
      >
    );

    return {
      success: true,
      data: {
        total_entries: slotEntriesCount || 0,
        total_groups: groupsCount || 0,
        entries_by_slot: Object.values(entriesBySlot).sort(
          (a, b) => a.slot_number - b.slot_number
        ),
      },
    };
  } catch (error) {
    logger.error('エントリー数取得エラー:', error);
    return {
      success: false,
      error: 'エントリー数の取得中にエラーが発生しました',
    };
  }
}

/**
 * 抽選統計を取得（運営者向け）
 */
export async function getLotteryStatistics(
  lotterySessionId: string
): Promise<{ success: boolean; data?: LotteryStatistics; error?: string }> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 主催者確認
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select('*, photo_sessions!inner(organizer_id)')
      .eq('id', lotterySessionId)
      .single();

    const photoSession = lotterySession
      ? Array.isArray(lotterySession.photo_sessions)
        ? lotterySession.photo_sessions[0]
        : lotterySession.photo_sessions
      : null;
    if (
      sessionError ||
      !lotterySession ||
      !photoSession ||
      photoSession.organizer_id !== user.id
    ) {
      return { success: false, error: '主催者のみ統計を閲覧できます' };
    }

    // 統計データを取得
    const { data: groups } = await supabase
      .from('lottery_entry_groups')
      .select('*')
      .eq('lottery_session_id', lotterySessionId);

    const { data: slotEntries } = await supabase
      .from('lottery_slot_entries')
      .select(
        `
        *,
        slot:photo_session_slots!inner(id, slot_number)
        `
      )
      .eq('lottery_session_id', lotterySessionId);

    // 集計処理
    const totalGroups = groups?.length || 0;
    const totalEntries = slotEntries?.length || 0;

    // スロットごとのエントリー数
    const entriesBySlot = (slotEntries || []).reduce(
      (acc, entry) => {
        const slotId = entry.slot_id;
        if (!acc[slotId]) {
          acc[slotId] = {
            slot_id: slotId,
            slot_number:
              (Array.isArray(entry.slot) ? entry.slot[0] : entry.slot)
                ?.slot_number || 0,
            entry_count: 0,
          };
        }
        acc[slotId].entry_count++;
        return acc;
      },
      {} as Record<
        string,
        { slot_id: string; slot_number: number; entry_count: number }
      >
    );

    // モデル人気度（推しモデルIDからプロフィール情報を取得）
    const modelIds = Array.from(
      new Set(
        (slotEntries || [])
          .map(entry => entry.preferred_model_id)
          .filter((id): id is string => !!id)
      )
    );

    let modelProfiles: Array<{ id: string; display_name: string | null }> = [];
    if (modelIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', modelIds);

      modelProfiles = profiles || [];
    }

    const modelPopularity = (slotEntries || [])
      .filter(entry => entry.preferred_model_id)
      .reduce(
        (acc, entry) => {
          const modelId = entry.preferred_model_id!;
          const modelProfile = modelProfiles.find(p => p.id === modelId);
          if (!acc[modelId]) {
            acc[modelId] = {
              model_id: modelId,
              model_name: modelProfile?.display_name || 'Unknown',
              selection_count: 0,
            };
          }
          acc[modelId].selection_count++;
          return acc;
        },
        {} as Record<
          string,
          { model_id: string; model_name: string; selection_count: number }
        >
      );

    // チェキ集計
    const chekiSummary = (slotEntries || []).reduce(
      (acc, entry) => {
        acc.total_unsigned += entry.cheki_unsigned_count || 0;
        acc.total_signed += entry.cheki_signed_count || 0;
        return acc;
      },
      { total_unsigned: 0, total_signed: 0 }
    );

    // キャンセルポリシー分布
    const cancellationPolicyDistribution = (groups || []).reduce(
      (acc, group) => {
        if (group.cancellation_policy === 'all_or_nothing') {
          acc.all_or_nothing++;
        } else {
          acc.partial_ok++;
        }
        return acc;
      },
      { all_or_nothing: 0, partial_ok: 0 }
    );

    return {
      success: true,
      data: {
        total_entries: totalEntries,
        total_groups: totalGroups,
        entries_by_slot: Object.values(entriesBySlot),
        model_popularity: Object.values(modelPopularity),
        cheki_summary: chekiSummary,
        cancellation_policy_distribution: cancellationPolicyDistribution,
      },
    };
  } catch (error) {
    logger.error('統計取得エラー:', error);
    return {
      success: false,
      error: '統計の取得中にエラーが発生しました',
    };
  }
}

/**
 * 抽選当選者リストを取得（開催者用）
 */
export async function getLotteryWinners(lotterySessionId: string): Promise<{
  success: boolean;
  data?: Array<{
    slot_id: string;
    slot_number: number;
    winners: Array<{
      user_id: string;
      display_name: string;
      email: string;
      avatar_url?: string;
      booking_id?: string;
      booking_status?: string;
      preferred_model_name?: string;
      cheki_unsigned_count: number;
      cheki_signed_count: number;
      won_at?: string;
    }>;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // ユーザー認証確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'ログインが必要です',
      };
    }

    // 抽選セッションの存在確認と主催者確認
    const { data: lotterySession, error: sessionError } = await supabase
      .from('lottery_sessions')
      .select('*, photo_sessions!inner(id, organizer_id)')
      .eq('id', lotterySessionId)
      .single();

    if (sessionError || !lotterySession) {
      logger.error('抽選セッション取得エラー:', sessionError);
      return {
        success: false,
        error: `抽選セッションが見つかりません: ${sessionError?.message || 'Unknown error'}`,
      };
    }

    const photoSession = Array.isArray(lotterySession.photo_sessions)
      ? lotterySession.photo_sessions[0]
      : lotterySession.photo_sessions;
    const photoSessionId = photoSession?.id;
    if (!photoSessionId) {
      return {
        success: false,
        error: '撮影会情報の取得に失敗しました',
      };
    }

    // 主催者確認
    if (!photoSession || photoSession.organizer_id !== user.id) {
      return {
        success: false,
        error: '主催者のみ当選者リストを閲覧できます',
      };
    }

    // 当選者エントリーを取得（スロット情報とユーザー情報を含む）
    const { data: winnerEntries, error: entriesError } = await supabase
      .from('lottery_slot_entries')
      .select(
        `
        *,
        slot:photo_session_slots!inner(
          id,
          slot_number,
          start_time,
          end_time
        ),
        user:profiles!lottery_slot_entries_user_id_fkey(
          id,
          display_name,
          email,
          avatar_url
        ),
        preferred_model:profiles!lottery_slot_entries_preferred_model_id_fkey(
          id,
          display_name
        )
        `
      )
      .eq('lottery_session_id', lotterySessionId)
      .eq('status', 'won')
      .order('won_at', { ascending: true });

    if (entriesError) {
      logger.error('当選者エントリー取得エラー:', {
        error: entriesError,
        message: entriesError.message,
        details: entriesError.details,
        hint: entriesError.hint,
      });
      return {
        success: false,
        error: `当選者リストの取得に失敗しました: ${entriesError.message || 'Unknown error'}`,
      };
    }

    // 予約情報を取得
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, slot_id, status')
      .eq('photo_session_id', photoSessionId)
      .in('status', ['confirmed', 'pending']);

    if (bookingsError) {
      logger.error('予約情報取得エラー:', bookingsError);
    }

    // スロットごとにグループ化
    const winnersBySlot = (winnerEntries || []).reduce(
      (acc, entry) => {
        const slotId = entry.slot_id;
        const slot = Array.isArray(entry.slot) ? entry.slot[0] : entry.slot;
        const slotNumber = slot?.slot_number || 0;

        if (!acc[slotId]) {
          acc[slotId] = {
            slot_id: slotId,
            slot_number: slotNumber,
            winners: [],
          };
        }

        const user = Array.isArray(entry.user) ? entry.user[0] : entry.user;
        const preferredModel = Array.isArray(entry.preferred_model)
          ? entry.preferred_model[0]
          : entry.preferred_model;

        // 対応する予約を検索
        const booking = bookings?.find(
          b => b.user_id === entry.user_id && b.slot_id === slotId
        );

        acc[slotId].winners.push({
          user_id: entry.user_id,
          display_name: user?.display_name || 'Unknown',
          email: user?.email || '',
          avatar_url: user?.avatar_url || undefined,
          booking_id: booking?.id,
          booking_status: booking?.status,
          preferred_model_name: preferredModel?.display_name,
          cheki_unsigned_count: entry.cheki_unsigned_count || 0,
          cheki_signed_count: entry.cheki_signed_count || 0,
          won_at: entry.won_at || undefined,
        });

        return acc;
      },
      {} as Record<
        string,
        {
          slot_id: string;
          slot_number: number;
          winners: Array<{
            user_id: string;
            display_name: string;
            email: string;
            avatar_url?: string;
            booking_id?: string;
            booking_status?: string;
            preferred_model_name?: string;
            cheki_unsigned_count: number;
            cheki_signed_count: number;
            won_at?: string;
          }>;
        }
      >
    );

    // スロット番号でソートし、各スロット内で当選日時でソート
    const sortedWinners = Object.values(winnersBySlot)
      .sort((a, b) => a.slot_number - b.slot_number)
      .map(slot => ({
        ...slot,
        winners: slot.winners.sort((a, b) => {
          if (!a.won_at && !b.won_at) return 0;
          if (!a.won_at) return 1;
          if (!b.won_at) return -1;
          return new Date(a.won_at).getTime() - new Date(b.won_at).getTime();
        }),
      }));

    return {
      success: true,
      data: sortedWinners,
    };
  } catch (error) {
    logger.error('当選者リスト取得エラー:', error);
    return {
      success: false,
      error: '当選者リストの取得中にエラーが発生しました',
    };
  }
}
