/**
 * ShutterHub 統合ログ管理システム
 * Sentry連携とカスタムロガー
 */

import * as Sentry from '@sentry/nextjs';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

export class Logger {
  /**
   * エラーログ（Sentryに送信）
   */
  static error(message: string, error?: Error | unknown, context?: LogContext) {
    // Development環境でのみconsole出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error, context);
    }

    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: {
          level: 'error',
          component: context?.component || 'unknown',
          action: context?.action || 'unknown',
        },
        extra: context,
        user: context?.userId ? { id: context.userId } : undefined,
      });
    } else {
      Sentry.captureMessage(message, 'error');
    }
  }

  /**
   * 警告ログ
   */
  static warning(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`[WARNING] ${message}`, context);
    }

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: {
        component: context?.component || 'unknown',
        action: context?.action || 'unknown',
      },
      extra: context,
    });
  }

  /**
   * 情報ログ（重要な業務イベント）
   */
  static info(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, context);
    }

    // 重要な業務イベントのみSentryに送信
    if (context?.critical) {
      Sentry.captureMessage(message, {
        level: 'info',
        tags: {
          component: context?.component || 'unknown',
          action: context?.action || 'unknown',
        },
        extra: context,
      });
    }
  }

  /**
   * デバッグログ（開発環境のみ）
   */
  static debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  /**
   * 写真セッション関連の専用ログ
   */
  static photoSession = {
    created: (sessionId: string, userId: string, details: LogContext) => {
      Logger.info('Photo session created', {
        component: 'photo-session',
        action: 'created',
        sessionId,
        userId,
        critical: true,
        ...details,
      });
    },

    error: (sessionId: string, error: Error, context?: LogContext) => {
      Logger.error('Photo session error', error, {
        component: 'photo-session',
        sessionId,
        ...context,
      });
    },

    booked: (sessionId: string, userId: string) => {
      Logger.info('Photo session booked', {
        component: 'photo-session',
        action: 'booked',
        sessionId,
        userId,
        critical: true,
      });
    },
  };

  /**
   * 決済関連の専用ログ
   */
  static payment = {
    started: (paymentId: string, userId: string, amount: number) => {
      Logger.info('Payment started', {
        component: 'payment',
        action: 'started',
        paymentId,
        userId,
        amount,
        critical: true,
      });
    },

    completed: (paymentId: string, userId: string, amount: number) => {
      Logger.info('Payment completed', {
        component: 'payment',
        action: 'completed',
        paymentId,
        userId,
        amount,
        critical: true,
      });
    },

    failed: (paymentId: string, error: Error, context?: LogContext) => {
      Logger.error('Payment failed', error, {
        component: 'payment',
        action: 'failed',
        paymentId,
        critical: true,
        ...context,
      });
    },
  };

  /**
   * Supabase関連の専用ログ
   */
  static supabase = {
    error: (operation: string, error: Error, context?: LogContext) => {
      Logger.error(`Supabase ${operation} error`, error, {
        component: 'supabase',
        action: operation,
        ...context,
      });
    },

    slow: (operation: string, duration: number, context?: LogContext) => {
      Logger.warning(`Slow Supabase operation: ${operation} (${duration}ms)`, {
        component: 'supabase',
        action: operation,
        duration,
        ...context,
      });
    },
  };
}

export default Logger;
