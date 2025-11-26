'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import { requireUserType } from '@/lib/auth/server-actions';
import type {
  BulkPhotoSessionData,
  BulkPhotoSessionResult,
} from '@/types/photo-session';
import { nanoid } from 'nanoid';

export async function createBulkPhotoSessionsAction(
  data: BulkPhotoSessionData
): Promise<BulkPhotoSessionResult> {
  try {
    const typeResult = await requireUserType('organizer');
    if (!typeResult.success) {
      logger.error('認証・権限エラー:', typeResult.error);
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: typeResult.error,
      };
    }
    const { user, supabase } = typeResult.data;

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

    // モデルごとに個別撮影会を作成
    const maxParticipants = data.slots.reduce(
      (total, slot) => total + slot.max_participants,
      0
    );
    const avgPricePerPerson =
      data.slots.length > 0
        ? Math.round(
            data.slots.reduce((sum, slot) => sum + slot.price_per_person, 0) /
              data.slots.length
          )
        : 0;

    // モデル名を取得（タイトルに追加するため）
    const { data: modelProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in(
        'id',
        data.selected_models.map(m => m.model_id)
      );

    const modelNameMap = new Map(
      modelProfiles?.map(p => [p.id, p.display_name]) || []
    );

    // 各モデルごとに撮影会を作成
    for (const model of data.selected_models) {
      const modelName = modelNameMap.get(model.model_id) || 'Unknown';
      const sessionTitle = `${data.title} - ${modelName}`;

      // 撮影会を作成
      const { data: session, error: sessionError } = await supabase
        .from('photo_sessions')
        .insert({
          title: sessionTitle,
          description: data.description || null,
          location: data.location,
          address: data.address || null,
          start_time: data.start_time,
          end_time: data.end_time,
          max_participants: maxParticipants,
          price_per_person: avgPricePerPerson,
          booking_type: data.booking_type,
          allow_multiple_bookings: data.allow_multiple_bookings,
          block_users_with_bad_ratings:
            data.block_users_with_bad_ratings || false,
          payment_timing: data.payment_timing || 'prepaid',
          booking_settings: data.booking_settings || {},
          is_published: data.is_published,
          image_urls: data.image_urls || [],
          organizer_id: user.id,
          current_participants: 0,
          studio_id: data.studio_id || null,
          session_type: 'individual',
          bulk_group_id: bulkGroupId,
          featured_model_id: model.model_id,
        })
        .select()
        .single();

      if (sessionError) {
        logger.error(
          `モデル${model.model_id}の撮影会作成エラー:`,
          sessionError
        );
        continue;
      }

      if (session) {
        createdSessions.push(session.id);
      }
    }

    if (createdSessions.length === 0) {
      return {
        success: false,
        created_sessions: [],
        bulk_group_id: '',
        error: '撮影会の作成に失敗しました',
      };
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

    // photo_session_studios に関連付けを作成（スタジオが選択されている場合）
    if (data.studio_id && createdSessions.length > 0) {
      const studioLinks = createdSessions.map(sessionId => ({
        photo_session_id: sessionId,
        studio_id: data.studio_id!,
        usage_start_time: data.start_time,
        usage_end_time: data.end_time,
      }));

      const { error: studioLinksError } = await supabase
        .from('photo_session_studios')
        .insert(studioLinks);

      if (studioLinksError) {
        logger.error(
          'photo_session_studios 一括関連付けエラー:',
          studioLinksError
        );
        // エラーが発生しても撮影会とスロットは残す
      }
    }

    // モデル情報を保存（各撮影会に1つのモデルを紐づけ）
    if (
      data.selected_models &&
      data.selected_models.length > 0 &&
      createdSessions.length > 0
    ) {
      // 各撮影会には対応するモデルを1つだけ紐づける
      for (
        let i = 0;
        i < createdSessions.length && i < data.selected_models.length;
        i++
      ) {
        const sessionId = createdSessions[i];
        const model = data.selected_models[i];

        const { error: modelsError } = await supabase
          .from('photo_session_models')
          .insert({
            photo_session_id: sessionId,
            model_id: model.model_id,
            fee_amount: model.fee_amount,
            display_order: 0,
          });

        if (modelsError) {
          logger.error(
            `セッション${sessionId}のモデル情報保存エラー:`,
            modelsError
          );
          // エラーが発生しても撮影会とスロットは残す
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
