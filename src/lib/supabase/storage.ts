import { createClient } from './client';
import { logger } from '@/lib/utils/logger';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadPhotoSessionImage(
  file: File,
  sessionId?: string
): Promise<UploadResult> {
  try {
    const supabase = createClient();

    // ファイル名を生成（セッションIDがある場合は使用、ない場合はランダム）
    const fileExt = file.name.split('.').pop();
    const fileName = sessionId
      ? `${sessionId}/${Date.now()}.${fileExt}`
      : `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // ファイルをアップロード
    const { data, error } = await supabase.storage
      .from('photo-sessions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      logger.error('画像アップロードエラー:', error);
      return { success: false, error: 'ファイルのアップロードに失敗しました' };
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('photo-sessions')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

export async function deletePhotoSessionImage(url: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // URLからパスを抽出
    const urlParts = url.split('/');
    const path = urlParts.slice(-2).join('/'); // 最後の2つの部分を取得

    const { error } = await supabase.storage
      .from('photo-sessions')
      .remove([path]);

    if (error) {
      logger.error('画像削除エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return false;
  }
}

export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // ファイルサイズチェック (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'ファイルサイズは5MB以下にしてください' };
  }

  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'JPEG、PNG、WebP形式のファイルのみアップロード可能です',
    };
  }

  return { valid: true };
}
