import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { logger } from '@/lib/utils/logger';

/**
 * 画像圧縮設定
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 2, // 最大2MB
  maxWidthOrHeight: 1920, // 最大解像度
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  quality: 0.8,
};

/**
 * サムネイル生成設定
 */
const THUMBNAIL_OPTIONS = {
  maxSizeMB: 0.5, // 最大500KB
  maxWidthOrHeight: 400, // サムネイル解像度
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  quality: 0.7,
};

/**
 * 画像メタデータ
 */
export interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  fileName: string;
  mimeType: string;
}

/**
 * アップロード結果
 */
export interface UploadResult {
  success: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  metadata?: ImageMetadata;
  error?: string;
}

/**
 * 画像のメタデータを取得する
 */
async function getImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
        fileSize: file.size,
        fileName: file.name,
        mimeType: file.type,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

/**
 * 一意のファイル名を生成する
 */
function generateUniqueFileName(
  originalName: string,
  userId: string,
  photobookId: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'jpg';

  return `${userId}/${photobookId}/${timestamp}_${random}.${extension}`;
}

/**
 * フォトブック画像をSupabase Storageにアップロードする
 */
export async function uploadPhotobookImage(
  file: File,
  userId: string,
  photobookId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    const supabase = createClient();

    // 画像メタデータ取得
    const metadata = await getImageMetadata(file);
    logger.debug('Image metadata extracted', { metadata });

    // ファイルサイズチェック（15MB制限）
    if (file.size > 15 * 1024 * 1024) {
      return {
        success: false,
        error: 'ファイルサイズが大きすぎます（15MB以下にしてください）',
      };
    }

    // 画像形式チェック
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: '画像ファイルを選択してください',
      };
    }

    // 進捗更新
    onProgress?.(10);

    // 画像圧縮
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
    logger.debug('Image compressed', {
      originalSize: file.size,
      compressedSize: compressedFile.size,
    });

    onProgress?.(30);

    // サムネイル生成
    const thumbnailFile = await imageCompression(file, THUMBNAIL_OPTIONS);

    onProgress?.(50);

    // ファイル名生成
    const mainFileName = generateUniqueFileName(file.name, userId, photobookId);
    const thumbnailFileName = generateUniqueFileName(
      `thumb_${file.name}`,
      userId,
      photobookId
    );

    // メイン画像アップロード
    const { data: mainUpload, error: mainError } = await supabase.storage
      .from('photobooks')
      .upload(mainFileName, compressedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (mainError) {
      logger.error('Main image upload failed', mainError);
      return {
        success: false,
        error: 'メイン画像のアップロードに失敗しました',
      };
    }

    onProgress?.(70);

    // サムネイルアップロード
    const { data: thumbUpload, error: thumbError } = await supabase.storage
      .from('photobooks')
      .upload(thumbnailFileName, thumbnailFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (thumbError) {
      logger.warn('Thumbnail upload failed', thumbError);
      // サムネイル失敗は致命的ではない
    }

    onProgress?.(90);

    // 公開URLを取得
    const { data: mainUrlData } = supabase.storage
      .from('photobooks')
      .getPublicUrl(mainUpload.path);

    const { data: thumbUrlData } = thumbUpload
      ? supabase.storage.from('photobooks').getPublicUrl(thumbUpload.path)
      : { data: null };

    onProgress?.(100);

    logger.info('Photobook image uploaded successfully', {
      mainPath: mainUpload.path,
      thumbnailPath: thumbUpload?.path,
      userId,
      photobookId,
    });

    return {
      success: true,
      imageUrl: mainUrlData.publicUrl,
      thumbnailUrl: thumbUrlData?.publicUrl,
      metadata: {
        ...metadata,
        fileSize: compressedFile.size, // 圧縮後のサイズ
      },
    };
  } catch (error) {
    logger.error('Upload error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'アップロードに失敗しました',
    };
  }
}

/**
 * Supabase Storageからフォトブック画像を削除する
 */
export async function deletePhotobookImage(
  imageUrl: string,
  thumbnailUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // URLからパスを抽出
    const extractPath = (url: string): string | null => {
      try {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(
          /\/storage\/v1\/object\/public\/photobooks\/(.+)$/
        );
        return pathMatch ? pathMatch[1] : null;
      } catch {
        return null;
      }
    };

    const mainPath = extractPath(imageUrl);
    const thumbPath = thumbnailUrl ? extractPath(thumbnailUrl) : null;

    if (!mainPath) {
      return {
        success: false,
        error: 'Invalid image URL',
      };
    }

    // メイン画像削除
    const { error: mainError } = await supabase.storage
      .from('photobooks')
      .remove([mainPath]);

    if (mainError) {
      logger.error('Main image deletion failed', mainError);
      return {
        success: false,
        error: '画像の削除に失敗しました',
      };
    }

    // サムネイル削除（エラーは無視）
    if (thumbPath) {
      const { error: thumbError } = await supabase.storage
        .from('photobooks')
        .remove([thumbPath]);

      if (thumbError) {
        logger.warn('Thumbnail deletion failed', thumbError);
      }
    }

    logger.info('Photobook image deleted successfully', {
      mainPath,
      thumbPath,
    });

    return { success: true };
  } catch (error) {
    logger.error('Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '削除に失敗しました',
    };
  }
}

/**
 * 複数画像の一括アップロード
 */
export async function uploadMultiplePhotobookImages(
  files: File[],
  userId: string,
  photobookId: string,
  onProgress?: (fileIndex: number, progress: number) => void,
  onFileComplete?: (fileIndex: number, result: UploadResult) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const result = await uploadPhotobookImage(
      file,
      userId,
      photobookId,
      progress => onProgress?.(i, progress)
    );

    results.push(result);
    onFileComplete?.(i, result);

    // 失敗した場合は続行（部分的成功を許可）
    if (!result.success) {
      logger.warn(`File ${i + 1}/${files.length} upload failed:`, result.error);
    }
  }

  return results;
}
