import { createClient } from '@/lib/supabase/client';

/**
 * プロフィール画像をアップロードしてURLを返す
 */
export async function uploadProfileImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createClient();

    // ファイル名を生成（衝突を避けるためタイムスタンプを追加）
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    // 既存のプロフィール画像を削除
    await deleteProfileImage(userId);

    // 新しい画像をアップロード
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('プロフィール画像アップロードエラー:', error);
      return {
        url: null,
        error: 'プロフィール画像のアップロードに失敗しました',
      };
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('プロフィール画像アップロード処理でエラー:', error);
    return { url: null, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 既存のプロフィール画像を削除する
 */
export async function deleteProfileImage(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();

    // ユーザーの既存画像ファイルを取得
    const { data: files } = await supabase.storage
      .from('profile-images')
      .list(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (files && files.length > 0) {
      // 既存のファイルを削除
      const filePaths = files.map(file => `${userId}/${file.name}`);
      const { error } = await supabase.storage
        .from('profile-images')
        .remove(filePaths);

      if (error) {
        console.error('既存プロフィール画像削除エラー:', error);
        return { error: '既存の画像の削除に失敗しました' };
      }
    }

    return { error: null };
  } catch (error) {
    console.error('プロフィール画像削除処理でエラー:', error);
    return { error: '予期しないエラーが発生しました' };
  }
}

/**
 * ファイルサイズをチェックする（5MB制限）
 */
export function validateProfileImageFile(file: File): {
  valid: boolean;
  error: string | null;
} {
  // ファイルサイズチェック（5MB）
  const maxSize = 5 * 1024 * 1024; // 5MB
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

  return { valid: true, error: null };
}
