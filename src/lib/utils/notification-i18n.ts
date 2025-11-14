/**
 * 通知メッセージの多言語対応ユーティリティ
 * Server Actionで使用
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ユーザーのロケールを取得（user_metadataから）
 * 通知を受信するユーザーのロケールを取得
 */
export async function getUserLocaleForNotification(
  userId: string
): Promise<'ja' | 'en'> {
  try {
    // サービスロールクライアントを使用（RLSをバイパス）
    const supabase = createServiceRoleClient();

    // 通知を受信するユーザーのauth.usersから言語設定を取得
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    if (authUser?.user?.user_metadata?.language) {
      const lang = authUser.user.user_metadata.language;
      if (routing.locales.includes(lang as 'ja' | 'en')) {
        return lang as 'ja' | 'en';
      }
    }

    // デフォルトは日本語
    return 'ja';
  } catch {
    return 'ja';
  }
}

/**
 * 通知メッセージの翻訳を取得
 * @param userId - 通知を受信するユーザーID
 * @param key - 翻訳キー（例: "notificationMessages.photoSession.bookingConfirmed"）
 * @param params - パラメータ（例: { title: "撮影会タイトル" }）
 * @param variant - バリアント（"organizer"の場合はorganizerTitle/organizerMessageを使用）
 */
export async function getNotificationMessage(
  userId: string,
  key: string,
  params?: Record<string, string>,
  variant?: 'organizer'
): Promise<{ title: string; message: string }> {
  const locale = await getUserLocaleForNotification(userId);

  // JSONファイルを直接読み込む（Server Action内で動作）
  const messagesPath = join(process.cwd(), 'messages', `${locale}.json`);
  const messagesContent = readFileSync(messagesPath, 'utf-8');
  const messages = JSON.parse(messagesContent);

  // キーを分割（例: "notificationMessages.photoSession.bookingConfirmed"）
  const keys = key.split('.');
  let value: unknown = messages;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  // パラメータを置換
  const replaceParams = (text: string): string => {
    if (!params || !text) return text || '';
    let result = text;
    for (const [key, val] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }
    return result;
  };

  if (typeof value === 'string') {
    return { title: replaceParams(value), message: replaceParams(value) };
  }

  // オブジェクトの場合
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const messageObj = value as Record<string, unknown>;

    if (variant === 'organizer') {
      // 運営者向けのメッセージを取得
      const organizerTitle =
        typeof messageObj.organizerTitle === 'string'
          ? messageObj.organizerTitle
          : typeof messageObj.title === 'string'
            ? messageObj.title
            : '';
      const organizerMessage =
        typeof messageObj.organizerMessage === 'string'
          ? messageObj.organizerMessage
          : typeof messageObj.message === 'string'
            ? messageObj.message
            : '';

      return {
        title: replaceParams(organizerTitle),
        message: replaceParams(organizerMessage),
      };
    }

    // 通常のメッセージを取得
    const title = typeof messageObj.title === 'string' ? messageObj.title : '';
    const message =
      typeof messageObj.message === 'string' ? messageObj.message : '';

    return {
      title: replaceParams(title),
      message: replaceParams(message),
    };
  }

  // フォールバック
  return {
    title: '',
    message: '',
  };
}
