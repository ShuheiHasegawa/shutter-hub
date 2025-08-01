/**
 * Server Actions用エラーハンドリングユーティリティ
 * ShutterHub v2 Sentry連携
 */

import * as Sentry from '@sentry/nextjs';
import Logger from './logger';

export interface ServerActionError {
  success: false;
  error: string;
  code?: string;
}

export interface ServerActionSuccess<T = unknown> {
  success: true;
  data: T;
}

export type ServerActionResult<T = unknown> =
  | ServerActionSuccess<T>
  | ServerActionError;

/**
 * Server Action用エラーハンドラーデコレータ
 */
export function withServerActionErrorHandler<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  context: {
    actionName: string;
    component: string;
  }
) {
  return async (...args: T): Promise<ServerActionResult<R>> => {
    try {
      const result = await action(...args);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Sentryに送信
      Sentry.captureException(error, {
        tags: {
          component: context.component,
          action: context.actionName,
          type: 'server-action',
        },
        extra: {
          args: JSON.stringify(args, null, 2),
          timestamp: new Date().toISOString(),
        },
      });

      // カスタムロガーに記録
      Logger.error(
        `Server Action Error: ${context.actionName}`,
        error as Error,
        {
          component: context.component,
          action: context.actionName,
          args: args,
        }
      );

      return {
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? errorMessage
            : 'サーバーエラーが発生しました。しばらく後に再試行してください。',
        code:
          error instanceof Error && 'code' in error
            ? (error as Error & { code?: string }).code
            : undefined,
      };
    }
  };
}

/**
 * Supabase関連のServer Action用エラーハンドラー
 */
export function withSupabaseActionErrorHandler<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  context: {
    actionName: string;
    operation: string;
  }
) {
  return withServerActionErrorHandler(action, {
    actionName: context.actionName,
    component: 'supabase',
  });
}

/**
 * 写真セッション関連のServer Action用エラーハンドラー
 */
export function withPhotoSessionActionErrorHandler<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  actionName: string
) {
  return withServerActionErrorHandler(action, {
    actionName,
    component: 'photo-session',
  });
}

/**
 * 決済関連のServer Action用エラーハンドラー
 */
export function withPaymentActionErrorHandler<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  actionName: string
) {
  return withServerActionErrorHandler(action, {
    actionName,
    component: 'payment',
  });
}

/**
 * 認証関連のServer Action用エラーハンドラー
 */
export function withAuthActionErrorHandler<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  actionName: string
) {
  return withServerActionErrorHandler(action, {
    actionName,
    component: 'auth',
  });
}
