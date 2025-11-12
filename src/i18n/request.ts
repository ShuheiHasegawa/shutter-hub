import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { createClient } from '@/lib/supabase/server';

export default getRequestConfig(async ({ requestLocale }) => {
  // URLから取得したロケール
  let locale = await requestLocale;

  // user_metadataから言語設定を取得（認証済みユーザーの場合）
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // user_metadataに言語設定がある場合は優先
    if (user?.user_metadata?.language) {
      const userLanguage = user.user_metadata.language;
      // サポートされている言語の場合のみ使用
      if (routing.locales.includes(userLanguage as 'ja' | 'en')) {
        locale = userLanguage;
      }
    }
  } catch {
    // エラー時はURLのロケールを使用
    // 認証されていない場合もURLのロケールを使用
  }

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as 'ja' | 'en')) {
    locale = routing.defaultLocale;
  }

  return {
    locale: locale as string,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
