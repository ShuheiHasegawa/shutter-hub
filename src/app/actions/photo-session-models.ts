'use server';

import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import type { SelectedModel } from '@/types/photo-session';
import type { Profile } from '@/types/database';

/**
 * 撮影会に紐づくモデル情報を取得する
 */
export async function getPhotoSessionModelsAction(
  photoSessionId: string
): Promise<{
  success: boolean;
  models?: SelectedModel[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // photo_session_modelsテーブルからモデル情報を取得
    const { data: sessionModels, error: modelsError } = await supabase
      .from('photo_session_models')
      .select(
        `
        model_id,
        fee_amount,
        display_order,
        profiles!model_id(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('photo_session_id', photoSessionId)
      .order('display_order', { ascending: true });

    if (modelsError) {
      logger.error('撮影会モデル情報取得エラー:', modelsError);
      return {
        success: false,
        error: 'モデル情報の取得中にエラーが発生しました',
      };
    }

    if (!sessionModels || sessionModels.length === 0) {
      return {
        success: true,
        models: [],
      };
    }

    // SelectedModel形式に変換
    const models: SelectedModel[] = sessionModels.map(sm => {
      const profile = sm.profiles as unknown as Profile | null;
      return {
        model_id: sm.model_id,
        display_name: profile?.display_name || '名前未設定',
        avatar_url: profile?.avatar_url || undefined,
        fee_amount: sm.fee_amount,
      };
    });

    return {
      success: true,
      models,
    };
  } catch (error) {
    logger.error('撮影会モデル情報取得失敗:', error);
    return {
      success: false,
      error: 'モデル情報の取得中に予期しないエラーが発生しました',
    };
  }
}
