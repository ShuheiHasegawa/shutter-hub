/**
 * Supabaseクエリ専用パフォーマンス監視システム
 * 実際のSupabaseクエリを直接監視する安全なアプローチ
 */

import { logger } from '@/lib/utils/logger';

interface APICallLog {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

class QueryPerformanceMonitor {
  private calls: APICallLog[] = [];
  private callCounter = 0;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';
  }

  /**
   * API呼び出しの開始を記録
   */
  startCall(operation: string): string {
    if (!this.isEnabled) return '';

    this.callCounter++;
    const id = `call-${this.callCounter}-${Date.now()}`;

    const call: APICallLog = {
      id,
      operation,
      startTime: performance.now(),
    };

    this.calls.push(call);
    logger.debug(`[QueryMonitor] Started: ${operation}`, { id });

    return id;
  }

  /**
   * API呼び出しの終了を記録
   */
  endCall(id: string, success: boolean, error?: string): void {
    if (!this.isEnabled || !id) return;

    const call = this.calls.find(c => c.id === id);
    if (!call) return;

    call.endTime = performance.now();
    call.duration = call.endTime - call.startTime;
    call.success = success;
    call.error = error;

    logger.debug(`[QueryMonitor] Ended: ${call.operation}`, {
      id,
      duration: `${call.duration.toFixed(2)}ms`,
      success,
      error,
    });
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    if (!this.isEnabled) {
      return {
        totalCalls: 0,
        completedCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        cacheHitRate: 0,
        recentCalls: [],
      };
    }

    const completedCalls = this.calls.filter(c => c.endTime !== undefined);
    const successfulCalls = completedCalls.filter(c => c.success);
    const failedCalls = completedCalls.filter(c => !c.success);

    const totalDuration = completedCalls.reduce(
      (sum, call) => sum + (call.duration || 0),
      0
    );
    const averageDuration =
      completedCalls.length > 0 ? totalDuration / completedCalls.length : 0;

    // ダッシュボード対応の時間統計
    const durations = completedCalls
      .filter(c => c.duration !== undefined && c.duration > 0)
      .map(c => c.duration as number);
    const minTime = durations.length > 0 ? Math.min(...durations) : 0;
    const maxTime = durations.length > 0 ? Math.max(...durations) : 0;

    return {
      totalCalls: this.calls.length,
      completedCalls: completedCalls.length,
      successfulCalls: successfulCalls.length,
      failedCalls: failedCalls.length,
      // ダッシュボード互換性のエイリアス
      successCount: successfulCalls.length,
      failureCount: failedCalls.length,
      averageDuration,
      averageTime: averageDuration,
      minTime,
      maxTime,
      cacheHitRate: 0, // 将来の拡張用
      recentCalls: completedCalls.slice(-10), // 最新10件
    };
  }

  /**
   * 統計をクリア
   */
  clear(): void {
    this.calls = [];
    this.callCounter = 0;
    logger.debug('[QueryMonitor] Stats cleared');
  }

  /**
   * 統計をコンソールに出力
   */
  logStats(): void {
    if (!this.isEnabled) return;

    const stats = this.getStats();

    // クエリが実行されていない場合はログを出力しない
    if (stats.totalCalls === 0) return;

    logger.group('[QueryMonitor] Performance Stats');
    logger.info(`Total calls: ${stats.totalCalls}`);
    logger.info(`Completed: ${stats.completedCalls}`);
    logger.info(`Successful: ${stats.successfulCalls}`);
    logger.info(`Failed: ${stats.failedCalls}`);
    logger.info(`Average duration: ${stats.averageDuration.toFixed(2)}ms`);

    if (stats.recentCalls.length > 0) {
      logger.info('Recent calls:');
      stats.recentCalls.forEach(call => {
        logger.info(
          `  ${call.operation}: ${call.duration?.toFixed(2)}ms ${call.success ? '✅' : '❌'}`
        );
      });
    }

    logger.groupEnd();
  }
}

// シングルトンインスタンス
export const queryMonitor = new QueryPerformanceMonitor();

/**
 * 非同期関数を監視付きで実行するヘルパー
 */
export async function monitoredCall<T>(
  operation: string,
  asyncFunction: () => Promise<T>
): Promise<T> {
  const callId = queryMonitor.startCall(operation);

  try {
    const result = await asyncFunction();
    queryMonitor.endCall(callId, true);
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    queryMonitor.endCall(callId, false, errorMessage);
    throw error;
  }
}
