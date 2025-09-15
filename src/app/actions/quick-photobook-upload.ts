'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ImageOrientation, PhotobookError } from '@/types/quick-photobook';
import { addPhotobookImage } from './quick-photobook-images';
import { logger } from '@/lib/utils/logger';

/**
 * 画像の向きを判定する
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
 * 画像ファイルをBase64でアップロード処理する
 */
export async function uploadPhotobookImageFromBase64(
  photobookId: string,
  userId: string,
  imageData: {
    base64Data: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
  }
): Promise<{ success: boolean; imageId?: string; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // フォトブック所有権確認
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

    // Base64データをBufferに変換
    const base64WithoutPrefix = imageData.base64Data.replace(
      /^data:image\/[a-z]+;base64,/,
      ''
    );
    const buffer = Buffer.from(base64WithoutPrefix, 'base64');

    // ファイル名生成
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = imageData.mimeType.split('/')[1] || 'jpg';
    const fileName = `${userId}/${photobookId}/${timestamp}_${random}.${extension}`;

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photobooks')
      .upload(fileName, buffer, {
        cacheControl: '3600',
        contentType: imageData.mimeType,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Storage upload failed', uploadError);
      return {
        success: false,
        error: {
          type: 'server',
          message: 'ストレージへのアップロードに失敗しました',
          details: { uploadError },
        },
      };
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('photobooks')
      .getPublicUrl(uploadData.path);

    // 画像向き判定
    const orientation = determineOrientation(imageData.width, imageData.height);

    // データベースに画像レコード追加
    const result = await addPhotobookImage(photobookId, userId, {
      imageUrl: urlData.publicUrl,
      originalFilename: imageData.fileName,
      fileSizeBytes: imageData.fileSize,
      imageWidth: imageData.width,
      imageHeight: imageData.height,
    });

    if (!result.success) {
      // データベース追加に失敗した場合はストレージからも削除
      await supabase.storage.from('photobooks').remove([uploadData.path]);

      return result;
    }

    logger.info('Photobook image uploaded and saved successfully', {
      imageId: result.imageId,
      photobookId,
      fileName: imageData.fileName,
      orientation,
    });

    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return {
      success: true,
      imageId: result.imageId,
    };
  } catch (error) {
    logger.error('Error in uploadPhotobookImageFromBase64:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: '画像のアップロードに失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * 複数画像の一括アップロード
 */
export async function uploadMultiplePhotobookImages(
  photobookId: string,
  userId: string,
  imagesData: Array<{
    base64Data: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
  }>
): Promise<{
  success: boolean;
  results: Array<{
    success: boolean;
    imageId?: string;
    error?: PhotobookError;
  }>;
  successCount: number;
  failureCount: number;
}> {
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const imageData of imagesData) {
    const result = await uploadPhotobookImageFromBase64(
      photobookId,
      userId,
      imageData
    );

    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return {
    success: successCount > 0,
    results,
    successCount,
    failureCount,
  };
}
