import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

const BUCKET_NAME = 'photo-sessions';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * 画像ファイルをバリデーション
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。${MAX_FILE_SIZE / 1024 / 1024}MB以下にしてください。`,
    };
  }

  // ファイルタイプチェック
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error:
        'サポートされていないファイル形式です。JPEG、PNG、WebP、GIFのみ対応しています。',
    };
  }

  return { valid: true };
}

/**
 * 撮影会画像をアップロード
 */
export async function uploadPhotoSessionImage(
  file: File,
  photoSessionId: string
): Promise<UploadResult> {
  try {
    // バリデーション
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const supabase = createClient();

    // ファイル名を生成（重複を避けるためタイムスタンプを追加）
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${photoSessionId}/${timestamp}.${fileExtension}`;

    // アップロード実行
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      logger.error('Upload error:', error);
      return { success: false, error: 'アップロードに失敗しました。' };
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    logger.error('Upload error:', error);
    return { success: false, error: 'アップロードに失敗しました。' };
  }
}

/**
 * 複数の画像を一括アップロード
 */
export async function uploadMultipleImages(
  files: File[],
  photoSessionId: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadPhotoSessionImage(file, photoSessionId);
    results.push(result);
  }

  return results;
}

/**
 * 画像を削除
 */
export async function deletePhotoSessionImage(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // URLからパスを抽出
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const photoSessionId = pathParts[pathParts.length - 2];
    const filePath = `${photoSessionId}/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      logger.error('Delete error:', error);
      return { success: false, error: '画像の削除に失敗しました。' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Delete error:', error);
    return { success: false, error: '画像の削除に失敗しました。' };
  }
}

/**
 * 撮影会の画像URLリストを更新
 */
export async function updatePhotoSessionImages(
  photoSessionId: string,
  imageUrls: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('photo_sessions')
      .update({ image_urls: imageUrls })
      .eq('id', photoSessionId);

    if (error) {
      logger.error('Update error:', error);
      return { success: false, error: '画像リストの更新に失敗しました。' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Update error:', error);
    return { success: false, error: '画像リストの更新に失敗しました。' };
  }
}

/**
 * 画像URLからサムネイルURLを生成
 */
export function getThumbnailUrl(
  imageUrl: string,
  width: number = 300,
  height: number = 200
): string {
  try {
    const url = new URL(imageUrl);

    // Supabaseの画像変換機能を使用
    url.searchParams.set('width', width.toString());
    url.searchParams.set('height', height.toString());
    url.searchParams.set('resize', 'cover');
    url.searchParams.set('quality', '80');

    return url.toString();
  } catch {
    // URLが無効な場合は元のURLを返す
    return imageUrl;
  }
}

/**
 * 画像の最適化されたURLを生成
 */
export function getOptimizedImageUrl(
  imageUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  } = {}
): string {
  try {
    const url = new URL(imageUrl);

    if (options.width) url.searchParams.set('width', options.width.toString());
    if (options.height)
      url.searchParams.set('height', options.height.toString());
    if (options.quality)
      url.searchParams.set('quality', options.quality.toString());
    if (options.format) url.searchParams.set('format', options.format);

    url.searchParams.set('resize', 'cover');

    return url.toString();
  } catch {
    return imageUrl;
  }
}
