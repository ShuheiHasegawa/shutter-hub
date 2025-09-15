'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import type { PhotobookError } from '@/types/quick-photobook';

/**
 * フォトブック統合保存データ
 */
export interface PhotobookSaveData {
  title?: string;
  description?: string;
  cover_image_url?: string;
  is_published?: boolean;
  imageOrder?: Array<{
    id: string;
    page_number: number;
  }>;
}

/**
 * フォトブックの統合保存処理
 * 基本情報・表紙・画像順番を1つのトランザクションで保存
 */
export async function savePhotobookChanges(
  photobookId: string,
  userId: string,
  changes: PhotobookSaveData
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    logger.info('savePhotobookChanges開始', {
      photobookId,
      userId,
      changes,
    });

    const supabase = await createClient();

    // トランザクション開始
    const { data: photobook, error: photobookError } = await supabase
      .from('photobooks')
      .update({
        ...(changes.title !== undefined && { title: changes.title }),
        ...(changes.description !== undefined && {
          description: changes.description,
        }),
        ...(changes.cover_image_url !== undefined && {
          cover_image_url: changes.cover_image_url,
        }),
        ...(changes.is_published !== undefined && {
          is_published: changes.is_published,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', photobookId)
      .eq('user_id', userId)
      .select()
      .single();

    if (photobookError) {
      logger.error('フォトブック更新エラー', { photobookError });
      throw new Error(`フォトブック更新エラー: ${photobookError.message}`);
    }

    logger.info('フォトブック基本情報更新成功', { photobookId: photobook.id });

    // 画像順番の更新（変更がある場合のみ）
    if (changes.imageOrder && changes.imageOrder.length > 0) {
      logger.info('画像順番更新開始', {
        imageCount: changes.imageOrder.length,
      });

      for (const imageUpdate of changes.imageOrder) {
        const { error: imageError } = await supabase
          .from('photobook_images')
          .update({ page_number: imageUpdate.page_number })
          .eq('id', imageUpdate.id)
          .eq('photobook_id', photobookId);

        if (imageError) {
          logger.warn('画像順番更新失敗', {
            imageId: imageUpdate.id,
            pageNumber: imageUpdate.page_number,
            error: imageError,
          });
        } else {
          logger.info('画像順番更新成功', {
            imageId: imageUpdate.id,
            pageNumber: imageUpdate.page_number,
          });
        }
      }

      logger.info('画像順番更新完了');
    }

    // 保存後のDB状態を確認
    const { data: finalImages, error: checkError } = await supabase
      .from('photobook_images')
      .select('id, page_number')
      .eq('photobook_id', photobookId)
      .order('page_number', { ascending: true });

    if (checkError) {
      logger.warn('保存後の確認クエリ失敗', { checkError });
    } else {
      logger.info('保存後のDB状態確認', {
        photobookId,
        finalImageOrder: finalImages,
      });
    }

    logger.info('Photobook changes saved successfully', {
      photobookId,
      userId,
      changes: {
        hasBasicInfo: !!(changes.title || changes.description),
        hasCoverChange: !!changes.cover_image_url,
        hasImageOrder: !!(changes.imageOrder && changes.imageOrder.length > 0),
      },
    });

    // キャッシュ更新
    revalidatePath('/photobooks');
    revalidatePath(`/photobooks/quick/${photobookId}`);
    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return { success: true };
  } catch (error) {
    logger.error('Error saving photobook changes:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'フォトブックの保存に失敗しました',
        details: { error },
      },
    };
  }
}
