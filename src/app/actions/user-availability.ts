'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import {
  validateTimeRange,
  validateDateString,
  minutesToTime,
} from '@/lib/utils/time-utils';
import type {
  UserAvailability,
  CreateUserAvailabilityData,
  UpdateUserAvailabilityData,
  TimeSlot,
  OrganizerOverlap,
  CopyAvailabilityRequest,
} from '@/types/user-availability';

// エラーハンドリング用の結果型
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * ユーザーの空き時間を作成する
 */
export async function createUserAvailability(
  data: CreateUserAvailabilityData
): Promise<ActionResult<UserAvailability>> {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 入力値検証
    const dateValidation = validateDateString(data.available_date);
    if (!dateValidation.isValid) {
      return { success: false, error: dateValidation.error };
    }

    const startTime = minutesToTime(data.start_time_minutes);
    const endTime = minutesToTime(data.end_time_minutes);
    const timeValidation = validateTimeRange(startTime, endTime);
    if (!timeValidation.isValid) {
      return { success: false, error: timeValidation.error };
    }

    // 重複チェック
    const { data: overlapCheck, error: overlapError } = await supabase.rpc(
      'check_availability_overlap',
      {
        p_user_id: user.id,
        p_date: data.available_date,
        p_start_minutes: data.start_time_minutes,
        p_end_minutes: data.end_time_minutes,
      }
    );

    if (overlapError) {
      logger.error('重複チェックエラー:', overlapError);
      return { success: false, error: '重複チェックに失敗しました' };
    }

    if (overlapCheck?.[0]?.has_overlap) {
      return {
        success: false,
        error: '指定された時間帯は既に設定済みです',
        details: overlapCheck[0].overlap_details,
      };
    }

    // データ挿入
    const { data: result, error } = await supabase
      .from('user_availability')
      .insert({
        user_id: user.id,
        available_date: data.available_date,
        start_time_minutes: data.start_time_minutes,
        end_time_minutes: data.end_time_minutes,
        availability_type: data.availability_type || 'manual',
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('空き時間作成エラー:', error);
      return { success: false, error: '空き時間の作成に失敗しました' };
    }

    logger.info('空き時間作成成功:', {
      userId: user.id,
      date: data.available_date,
    });
    revalidatePath('/profile');

    return { success: true, data: result };
  } catch (error) {
    logger.error('予期しないエラー（createUserAvailability）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * ユーザーの空き時間を取得する
 */
export async function getUserAvailability(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<TimeSlot[]>> {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 権限確認（自分のデータまたは運営が所属モデルを確認）
    if (user.id !== userId) {
      const { data: permission, error: permError } = await supabase
        .from('organizer_models')
        .select('id')
        .eq('organizer_id', user.id)
        .eq('model_id', userId)
        .eq('is_active', true)
        .single();

      if (permError || !permission) {
        return { success: false, error: 'アクセス権限がありません' };
      }
    }

    // データ取得
    const { data, error } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('available_date', startDate)
      .lte('available_date', endDate)
      .order('available_date', { ascending: true })
      .order('start_time_minutes', { ascending: true });

    if (error) {
      logger.error('空き時間取得エラー:', error);
      return { success: false, error: '空き時間の取得に失敗しました' };
    }

    // UI用TimeSlot形式に変換
    const timeSlots: TimeSlot[] = (data || []).map(item => ({
      id: item.id,
      date: item.available_date,
      startTime: minutesToTime(item.start_time_minutes),
      endTime: minutesToTime(item.end_time_minutes),
      startMinutes: item.start_time_minutes,
      endMinutes: item.end_time_minutes,
      notes: item.notes,
      type: item.availability_type,
    }));

    return { success: true, data: timeSlots };
  } catch (error) {
    logger.error('予期しないエラー（getUserAvailability）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * ユーザーの空き時間を更新する
 */
export async function updateUserAvailability(
  slotId: string,
  data: UpdateUserAvailabilityData
): Promise<ActionResult<UserAvailability>> {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 既存データの確認（権限チェック含む）
    const { data: existing, error: fetchError } = await supabase
      .from('user_availability')
      .select('*')
      .eq('id', slotId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: '更新対象が見つかりません' };
    }

    // 時間範囲の検証（更新される場合）
    if (
      data.start_time_minutes !== undefined &&
      data.end_time_minutes !== undefined
    ) {
      const timeValidation = validateTimeRange(
        minutesToTime(data.start_time_minutes),
        minutesToTime(data.end_time_minutes)
      );
      if (!timeValidation.isValid) {
        return { success: false, error: timeValidation.error };
      }

      // 重複チェック（自分のレコードを除外）
      const { data: overlapCheck, error: overlapError } = await supabase.rpc(
        'check_availability_overlap',
        {
          p_user_id: user.id,
          p_date: existing.available_date,
          p_start_minutes: data.start_time_minutes,
          p_end_minutes: data.end_time_minutes,
          p_exclude_id: slotId,
        }
      );

      if (overlapError) {
        logger.error('重複チェックエラー:', overlapError);
        return { success: false, error: '重複チェックに失敗しました' };
      }

      if (overlapCheck?.[0]?.has_overlap) {
        return {
          success: false,
          error: '指定された時間帯は既に設定済みです',
          details: overlapCheck[0].overlap_details,
        };
      }
    }

    // データ更新
    const { data: result, error } = await supabase
      .from('user_availability')
      .update(data)
      .eq('id', slotId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('空き時間更新エラー:', error);
      return { success: false, error: '空き時間の更新に失敗しました' };
    }

    logger.info('空き時間更新成功:', { userId: user.id, slotId });
    revalidatePath('/profile');

    return { success: true, data: result };
  } catch (error) {
    logger.error('予期しないエラー（updateUserAvailability）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * ユーザーの空き時間を削除する
 */
export async function deleteUserAvailability(
  slotId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 論理削除（is_active = false）
    const { error } = await supabase
      .from('user_availability')
      .update({ is_active: false })
      .eq('id', slotId)
      .eq('user_id', user.id);

    if (error) {
      logger.error('空き時間削除エラー:', error);
      return { success: false, error: '空き時間の削除に失敗しました' };
    }

    logger.info('空き時間削除成功:', { userId: user.id, slotId });
    revalidatePath('/profile');

    return { success: true };
  } catch (error) {
    logger.error('予期しないエラー（deleteUserAvailability）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 空き時間を他の日に複製する
 */
export async function copyAvailabilityToOtherDates(
  request: CopyAvailabilityRequest
): Promise<ActionResult<TimeSlot[]>> {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 元データの取得
    const { data: sourceSlots, error: fetchError } = await supabase
      .from('user_availability')
      .select('*')
      .in('id', request.sourceSlotIds)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (fetchError || !sourceSlots || sourceSlots.length === 0) {
      return { success: false, error: '複製元のデータが見つかりません' };
    }

    // 複製データの準備
    const copyData: CreateUserAvailabilityData[] = [];
    for (const targetDate of request.targetDates) {
      if (request.excludeDates?.includes(targetDate)) {
        continue;
      }

      // 日付妥当性チェック
      const dateValidation = validateDateString(targetDate);
      if (!dateValidation.isValid) {
        logger.warn('無効な日付をスキップ:', targetDate);
        continue;
      }

      for (const sourceSlot of sourceSlots) {
        copyData.push({
          available_date: targetDate,
          start_time_minutes: sourceSlot.start_time_minutes,
          end_time_minutes: sourceSlot.end_time_minutes,
          availability_type: 'recurring_copy',
          notes: sourceSlot.notes,
        });
      }
    }

    if (copyData.length === 0) {
      return { success: false, error: '複製可能なデータがありません' };
    }

    // バッチ挿入（重複エラーは個別にスキップ）
    const results: UserAvailability[] = [];
    const errors: string[] = [];

    for (const item of copyData) {
      const result = await createUserAvailability(item);
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(`${item.available_date}: ${result.error}`);
      }
    }

    if (results.length === 0) {
      return {
        success: false,
        error: '複製に失敗しました',
        details: errors,
      };
    }

    // UI用TimeSlot形式に変換
    const timeSlots: TimeSlot[] = results.map(item => ({
      id: item.id,
      date: item.available_date,
      startTime: minutesToTime(item.start_time_minutes),
      endTime: minutesToTime(item.end_time_minutes),
      startMinutes: item.start_time_minutes,
      endMinutes: item.end_time_minutes,
      notes: item.notes,
      type: item.availability_type,
    }));

    logger.info('空き時間複製成功:', {
      userId: user.id,
      copiedCount: results.length,
      errorCount: errors.length,
    });

    return {
      success: true,
      data: timeSlots,
      details: errors.length > 0 ? { skippedErrors: errors } : undefined,
    };
  } catch (error) {
    logger.error('予期しないエラー（copyAvailabilityToOtherDates）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 運営との重複スケジュールを取得する（モデル専用）
 */
export async function getOrganizerOverlaps(
  modelId: string,
  date: string
): Promise<ActionResult<OrganizerOverlap[]>> {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 権限確認（本人または所属運営のみ）
    if (user.id !== modelId) {
      const { data: permission, error: permError } = await supabase
        .from('organizer_models')
        .select('id')
        .eq('organizer_id', user.id)
        .eq('model_id', modelId)
        .eq('is_active', true)
        .single();

      if (permError || !permission) {
        return { success: false, error: 'アクセス権限がありません' };
      }
    }

    // ユーザータイプ確認（モデルのみ）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', modelId)
      .single();

    if (profileError || profile?.user_type !== 'model') {
      return { success: false, error: 'この機能はモデルユーザー専用です' };
    }

    // 運営重複データ取得
    const { data: overlapData, error: overlapError } = await supabase.rpc(
      'get_organizer_schedule_overlap',
      {
        p_model_id: modelId,
        p_date: date,
      }
    );

    if (overlapError) {
      logger.error('運営重複取得エラー:', overlapError);
      return { success: false, error: '運営スケジュールの取得に失敗しました' };
    }

    // UI用形式に変換
    const overlaps: OrganizerOverlap[] = (overlapData || []).map(
      (item: unknown) => {
        const typedItem = item as {
          organizer_id: string;
          organizer_name: string;
          overlap_slots?: unknown[];
        };
        return {
          organizerId: typedItem.organizer_id,
          organizerName: typedItem.organizer_name,
          overlappingSlots: typedItem.overlap_slots || [],
        };
      }
    );

    return { success: true, data: overlaps };
  } catch (error) {
    logger.error('予期しないエラー（getOrganizerOverlaps）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 月間の空き時間統計を取得する
 */
export async function getUserAvailabilityStats(
  userId: string,
  year: number,
  month: number
): Promise<
  ActionResult<{
    totalSlots: number;
    totalHours: number;
    organizerOverlapHours: number;
    averageSlotDuration: number;
  }>
> {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 権限確認
    if (user.id !== userId) {
      return { success: false, error: 'アクセス権限がありません' };
    }

    // 月の開始・終了日計算
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 月末日

    // 統計データ取得
    const { data, error } = await supabase
      .from('user_availability')
      .select('start_time_minutes, end_time_minutes')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('available_date', startDate)
      .lte('available_date', endDate);

    if (error) {
      logger.error('統計取得エラー:', error);
      return { success: false, error: '統計の取得に失敗しました' };
    }

    const slots = data || [];
    const totalSlots = slots.length;
    const totalMinutes = slots.reduce(
      (sum, slot) => sum + (slot.end_time_minutes - slot.start_time_minutes),
      0
    );
    const totalHours = totalMinutes / 60;
    const averageSlotDuration =
      totalSlots > 0 ? totalMinutes / totalSlots / 60 : 0;

    // 運営重複時間は将来実装
    const organizerOverlapHours = 0;

    return {
      success: true,
      data: {
        totalSlots,
        totalHours,
        organizerOverlapHours,
        averageSlotDuration,
      },
    };
  } catch (error) {
    logger.error('予期しないエラー（getUserAvailabilityStats）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
