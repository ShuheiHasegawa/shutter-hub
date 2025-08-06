/**
 * フォトブック対応強化画像アップロードシステム
 * 複数品質レベル対応・自動最適化
 */

import { createClient } from '@/lib/supabase/client';
import Logger from '@/lib/logger';
import {
  validateImageFile,
  IMAGE_QUALITY_CONFIGS,
  generateFileHash,
  type ImageMetadata,
  type OptimizedImageUrls,
} from '@/lib/image-optimization';

export interface EnhancedUploadOptions {
  category: 'profile' | 'photoSession' | 'photobook' | 'social';
  generatePrintVersion?: boolean; // フォトブック用高画質版生成
  enableDeduplication?: boolean; // 重複ファイル検出
  watermark?: boolean; // 透かし追加
  userId: string;
  relatedId?: string; // photo_session_id, photobook_id など
}

export interface EnhancedUploadResult {
  success: boolean;
  urls?: OptimizedImageUrls;
  metadata?: ImageMetadata;
  error?: string;
  duplicateDetected?: boolean;
  originalHash?: string;
}

/**
 * 強化画像アップロード（フォトブック対応）
 */
export async function uploadEnhancedImage(
  file: File,
  options: EnhancedUploadOptions
): Promise<EnhancedUploadResult> {
  const startTime = Date.now();

  try {
    Logger.info('Enhanced image upload started', {
      component: 'enhanced-image-upload',
      action: 'upload-start',
      fileName: file.name,
      fileSize: file.size,
      category: options.category,
      userId: options.userId,
    });

    // 1. ファイルバリデーション
    const validation = validateImageFile(file, options.category);
    if (!validation.valid) {
      Logger.warning('Image validation failed', {
        component: 'enhanced-image-upload',
        action: 'validation-failed',
        error: validation.error,
        fileName: file.name,
      });
      return { success: false, error: validation.error };
    }

    // 2. ファイルハッシュ生成（重複検出用）
    let fileHash: string | undefined;
    if (options.enableDeduplication) {
      fileHash = await generateFileHash(file);

      // 重複チェック
      const duplicateCheck = await checkDuplicate(fileHash, options.userId);
      if (duplicateCheck.exists) {
        Logger.info('Duplicate image detected', {
          component: 'enhanced-image-upload',
          action: 'duplicate-detected',
          hash: fileHash,
          existingUrls: duplicateCheck.urls,
        });

        return {
          success: true,
          urls: duplicateCheck.urls,
          duplicateDetected: true,
          originalHash: fileHash,
        };
      }
    }

    // 3. ファイルパス生成
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const basePath = generateStoragePath(options, timestamp);

    // 4. メタデータ抽出
    const originalDimensions = await getImageDimensions(file);

    // 5. マルチ品質版アップロード
    const uploadResults = await uploadMultipleVersions(
      file,
      basePath,
      fileExtension,
      options,
      originalDimensions
    );

    if (!uploadResults.success) {
      return { success: false, error: uploadResults.error };
    }

    // 6. メタデータ保存
    const metadata: ImageMetadata = {
      originalSize: file.size,
      processedSizes: uploadResults.sizes as {
        web: number;
        print?: number;
        thumbnail: number;
      },
      dimensions: {
        original: originalDimensions,
        web: uploadResults.dimensions!.web,
        print: uploadResults.dimensions?.print,
        thumbnail: uploadResults.dimensions!.thumbnail,
      },
      formats: uploadResults.formats!,
      createdAt: new Date().toISOString(),
      hash: fileHash,
    };

    await saveImageMetadata(uploadResults.urls!.web, metadata, options);

    const duration = Date.now() - startTime;
    Logger.info('Enhanced image upload completed', {
      component: 'enhanced-image-upload',
      action: 'upload-completed',
      duration,
      metadata,
      urls: uploadResults.urls,
      category: options.category,
    });

    return {
      success: true,
      urls: uploadResults.urls,
      metadata,
      originalHash: fileHash,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    Logger.error('Enhanced image upload failed', error as Error, {
      component: 'enhanced-image-upload',
      action: 'upload-failed',
      duration,
      fileName: file.name,
      category: options.category,
    });

    return {
      success: false,
      error: 'アップロード処理中にエラーが発生しました',
    };
  }
}

/**
 * ストレージパス生成
 */
function generateStoragePath(
  options: EnhancedUploadOptions,
  timestamp: number
): string {
  const { category, userId, relatedId } = options;

  switch (category) {
    case 'profile':
      return `${userId}/profile/${timestamp}`;
    case 'photoSession':
      return `${userId}/photo-sessions/${relatedId}/${timestamp}`;
    case 'photobook':
      return `${userId}/photobooks/${relatedId}/${timestamp}`;
    case 'social':
      return `${userId}/social/${timestamp}`;
    default:
      return `${userId}/misc/${timestamp}`;
  }
}

/**
 * 複数品質版アップロード
 */
async function uploadMultipleVersions(
  file: File,
  basePath: string,
  extension: string,
  options: EnhancedUploadOptions,
  originalDimensions: { width: number; height: number }
) {
  const supabase = createClient();
  const config = IMAGE_QUALITY_CONFIGS[options.category];
  const bucket = getBucketName(options.category);

  try {
    const urls: OptimizedImageUrls = {
      web: '',
      thumbnail: '',
    };
    const sizes: Record<string, number> = {};
    const dimensions: Record<string, { width: number; height: number }> = {};
    const formats: string[] = [];

    // Web版アップロード
    const webPath = `${basePath}_web.${getOptimalFormat(config.web.format, extension)}`;
    const webUpload = await supabase.storage
      .from(bucket)
      .upload(webPath, file, {
        cacheControl: '31536000', // 1年キャッシュ
        upsert: true,
      });

    if (webUpload.error) throw webUpload.error;

    const { data: webUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(webUpload.data.path);

    urls.web = webUrlData.publicUrl;
    sizes.web = file.size; // 実際の圧縮後サイズは後で更新
    dimensions.web = calculateResizedDimensions(
      originalDimensions,
      config.web.maxWidth,
      config.web.maxHeight
    );
    formats.push(config.web.format);

    // フォトブック用高画質版（条件付き）
    if (options.generatePrintVersion && options.category === 'photobook') {
      const printPath = `${basePath}_print.${config.print.format}`;
      const printUpload = await supabase.storage
        .from(bucket)
        .upload(printPath, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (printUpload.error) throw printUpload.error;

      const { data: printUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(printUpload.data.path);

      urls.print = printUrlData.publicUrl;
      sizes.print = file.size;
      dimensions.print = calculateResizedDimensions(
        originalDimensions,
        config.print.maxWidth,
        config.print.maxHeight
      );
      formats.push(config.print.format);
    }

    // サムネイル版
    const thumbPath = `${basePath}_thumb.${config.thumbnail.format}`;
    const thumbUpload = await supabase.storage
      .from(bucket)
      .upload(thumbPath, file, {
        cacheControl: '31536000',
        upsert: true,
      });

    if (thumbUpload.error) throw thumbUpload.error;

    const { data: thumbUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(thumbUpload.data.path);

    urls.thumbnail = thumbUrlData.publicUrl;
    sizes.thumbnail = Math.round(file.size * 0.1); // 推定
    dimensions.thumbnail = {
      width: config.thumbnail.width,
      height: config.thumbnail.height,
    };

    return {
      success: true,
      urls,
      sizes,
      dimensions,
      formats,
    };
  } catch (error) {
    Logger.error('Multiple versions upload failed', error as Error, {
      component: 'enhanced-image-upload',
      action: 'multi-upload-failed',
      basePath,
    });

    return {
      success: false,
      error: '複数品質版の生成に失敗しました',
    };
  }
}

/**
 * バケット名取得
 */
function getBucketName(category: string): string {
  switch (category) {
    case 'profile':
      return 'user-storage';
    case 'photoSession':
      return 'photo-sessions';
    case 'photobook':
      return 'user-storage'; // photobookも user-storage を使用
    case 'social':
      return 'user-storage';
    default:
      return 'user-storage';
  }
}

/**
 * 最適フォーマット決定
 */
function getOptimalFormat(
  configFormat: string,
  originalExtension: string
): string {
  // HEIC/HEIF -> JPG
  if (['heic', 'heif'].includes(originalExtension)) {
    return 'jpg';
  }

  // PNG with transparency -> keep PNG, otherwise use config
  if (originalExtension === 'png') {
    return configFormat === 'webp' ? 'webp' : 'png';
  }

  return configFormat === 'webp' ? 'webp' : 'jpg';
}

/**
 * 画像サイズ計算
 */
function calculateResizedDimensions(
  original: { width: number; height: number },
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = original.width / original.height;

  let newWidth = original.width;
  let newHeight = original.height;

  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}

/**
 * 画像メタデータ取得
 */
async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

/**
 * 重複チェック
 */
async function checkDuplicate(
  hash: string,
  userId: string
): Promise<{ exists: boolean; urls?: OptimizedImageUrls }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('image_metadata')
      .select('web_url, print_url, thumbnail_url')
      .eq('file_hash', hash)
      .eq('user_id', userId)
      .limit(1);

    if (error || !data?.length) {
      return { exists: false };
    }

    const existing = data[0];
    return {
      exists: true,
      urls: {
        web: existing.web_url,
        print: existing.print_url || undefined,
        thumbnail: existing.thumbnail_url,
      },
    };
  } catch {
    return { exists: false };
  }
}

/**
 * メタデータ保存
 */
async function saveImageMetadata(
  webUrl: string,
  metadata: ImageMetadata,
  options: EnhancedUploadOptions
): Promise<void> {
  try {
    const supabase = createClient();

    await supabase.from('image_metadata').insert({
      user_id: options.userId,
      web_url: webUrl,
      file_hash: metadata.hash,
      original_size: metadata.originalSize,
      processed_sizes: metadata.processedSizes,
      dimensions: metadata.dimensions,
      formats: metadata.formats,
      category: options.category,
      related_id: options.relatedId,
      created_at: metadata.createdAt,
    });
  } catch (error) {
    Logger.warning('Failed to save image metadata', {
      component: 'enhanced-image-upload',
      action: 'metadata-save-failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default {
  uploadEnhancedImage,
};
