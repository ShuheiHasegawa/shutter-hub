// サーバーサイド専用の日付ユーティリティ関数
// クライアントコンポーネントからは使用不可

/**
 * ユーザーのタイムゾーンを取得する（user_metadataから）
 * サーバーサイドでのみ使用可能
 */
export async function getUserTimezone(): Promise<string> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.timezone) {
      return user.user_metadata.timezone;
    }
  } catch {
    // エラー時はデフォルト値を返す
  }
  return 'Asia/Tokyo';
}

/**
 * ユーザーのロケールを取得する（user_metadataから）
 * サーバーサイドでのみ使用可能
 */
export async function getUserLocale(): Promise<string> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.language) {
      const lang = user.user_metadata.language;
      // 'ja' -> 'ja-JP', 'en' -> 'en-US' に変換
      return lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : lang;
    }
  } catch {
    // エラー時はデフォルト値を返す
  }
  return 'ja-JP';
}
