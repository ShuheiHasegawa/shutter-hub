import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

const BUCKET_NAME = 'photo-sessions'; // スタジオ画像もphoto-sessionsバケットを使用
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

/**
 * 画像ファイルをバリデーションする
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
 * スタジオ画像をアップロードする
 */
export async function uploadStudioImage(
  file: File,
  studioId: string
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
    const fileName = `studios/${studioId}/${timestamp}.${fileExtension}`;

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
 * 複数のスタジオ画像を一括アップロードする
 */
export async function uploadMultipleStudioImages(
  files: File[],
  studioId: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadStudioImage(file, studioId);
    results.push(result);
  }

  return results;
}

/**
 * スタジオ画像を削除する
 */
export async function deleteStudioImage(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // URLからパスを抽出
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const studioId = pathParts[pathParts.length - 2];
    const filePath = `studios/${studioId}/${fileName}`;

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
