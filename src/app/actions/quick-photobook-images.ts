'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ImageOrientation, PhotobookError } from '@/types/quick-photobook';
import { logger } from '@/lib/utils/logger';

/**
 * 画像の向きを自動判定する
 */
function determineOrientation(width: number, height: number): ImageOrientation {
  const ratio = width / height;

  if (ratio > 1.1) {
    return 'landscape';
  } else if (ratio < 0.9) {
    return 'portrait';
  } else {
    return 'square';
  }
}

/**
 * 次のページ番号を取得する
 */
async function getNextPageNumber(photobookId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('photobook_images')
    .select('page_number')
    .eq('photobook_id', photobookId)
    .order('page_number', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 1;
  }

  return data[0].page_number + 1;
}

/**
 * フォトブック画像を追加する
 */
export async function addPhotobookImage(
  photobookId: string,
  userId: string,
  imageData: {
    imageUrl: string;
    originalFilename: string;
    fileSizeBytes: number;
    imageWidth: number;
    imageHeight: number;
    pageNumber?: number; // 指定しない場合は末尾に追加
  }
): Promise<{ success: boolean; imageId?: string; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // フォトブック所有権確認とページ数制限チェック
    const { data: photobook, error: photobookError } = await supabase
      .from('photobooks')
      .select('id, user_id, max_pages, current_pages')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (photobookError || !photobook) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'フォトブックが見つからないか、アクセス権限がありません',
          details: { photobookError },
        },
      };
    }

    // ページ数制限チェック
    if (photobook.current_pages >= photobook.max_pages) {
      return {
        success: false,
        error: {
          type: 'plan_limit',
          message: `ページ数の上限（${photobook.max_pages}ページ）に達しています`,
          details: {
            currentPages: photobook.current_pages,
            maxPages: photobook.max_pages,
          },
        },
      };
    }

    // ページ番号決定
    const pageNumber =
      imageData.pageNumber || (await getNextPageNumber(photobookId));

    // 既存ページ番号の場合は後続を繰り下げ
    if (imageData.pageNumber) {
      const { error: updateError } = await supabase
        .from('photobook_images')
        .update({
          page_number: supabase.rpc('increment_page_numbers', {
            p_photobook_id: photobookId,
            p_from_page: pageNumber,
          }),
        });

      if (updateError) {
        logger.warn(
          'Failed to update page numbers, continuing with append:',
          updateError
        );
      }
    }

    // 画像向き判定
    const orientation = determineOrientation(
      imageData.imageWidth,
      imageData.imageHeight
    );

    // 画像レコード作成
    const { data: image, error } = await supabase
      .from('photobook_images')
      .insert({
        photobook_id: photobookId,
        image_url: imageData.imageUrl,
        page_number: pageNumber,
        original_filename: imageData.originalFilename,
        file_size_bytes: imageData.fileSizeBytes,
        image_width: imageData.imageWidth,
        image_height: imageData.imageHeight,
        orientation: orientation,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Photobook image added successfully', {
      imageId: image.id,
      photobookId,
      pageNumber,
      orientation,
    });

    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return {
      success: true,
      imageId: image.id,
    };
  } catch (error) {
    logger.error('Error adding photobook image:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: '画像の追加に失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * フォトブック画像を削除する
 */
export async function removePhotobookImage(
  imageId: string,
  photobookId: string,
  userId: string
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // 所有権確認
    const { data: photobook } = await supabase
      .from('photobooks')
      .select('id')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (!photobook) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'フォトブックが見つからないか、アクセス権限がありません',
        },
      };
    }

    // 削除対象画像の情報取得
    const { data: targetImage } = await supabase
      .from('photobook_images')
      .select('page_number')
      .eq('id', imageId)
      .eq('photobook_id', photobookId)
      .single();

    if (!targetImage) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: '画像が見つかりません',
        },
      };
    }

    // 画像削除
    const { error: deleteError } = await supabase
      .from('photobook_images')
      .delete()
      .eq('id', imageId)
      .eq('photobook_id', photobookId);

    if (deleteError) throw deleteError;

    // 後続ページ番号を繰り上げ（手動で更新）
    const { data: subsequentImages } = await supabase
      .from('photobook_images')
      .select('id, page_number')
      .eq('photobook_id', photobookId)
      .gt('page_number', targetImage.page_number)
      .order('page_number', { ascending: true });

    if (subsequentImages && subsequentImages.length > 0) {
      for (const img of subsequentImages) {
        const { error: updateError } = await supabase
          .from('photobook_images')
          .update({ page_number: img.page_number - 1 })
          .eq('id', img.id);

        if (updateError) {
          logger.warn(
            'Failed to update page number after deletion:',
            updateError
          );
        }
      }
    }

    logger.info('Photobook image removed successfully', {
      imageId,
      photobookId,
      pageNumber: targetImage.page_number,
    });

    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return { success: true };
  } catch (error) {
    logger.error('Error removing photobook image:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: '画像の削除に失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * フォトブック画像を置き換える
 */
export async function replacePhotobookImage(
  imageId: string,
  photobookId: string,
  userId: string,
  newImageData: {
    imageUrl: string;
    originalFilename: string;
    fileSizeBytes: number;
    imageWidth: number;
    imageHeight: number;
  }
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // 所有権確認
    const { data: photobook } = await supabase
      .from('photobooks')
      .select('id')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (!photobook) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'フォトブックが見つからないか、アクセス権限がありません',
        },
      };
    }

    // 画像向き判定
    const orientation = determineOrientation(
      newImageData.imageWidth,
      newImageData.imageHeight
    );

    // 画像情報更新
    const { error } = await supabase
      .from('photobook_images')
      .update({
        image_url: newImageData.imageUrl,
        original_filename: newImageData.originalFilename,
        file_size_bytes: newImageData.fileSizeBytes,
        image_width: newImageData.imageWidth,
        image_height: newImageData.imageHeight,
        orientation: orientation,
      })
      .eq('id', imageId)
      .eq('photobook_id', photobookId);

    if (error) throw error;

    logger.info('Photobook image replaced successfully', {
      imageId,
      photobookId,
      orientation,
    });

    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return { success: true };
  } catch (error) {
    logger.error('Error replacing photobook image:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: '画像の置き換えに失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * 画像順番を入れ替える
 */
export async function reorderPhotobookImages(
  photobookId: string,
  userId: string,
  reorderedImages: { id: string; page_number: number }[]
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // 所有権確認
    const { data: photobook } = await supabase
      .from('photobooks')
      .select('id')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (!photobook) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'フォトブックが見つからないか、アクセス権限がありません',
        },
      };
    }

    // ユニーク制約違反を回避するため、2段階で更新
    logger.info('画像順番更新開始（2段階方式）', {
      imageCount: reorderedImages.length,
    });

    // ステップ1: 全ての画像を一時的な大きなページ番号に設定（制約回避）
    const tempOffset = 1000;
    for (let i = 0; i < reorderedImages.length; i++) {
      const { error: tempError } = await supabase
        .from('photobook_images')
        .update({ page_number: tempOffset + i })
        .eq('id', reorderedImages[i].id)
        .eq('photobook_id', photobookId);

      if (tempError) {
        logger.error('一時ページ番号設定失敗', {
          imageId: reorderedImages[i].id,
          tempPageNumber: tempOffset + i,
          error: tempError,
        });
        throw tempError;
      }
    }

    logger.info('一時ページ番号設定完了');

    // ステップ2: 正しいページ番号に更新
    for (const update of reorderedImages) {
      const { error } = await supabase
        .from('photobook_images')
        .update({ page_number: update.page_number })
        .eq('id', update.id)
        .eq('photobook_id', photobookId);

      if (error) {
        logger.error('最終ページ番号設定失敗', {
          imageId: update.id,
          pageNumber: update.page_number,
          error,
        });
        throw error;
      }

      logger.info('画像順番更新成功', {
        imageId: update.id,
        pageNumber: update.page_number,
      });
    }

    logger.info('画像順番更新完了（2段階方式）');

    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return { success: true };
  } catch (error) {
    logger.error('Error reordering photobook images:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: '画像の順番変更に失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * 画像メタデータを更新する
 */
export async function updatePhotobookImageMetadata(
  imageId: string,
  photobookId: string,
  userId: string,
  updates: {
    position_x?: number;
    position_y?: number;
    scale_factor?: number;
    rotation_angle?: number;
    advanced_settings?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // 所有権確認
    const { data: photobook } = await supabase
      .from('photobooks')
      .select('id')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (!photobook) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'フォトブックが見つからないか、アクセス権限がありません',
        },
      };
    }

    const { error } = await supabase
      .from('photobook_images')
      .update(updates)
      .eq('id', imageId)
      .eq('photobook_id', photobookId);

    if (error) throw error;

    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return { success: true };
  } catch (error) {
    logger.error('Error updating photobook image metadata:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: '画像情報の更新に失敗しました',
        details: { error },
      },
    };
  }
}
