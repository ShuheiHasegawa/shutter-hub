import { createClient } from '@/lib/supabase/client';

/**
 * プロフィール画像をアップロードしてURLを返す
 * 新しいディレクトリ構造: [userId]/profile/avatar.[ext]
 */
export async function uploadProfileImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createClient();

    // 新しいディレクトリ構造：[userId]/profile/avatar.[ext]
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/profile/avatar.${fileExt}`;

    // 既存のプロフィール画像を削除
    await deleteProfileImage(userId);

    // 新しい画像をアップロード
    const { data, error } = await supabase.storage
      .from('user-storage')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // 同名ファイルを上書き
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
      .from('user-storage')
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('プロフィール画像アップロード処理でエラー:', error);
    return { url: null, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 既存のプロフィール画像を削除する
 * profileディレクトリ内の画像のみ削除
 */
export async function deleteProfileImage(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();

    // ユーザーのprofileディレクトリ内の既存画像ファイルを取得
    const { data: files } = await supabase.storage
      .from('user-storage')
      .list(`${userId}/profile`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (files && files.length > 0) {
      // 既存のファイルを削除
      const filePaths = files.map(file => `${userId}/profile/${file.name}`);
      const { error } = await supabase.storage
        .from('user-storage')
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
 * ファイルサイズをチェックする（10MB制限）
 */
export function validateProfileImageFile(file: File): {
  valid: boolean;
  error: string | null;
} {
  // ファイルサイズチェック（10MB）
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'ファイルサイズは10MB以下にしてください' };
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

/**
 * 将来のポートフォリオ機能のためのユーティリティ関数
 */

/**
 * ユーザーのポートフォリオ画像をアップロードする（将来実装）
 */
export async function uploadPortfolioImage(
  file: File,
  userId: string,
  imageName?: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createClient();

    // ポートフォリオディレクトリ構造：[userId]/portfolio/[imageName].[ext]
    const fileExt = file.name.split('.').pop();
    const fileName = imageName
      ? `${userId}/portfolio/${imageName}.${fileExt}`
      : `${userId}/portfolio/image-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('user-storage')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('ポートフォリオ画像アップロードエラー:', error);
      return {
        url: null,
        error: 'ポートフォリオ画像のアップロードに失敗しました',
      };
    }

    const { data: urlData } = supabase.storage
      .from('user-storage')
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('ポートフォリオ画像アップロード処理でエラー:', error);
    return { url: null, error: '予期しないエラーが発生しました' };
  }
}

/**
 * ユーザーのポートフォリオ画像一覧を取得する（将来実装）
 */
export async function getPortfolioImages(userId: string): Promise<{
  images: { name: string; url: string; created_at: string }[];
  error: string | null;
}> {
  try {
    const supabase = createClient();

    const { data: files, error } = await supabase.storage
      .from('user-storage')
      .list(`${userId}/portfolio`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('ポートフォリオ画像取得エラー:', error);
      return { images: [], error: 'ポートフォリオ画像の取得に失敗しました' };
    }

    const images =
      files?.map(file => ({
        name: file.name,
        url: supabase.storage
          .from('user-storage')
          .getPublicUrl(`${userId}/portfolio/${file.name}`).data.publicUrl,
        created_at: file.created_at,
      })) || [];

    return { images, error: null };
  } catch (error) {
    console.error('ポートフォリオ画像取得処理でエラー:', error);
    return { images: [], error: '予期しないエラーが発生しました' };
  }
}
