/**
 * 認証エラーコードから多言語化メッセージを取得するユーティリティ
 * Server Actionsのエラーコードをクライアント側で多言語化メッセージに変換
 */

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
  const messages = {
    ja: {
      AUTH_REQUIRED: '認証が必要です',
      AUTH_CHECK_ERROR: '認証チェック中にエラーが発生しました',
      PROFILE_FETCH_ERROR: 'プロフィールの取得に失敗しました',
      INVALID_USER_TYPE: (userType?: string) => {
        const userTypeLabels: Record<string, string> = {
          model: 'モデル',
          photographer: 'カメラマン',
          organizer: '運営者',
        };
        const label = userType
          ? userTypeLabels[userType] || userType
          : '指定されたユーザータイプ';
        return `この機能は${label}のみ利用可能です`;
      },
      USER_TYPE_CHECK_ERROR: 'ユーザータイプチェック中にエラーが発生しました',
      ADMIN_REQUIRED: '管理者権限が必要です',
      ADMIN_CHECK_ERROR: '管理者権限チェック中にエラーが発生しました',
    },
    en: {
      AUTH_REQUIRED: 'Authentication required',
      AUTH_CHECK_ERROR: 'An error occurred during authentication check',
      PROFILE_FETCH_ERROR: 'Failed to fetch profile',
      INVALID_USER_TYPE: (userType?: string) => {
        const userTypeLabels: Record<string, string> = {
          model: 'Model',
          photographer: 'Photographer',
          organizer: 'Organizer',
        };
        const label = userType
          ? userTypeLabels[userType] || userType
          : 'specified user type';
        return `This feature is only available for ${label}`;
      },
      USER_TYPE_CHECK_ERROR: 'An error occurred during user type check',
      ADMIN_REQUIRED: 'Admin privileges required',
      ADMIN_CHECK_ERROR: 'An error occurred during admin role check',
    },
  };

  const localeMessages = messages[locale];
  const message = localeMessages[code];

  if (typeof message === 'function') {
    // INVALID_USER_TYPE の場合、metadataからuserTypeを取得
    const userType = metadata?.userType as string | undefined;
    return message(userType);
  }

  return message || `Unknown error: ${code}`;
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
