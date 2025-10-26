/**
 * パフォーマンス監視システム
 * 全てのAPI通信を統一的に監視し、パフォーマンス問題を検出する
 */

import { logger } from '@/lib/utils/logger';

// 監視データの型定義
export interface APICallMetrics {
  id: string;
  operation: string;
  table?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  cacheHit?: boolean;
  requestSize?: number;
  responseSize?: number;
}

export interface PerformanceStats {
  totalCalls: number;
  successRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  slowQueries: APICallMetrics[];
  duplicateRequests: string[];
}

class PerformanceMonitor {
  private metrics: Map<string, APICallMetrics> = new Map();
  private completedMetrics: APICallMetrics[] = [];
  private duplicateTracker: Map<string, number> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';
  }

  /**
   * API呼び出し開始を記録する
   */
  startAPICall(operation: string, table?: string, params?: unknown): string {
    if (!this.isEnabled) return '';

    const id = this.generateCallId(operation, table);
    const startTime = performance.now();

    // 重複リクエストの検出
    const requestKey = this.generateRequestKey(operation, table, params);
    const duplicateCount = this.duplicateTracker.get(requestKey) || 0;
    this.duplicateTracker.set(requestKey, duplicateCount + 1);

    const metrics: APICallMetrics = {
      id,
      operation,
      table,
      startTime,
      success: false,
    };

    this.metrics.set(id, metrics);

    logger.debug(`[API] ${operation}${table ? ` on ${table}` : ''} started`, {
      id,
      isDuplicate: duplicateCount > 0,
      duplicateCount,
    });

    return id;
  }

  /**
   * API呼び出し完了を記録する
   */
  endAPICall(
    id: string,
    success: boolean,
    error?: string,
    cacheHit = false,
    responseSize?: number
  ): void {
    if (!this.isEnabled || !id) return;

    const metrics = this.metrics.get(id);
    if (!metrics) return;

    const endTime = performance.now();
    const duration = endTime - metrics.startTime;

    const completedMetrics: APICallMetrics = {
      ...metrics,
      endTime,
      duration,
      success,
      error,
      cacheHit,
      responseSize,
    };

    this.completedMetrics.push(completedMetrics);
    this.metrics.delete(id);

    // パフォーマンス問題の検出
    this.detectPerformanceIssues(completedMetrics);

    logger.debug(
      `[API] ${metrics.operation}${metrics.table ? ` on ${metrics.table}` : ''} completed`,
      {
        id,
        duration: `${duration.toFixed(2)}ms`,
        success,
        cacheHit,
        error,
      }
    );
  }

  /**
   * SWRキャッシュヒットを記録する
   */
  recordCacheHit(key: string): void {
    if (!this.isEnabled) return;

    logger.debug('[SWR] Cache hit', { key });
  }

  /**
   * SWRフェッチ開始を記録する
   */
  recordSWRFetch(key: string, isRevalidation = false): void {
    if (!this.isEnabled) return;

    logger.debug('[SWR] Fetch started', { key, isRevalidation });
  }

  /**
   * 現在の統計情報を取得する
   */
  getStats(): PerformanceStats {
    if (!this.isEnabled) {
      return {
        totalCalls: 0,
        successRate: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        slowQueries: [],
        duplicateRequests: [],
      };
    }

    const totalCalls = this.completedMetrics.length;
    const successfulCalls = this.completedMetrics.filter(m => m.success).length;
    const cacheHits = this.completedMetrics.filter(m => m.cacheHit).length;
    const totalDuration = this.completedMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );

    // 遅いクエリ（500ms以上）を特定
    const slowQueries = this.completedMetrics.filter(
      m => (m.duration || 0) > 500
    );

    // 重複リクエストを特定
    const duplicateRequests = Array.from(this.duplicateTracker.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key);

    return {
      totalCalls,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      averageResponseTime: totalCalls > 0 ? totalDuration / totalCalls : 0,
      cacheHitRate: totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0,
      errorRate:
        totalCalls > 0
          ? ((totalCalls - successfulCalls) / totalCalls) * 100
          : 0,
      slowQueries,
      duplicateRequests,
    };
  }

  /**
   * 統計情報をコンソールに出力する
   */
  logStats(): void {
    if (!this.isEnabled) return;

    const stats = this.getStats();

    logger.group('📊 API Performance Statistics');
    logger.info(`Total API Calls: ${stats.totalCalls}`);
    logger.info(`Success Rate: ${stats.successRate.toFixed(1)}%`);
    logger.info(
      `Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`
    );
    logger.info(`Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
    logger.info(`Error Rate: ${stats.errorRate.toFixed(1)}%`);

    if (stats.slowQueries.length > 0) {
      logger.warn(`Slow Queries (>500ms): ${stats.slowQueries.length}`);
      stats.slowQueries.forEach(query => {
        logger.warn(
          `  ${query.operation}${query.table ? ` on ${query.table}` : ''}: ${query.duration?.toFixed(2)}ms`
        );
      });
    }

    if (stats.duplicateRequests.length > 0) {
      logger.warn(`Duplicate Requests: ${stats.duplicateRequests.length}`);
      stats.duplicateRequests.forEach(request => {
        logger.warn(`  ${request}`);
      });
    }

    logger.groupEnd();
  }

  /**
   * 統計をリセットする
   */
  reset(): void {
    this.completedMetrics = [];
    this.duplicateTracker.clear();
    this.metrics.clear();
  }

  /**
   * パフォーマンス問題を検出する
   */
  private detectPerformanceIssues(metrics: APICallMetrics): void {
    const duration = metrics.duration || 0;

    // 遅いクエリの警告
    if (duration > 1000) {
      logger.warn(
        `🐌 Slow query detected: ${metrics.operation}${metrics.table ? ` on ${metrics.table}` : ''} took ${duration.toFixed(2)}ms`,
        {
          suggestion:
            'Consider adding database indexes or optimizing the query',
        }
      );
    }

    // エラーの警告
    if (!metrics.success && metrics.error) {
      logger.error(
        `❌ API call failed: ${metrics.operation}${metrics.table ? ` on ${metrics.table}` : ''}`,
        {
          error: metrics.error,
          duration: `${duration.toFixed(2)}ms`,
        }
      );
    }
  }

  /**
   * 呼び出しIDを生成する
   */
  private generateCallId(operation: string, table?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${operation}${table ? `-${table}` : ''}-${timestamp}-${random}`;
  }

  /**
   * リクエストキーを生成する（重複検出用）
   */
  private generateRequestKey(
    operation: string,
    table?: string,
    params?: unknown
  ): string {
    const paramsHash = params ? JSON.stringify(params) : '';
    return `${operation}${table ? `-${table}` : ''}-${paramsHash}`;
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();

// 定期的な統計出力（開発環境のみ）
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true'
) {
  // 30秒ごとに統計を出力
  setInterval(() => {
    const stats = performanceMonitor.getStats();
    if (stats.totalCalls > 0) {
      performanceMonitor.logStats();
    }
  }, 30000);
}
