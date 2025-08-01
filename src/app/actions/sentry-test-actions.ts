/**
 * Sentry統合テスト用Server Actions
 * ShutterHub v2
 */

'use server';

import {
  withServerActionErrorHandler,
  withPhotoSessionActionErrorHandler,
  withSupabaseActionErrorHandler,
} from '@/lib/server-action-error-handler';
import Logger from '@/lib/logger';

/**
 * 一般的なServer Actionエラーテスト
 */
export const testServerActionError = withServerActionErrorHandler(
  async (shouldFail: boolean) => {
    Logger.info('Testing server action error handling', {
      component: 'test',
      action: 'error-test',
      shouldFail,
    });

    if (shouldFail) {
      throw new Error('This is a test server action error');
    }

    return { message: 'Server action executed successfully!' };
  },
  {
    actionName: 'testServerActionError',
    component: 'test',
  }
);

/**
 * 写真セッション関連のエラーテスト
 */
export const testPhotoSessionError = withPhotoSessionActionErrorHandler(
  async (sessionId: string) => {
    Logger.photoSession.created(sessionId, 'test-user', {
      test: true,
    });

    // 意図的にエラーを発生
    throw new Error(`Photo session ${sessionId} processing failed`);
  },
  'testPhotoSessionError'
);

/**
 * Supabase関連のエラーテスト
 */
export const testSupabaseError = withSupabaseActionErrorHandler(
  async (operation: string) => {
    Logger.supabase.error(operation, new Error('Database connection failed'), {
      operation,
      test: true,
    });

    throw new Error(`Supabase ${operation} operation failed`);
  },
  {
    actionName: 'testSupabaseError',
    operation: 'test',
  }
);

/**
 * 成功ケースのテスト
 */
export const testSuccessfulAction = withServerActionErrorHandler(
  async (data: unknown) => {
    Logger.info('Successful server action', {
      component: 'test',
      action: 'success-test',
      data,
    });

    return {
      success: true,
      message: 'Action completed successfully',
      data,
    };
  },
  {
    actionName: 'testSuccessfulAction',
    component: 'test',
  }
);

/**
 * 非同期処理のエラーテスト
 */
export const testAsyncError = withServerActionErrorHandler(
  async (delay: number) => {
    await new Promise(resolve => setTimeout(resolve, delay));

    // ランダムにエラーを発生
    if (Math.random() > 0.5) {
      throw new Error('Random async error occurred');
    }

    return { message: 'Async operation completed' };
  },
  {
    actionName: 'testAsyncError',
    component: 'test',
  }
);
