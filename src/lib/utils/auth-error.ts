/**
 * 認証エラーコードから多言語化メッセージを取得するユーティリティ
 * Server Actionsのエラーコードをクライアント側で多言語化メッセージに変換
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 認証エラーコードの型定義
 */
export type AuthErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_CHECK_ERROR'
  | 'PROFILE_FETCH_ERROR'
  | 'INVALID_USER_TYPE'
  | 'USER_TYPE_CHECK_ERROR'
  | 'ADMIN_REQUIRED'
  | 'ADMIN_CHECK_ERROR';

/**
 * エラーコードとmessages/ja.jsonのキーのマッピング
 */
const errorCodeToKeyMap: Record<AuthErrorCode, string> = {
  AUTH_REQUIRED: 'auth.required',
  AUTH_CHECK_ERROR: 'auth.authCheckError',
  PROFILE_FETCH_ERROR: 'auth.profileFetchError',
  INVALID_USER_TYPE: 'auth.invalidUserType',
  USER_TYPE_CHECK_ERROR: 'auth.userTypeCheckError',
  ADMIN_REQUIRED: 'auth.adminRequired',
  ADMIN_CHECK_ERROR: 'auth.adminCheckError',
};

/**
 * メッセージファイルを読み込む（キャッシュ付き）
 */
const cachedMessages: Record<string, Record<string, unknown>> = {};

function loadMessages(locale: 'ja' | 'en'): Record<string, unknown> {
  if (cachedMessages[locale]) {
    return cachedMessages[locale];
  }

  try {
    const messagesPath = join(process.cwd(), 'messages', `${locale}.json`);
    const messagesContent = readFileSync(messagesPath, 'utf-8');
    const messages = JSON.parse(messagesContent);
    cachedMessages[locale] = messages;
    return messages;
  } catch {
    // フォールバック: 空のオブジェクトを返す
    // エラーログは本番環境でも必要なのでloggerは使用しない（ユーティリティ関数のため）
    return {};
  }
}

/**
 * ネストされたキーから値を取得する
 */
function getNestedValue(
  obj: Record<string, unknown>,
  keyPath: string
): string | undefined {
  const keys = keyPath.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : undefined;
}

/**
 * エラーコードから多言語化メッセージを取得する
 * @param code - エラーコード
 * @param locale - ロケール（'ja' | 'en'）
 * @param metadata - エラーメッセージに含める追加情報（例: { userType: 'model' }）
 * @returns 多言語化されたエラーメッセージ
 */
export function getAuthErrorMessage(
  code: AuthErrorCode,
  locale: 'ja' | 'en' = 'ja',
  metadata?: Record<string, unknown>
): string {
  const messages = loadMessages(locale);
  const keyPath = errorCodeToKeyMap[code];
  let message = getNestedValue(messages, keyPath);

  if (!message) {
    // フォールバック: エラーコードをそのまま返す
    return `Unknown error: ${code}`;
  }

  // INVALID_USER_TYPE の場合、userTypeを置換
  if (code === 'INVALID_USER_TYPE' && metadata?.userType) {
    const userType = metadata.userType as string;
    const userTypeKey = `auth.userTypes.${userType}`;
    const userTypeLabel = getNestedValue(messages, userTypeKey) || userType;

    // メッセージ内の{userType}を置換
    message = message.replace('{userType}', userTypeLabel);
  }

  return message;
}

/**
 * Server Actionsのエラーレスポンスから多言語化メッセージを取得する
 * @param errorResponse - Server Actionのエラーレスポンス
 * @param locale - ロケール（'ja' | 'en'）
 * @returns 多言語化されたエラーメッセージ
 */
export function getAuthErrorMessageFromResponse(
  errorResponse: { code: string; metadata?: Record<string, unknown> },
  locale: 'ja' | 'en' = 'ja'
): string {
  return getAuthErrorMessage(
    errorResponse.code as AuthErrorCode,
    locale,
    errorResponse.metadata
  );
}

/**
 * Server Componentsのエラーメッセージからエラーコードを抽出する
 * @param errorMessage - Server Componentからthrowされたエラーメッセージ
 * @returns エラーコード（見つからない場合はnull）
 */
export function extractErrorCode(errorMessage: string): AuthErrorCode | null {
  const match = errorMessage.match(/^([A-Z_]+):/);
  if (match) {
    return match[1] as AuthErrorCode;
  }
  return null;
}
