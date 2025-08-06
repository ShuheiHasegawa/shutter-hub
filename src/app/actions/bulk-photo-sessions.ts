'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import type {
  BulkPhotoSessionData,
  BulkPhotoSessionResult,
} from '@/types/photo-session';
import { nanoid } from 'nanoid';

export async function createBulkPhotoSessionsAction(
  data: BulkPhotoSessionData
): Promise<BulkPhotoSessionResult> {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error('認証エラー:', authError);
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: '認証が必要です',
      };
    }

    // プロフィール確認（運営アカウントのみ許可）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.user_type !== 'organizer') {
      logger.error('権限エラー:', {
        profileError,
        userType: profile?.user_type,
      });
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: 'この機能は運営アカウントのみ利用可能です',
      };
    }

    // バリデーション
    if (!data.selected_models || data.selected_models.length === 0) {
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: '出演モデルを最低1名選択してください',
      };
    }

    if (data.selected_models.length > 99) {
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: 'モデルは最大99人まで選択可能です',
      };
    }

    // 重複チェック
    const modelIds = data.selected_models.map(m => m.model_id);
    const uniqueIds = new Set(modelIds);
    if (modelIds.length !== uniqueIds.size) {
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: '同じモデルを重複して選択することはできません',
      };
    }

    // モデルIDの存在確認
    const { data: existingModels, error: modelCheckError } = await supabase
      .from('profiles')
      .select('id, user_type')
      .in('id', modelIds)
      .eq('user_type', 'model');

    if (modelCheckError) {
      logger.error('モデル確認エラー:', modelCheckError);
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: 'モデル情報の確認に失敗しました',
      };
    }

    if (existingModels.length !== modelIds.length) {
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: '選択されたモデルに無効なアカウントが含まれています',
      };
    }

    // 一括作成グループIDを生成
    const bulkGroupId = nanoid();
    const createdSessions: string[] = [];

    // トランザクション内で一括作成
    const { error: transactionError } = await supabase.rpc(
      'create_bulk_photo_sessions',
      {
        p_bulk_group_id: bulkGroupId,
        p_organizer_id: user.id,
        p_title: data.title,
        p_description: data.description || null,
        p_location: data.location,
        p_address: data.address || null,
        p_start_time: data.start_time,
        p_end_time: data.end_time,
        p_max_participants: data.slots.reduce(
          (total, slot) => total + slot.max_participants,
          0
        ),
        p_booking_type: data.booking_type,
        p_allow_multiple_bookings: data.allow_multiple_bookings,
        p_booking_settings: data.booking_settings,
        p_is_published: data.is_published,
        p_image_urls: data.image_urls,
        p_selected_models: data.selected_models.map(model => ({
          model_id: model.model_id,
          fee_amount: model.fee_amount,
        })),
      }
    );

    if (transactionError) {
      logger.error('一括作成トランザクションエラー:', transactionError);
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: '撮影会の作成に失敗しました',
      };
    }

    // 作成された撮影会IDを取得
    const { data: createdSessionsData, error: fetchError } = await supabase
      .from('photo_sessions')
      .select('id')
      .eq('bulk_group_id', bulkGroupId);

    if (fetchError) {
      logger.error('作成されたセッション取得エラー:', fetchError);
    } else if (createdSessionsData) {
      createdSessions.push(...createdSessionsData.map(session => session.id));
    }

    // 撮影枠も一括作成（スロットが設定されている場合）
    if (data.slots && data.slots.length > 0) {
      for (const sessionId of createdSessions) {
        const slotsToCreate = data.slots.map(slot => ({
          ...slot,
          photo_session_id: sessionId,
        }));

        const { error: slotsError } = await supabase
          .from('photo_session_slots')
          .insert(slotsToCreate);

        if (slotsError) {
          logger.error(`セッション${sessionId}の撮影枠作成エラー:`, slotsError);
        }
      }
    }

    // キャッシュを無効化
    revalidatePath('/dashboard');
    revalidatePath('/photo-sessions');

    logger.info('一括撮影会作成成功:', {
      bulkGroupId,
      sessionsCount: createdSessions.length,
      modelsCount: data.selected_models.length,
    });

    return {
      success: true,
      created_sessions: createdSessions,
      bulk_group_id: bulkGroupId,
    };
  } catch (error) {
    logger.error('一括撮影会作成予期しないエラー:', error);
    return {
      success: false,
      created_sessions: [],
      bulk_group_id: '',
      error: '予期しないエラーが発生しました',
    };
  }
}
