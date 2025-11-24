'use server';

import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * 撮影会に関連付けられたスタジオ情報を取得する
 */
export async function getPhotoSessionStudioAction(
  photoSessionId: string
): Promise<{
  success: boolean;
  studio?: {
    id: string;
    name: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // photo_session_studiosテーブルからスタジオ情報を取得
    const { data: photoSessionStudio, error } = await supabase
      .from('photo_session_studios')
      .select(
        `
        studio_id,
        studios!inner(
          id,
          name
        )
      `
      )
      .eq('photo_session_id', photoSessionId)
      .maybeSingle();

    if (error) {
      logger.error('撮影会スタジオ情報取得エラー:', error);
      return {
        success: false,
        error: 'スタジオ情報の取得中にエラーが発生しました',
      };
    }

    if (!photoSessionStudio || !photoSessionStudio.studios) {
      return {
        success: true,
        studio: undefined,
      };
    }

    const studio = Array.isArray(photoSessionStudio.studios)
      ? photoSessionStudio.studios[0]
      : photoSessionStudio.studios;

    return {
      success: true,
      studio: {
        id: studio.id,
        name: studio.name,
      },
    };
  } catch (error) {
    logger.error('撮影会スタジオ情報取得失敗:', error);
    return {
      success: false,
      error: 'スタジオ情報の取得中に予期しないエラーが発生しました',
    };
  }
}
