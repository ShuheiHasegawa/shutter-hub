/**
 * Supabaseクエリラッパー - Ajaxラッパー方式
 * 構築済みのクエリビルダーを渡して実行する共通ラッパー
 */

import { logger } from '@/lib/utils/logger';
import { queryMonitor } from '@/lib/utils/query-performance-monitor';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

interface QueryOptions {
  detailed?: boolean;
  timeout?: number;
}

interface QueryMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  responseSize?: number;
  tableName?: string;
}

/**
 * クエリ結果をログ出力する
 */
function logQueryResult(metrics: QueryMetrics, detailed: boolean): void {
  const { operation, duration, success, error, responseSize, tableName } =
    metrics;

  if (detailed) {
    // 詳細モード
    logger.group(`[QueryWrapper] ${operation}`);
    logger.info('Operation:', operation);
    logger.info('Table:', tableName || 'unknown');
    logger.info('Duration:', `${duration.toFixed(2)}ms`);
    logger.info('Success:', success);

    if (responseSize !== undefined) {
      logger.info('Response Size:', `${responseSize} bytes`);
    }

    if (error) {
      logger.error('Error:', error);
      logger.error('Stack Trace:', new Error().stack);
    }

    // パフォーマンス警告
    if (duration > 1000) {
      logger.warn(
        '⚠️ Slow Query Alert:',
        `${operation} took ${duration.toFixed(2)}ms`
      );
    }

    logger.groupEnd();
  } else {
    // シンプルモード
    const status = success ? '✅' : '❌';
    const message = `${status} ${operation}: ${duration.toFixed(2)}ms`;

    if (success) {
      logger.debug(`[QueryWrapper] ${message}`);
    } else {
      logger.error(`[QueryWrapper] ${message} - ${error}`);
    }
  }
}

/**
 * 操作名からテーブル名を推測する
 */
function extractTableName(operation: string): string | undefined {
  const tablePatterns = [
    /profile/i,
    /user/i,
    /session/i,
    /booking/i,
    /photo/i,
    /studio/i,
    /review/i,
    /follow/i,
    /activity/i,
  ];

  for (const pattern of tablePatterns) {
    if (pattern.test(operation)) {
      return pattern.source.replace(/[^a-zA-Z]/g, '').toLowerCase();
    }
  }

  return undefined;
}

/**
 * 関数型クエリビルダーパターン
 * 型安全性を向上させ、型キャストを不要にする
 *
 * @param operation 操作名
 * @param queryBuilder Supabaseクライアントを受け取ってクエリを構築する関数
 * @param options 実行オプション
 * @returns データ（エラー時は例外をスロー）
 */
export async function executeQuery<T>(
  operation: string,
  queryBuilder: (supabase: SupabaseClient) => PromiseLike<unknown>,
  options: QueryOptions = {}
): Promise<T> {
  const { detailed: _detailed = false, timeout: _timeout = 60000 } = options;

  // 本番環境での最適化
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldMonitor = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

  // 本番環境では監視を無効化（パフォーマンス最適化）
  if (isProduction && !shouldMonitor) {
    const supabase = createClient();
    const result = (await queryBuilder(supabase)) as {
      data: unknown;
      error: unknown;
    };
    if (result.error) {
      logger.error(`${operation}エラー:`, result.error);
      throw new Error(`${operation}の実行に失敗しました`);
    }
    // 配列データの場合は最初の要素を返す、単一データの場合はそのまま返す
    return Array.isArray(result.data) && result.data.length === 1
      ? (result.data[0] as T)
      : (result.data as T);
  }

  // 開発環境での監視付き実行
  return executeWithMonitoring(operation, queryBuilder, options);
}

/**
 * 監視付きでクエリを実行する内部関数
 */
async function executeWithMonitoring<T>(
  operation: string,
  queryBuilder: (supabase: SupabaseClient) => PromiseLike<unknown>,
  options: QueryOptions
): Promise<T> {
  const { detailed = false, timeout = 60000 } = options;
  const startTime = performance.now();
  const callId = queryMonitor.startCall(operation);

  // タイムアウト設定
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Query timeout: ${operation}`)), timeout);
  });

  try {
    const supabase = createClient();

    // クエリ実行（タイムアウト付き）
    const resultPromise = queryBuilder(supabase);
    const result = (await Promise.race([resultPromise, timeoutPromise])) as {
      data: unknown;
      error: unknown;
    };
    const endTime = performance.now();
    const duration = endTime - startTime;

    // エラーチェック
    if (result.error) {
      throw new Error((result.error as { message: string }).message);
    }

    // メトリクス作成
    const metrics: QueryMetrics = {
      operation,
      startTime,
      endTime,
      duration,
      success: true,
      responseSize: result.data ? JSON.stringify(result.data).length : 0,
      tableName: extractTableName(operation),
    };

    // 監視システムに記録
    queryMonitor.endCall(callId, true);

    // ログ出力
    logQueryResult(metrics, detailed);

    // 配列データの場合は最初の要素を返す、単一データの場合はそのまま返す
    return Array.isArray(result.data) && result.data.length === 1
      ? (result.data[0] as T)
      : (result.data as T);
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // タイムアウトエラーの場合は詳細情報を追加
    const isTimeout = errorMessage.includes('timeout');
    const additionalInfo = isTimeout
      ? {
          timeout: timeout,
          duration: duration,
          operation,
        }
      : {};

    // エラーメトリクス
    const metrics: QueryMetrics = {
      operation,
      startTime,
      endTime,
      duration,
      success: false,
      error: errorMessage,
      tableName: extractTableName(operation),
    };

    // 監視システムに記録
    queryMonitor.endCall(callId, false, errorMessage);

    // エラーログ出力
    logQueryResult(metrics, detailed);

    // タイムアウトエラーの場合は追加情報をログに記録
    if (isTimeout) {
      logger.error(
        `[QueryWrapper] ❌ ${operation}: ${duration.toFixed(2)}ms - Query timeout`,
        {
          operation,
          duration,
          timeout,
          ...additionalInfo,
        }
      );
    }

    // エラーを再スロー
    logger.error(`${operation}エラー:`, error);
    throw new Error(`${operation}の実行に失敗しました: ${errorMessage}`);
  }
}

/**
 * 複数クエリの並列実行
 */
export async function executeParallelQueries<
  T extends Record<string, unknown>,
>(queries: {
  [K in keyof T]: {
    operation: string;
    queryBuilder: (supabase: SupabaseClient) => PromiseLike<unknown>;
    options?: QueryOptions;
  };
}): Promise<{ [K in keyof T]: T[K] }> {
  const startTime = performance.now();

  logger.group('[QueryWrapper] Parallel Queries V2');
  logger.info(
    'Starting parallel execution of',
    Object.keys(queries).length,
    'queries'
  );

  try {
    const results = await Promise.allSettled(
      Object.entries(queries).map(async ([key, query]) => {
        try {
          const result = await executeQuery(
            query.operation,
            query.queryBuilder,
            query.options
          );
          return [key, result];
        } catch (error) {
          logger.warn(`Query ${query.operation} failed:`, error);
          return [key, null]; // 失敗した場合はnullを返す
        }
      })
    );

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // 成功した結果のみを取得
    const successfulResults = results
      .filter(
        (result): result is PromiseFulfilledResult<[string, unknown]> =>
          result.status === 'fulfilled'
      )
      .map(result => result.value);

    // 失敗したクエリがある場合は警告を出力
    const failedCount = results.length - successfulResults.length;
    if (failedCount > 0) {
      logger.warn(`${failedCount} out of ${results.length} queries failed`);
    }

    logger.info(
      'Parallel execution completed in',
      `${totalDuration.toFixed(2)}ms`
    );
    logger.groupEnd();

    return Object.fromEntries(successfulResults) as { [K in keyof T]: T[K] };
  } catch (error) {
    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    logger.error(
      'Parallel execution failed after',
      `${totalDuration.toFixed(2)}ms`
    );
    logger.error('Error:', error);
    logger.groupEnd();

    throw error;
  }
}

/**
 * 開発環境でのクエリ統計を定期出力する
 */
export function enableQueryStatistics(): void {
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true') {
    // 30秒ごとに統計出力
    setInterval(() => {
      queryMonitor.logStats();
    }, 30000);

    logger.info(
      '[QueryWrapper] Query statistics enabled - reporting every 30 seconds'
    );
  }
}

// ダッシュボード用にqueryMonitorをexport
export { queryMonitor };
