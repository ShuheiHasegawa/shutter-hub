import { createClient } from '@/lib/supabase/client';

/**
 * メッセージ添付ファイルをアップロードする
 */
export async function uploadMessageFile(
  file: File,
  conversationId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient();

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'ファイルサイズが10MBを超えています',
      };
    }

    // ファイル形式チェック
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'サポートされていないファイル形式です',
      };
    }

    // ファイル名を生成（タイムスタンプ + UUID）
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${extension}`;

    // ストレージパス
    const filePath = `${conversationId}/${fileName}`;

    // ファイルをアップロード
    const { error } = await supabase.storage
      .from('photo-sessions')
      .upload(filePath, file);

    if (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: 'ファイルのアップロードに失敗しました',
      };
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('photo-sessions')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Upload message file error:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}

/**
 * メッセージ添付ファイルを削除する
 */
export async function deleteMessageFile(
  fileUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // URLからファイルパスを抽出
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-2).join('/'); // conversationId/fileName

    // ファイルを削除
    const { error } = await supabase.storage
      .from('photo-sessions')
      .remove([filePath]);

    if (error) {
      console.error('File delete error:', error);
      return {
        success: false,
        error: 'ファイルの削除に失敗しました',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete message file error:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}

/**
 * ファイルサイズを人間が読める形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * ファイルタイプからアイコン名を取得
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf') return 'file-text';
  if (fileType.includes('word')) return 'file-text';
  if (fileType === 'text/plain') return 'file-text';
  return 'file';
}

/**
 * ファイルが画像かどうかを判定
 */
export function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/');
}
