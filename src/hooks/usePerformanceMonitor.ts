import { useEffect, useRef, useState, useCallback } from 'react';
import { performanceMonitor } from '@/lib/utils/performance-monitor';
import { logger } from '@/lib/utils/logger';

/**
 * コンポーネント単位でのパフォーマンス監視フック
 */
export function usePerformanceMonitor(componentName: string) {
  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const [isEnabled] = useState(
    () => process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true'
  );

  // マウント時の処理
  useEffect(() => {
    if (!isEnabled) return;

    mountTimeRef.current = performance.now();
    logger.debug(`[Component] ${componentName} mounted`, {
      mountTime: mountTimeRef.current,
    });

    // アンマウント時の処理
    return () => {
      const unmountTime = performance.now();
      const lifespan = unmountTime - mountTimeRef.current;

      logger.debug(`[Component] ${componentName} unmounted`, {
        lifespan: `${lifespan.toFixed(2)}ms`,
        renderCount: renderCountRef.current,
      });
    };
  }, [componentName, isEnabled]);

  // レンダリング回数をカウント
  useEffect(() => {
    if (!isEnabled) return;

    renderCountRef.current += 1;

    if (renderCountRef.current > 10) {
      logger.warn(
        `[Component] ${componentName} has rendered ${renderCountRef.current} times`,
        {
          suggestion:
            'Consider optimizing with React.memo, useMemo, or useCallback',
        }
      );
    }
  });

  // データフェッチ監視
  const trackDataFetch = useCallback(
    (operation: string, fetcher: () => Promise<unknown>) => {
      if (!isEnabled) return fetcher();

      const callId = performanceMonitor.startAPICall(
        `${componentName}-${operation}`
      );

      return fetcher()
        .then(result => {
          performanceMonitor.endAPICall(callId, true);
          return result;
        })
        .catch(error => {
          performanceMonitor.endAPICall(callId, false, error.message);
          throw error;
        });
    },
    [componentName, isEnabled]
  );

  // レンダリング時間測定
  const measureRender = useCallback(
    (renderName: string, renderFn: () => void) => {
      if (!isEnabled) {
        renderFn();
        return;
      }

      const startTime = performance.now();
      renderFn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > 16) {
        // 16ms = 60fps threshold
        logger.warn(
          `[Render] ${componentName}.${renderName} took ${duration.toFixed(2)}ms`,
          {
            suggestion:
              'Consider optimizing expensive calculations or DOM operations',
          }
        );
      }
    },
    [componentName, isEnabled]
  );

  // 統計情報の取得
  const getComponentStats = useCallback(() => {
    if (!isEnabled) return null;

    const currentTime = performance.now();
    const lifespan = currentTime - mountTimeRef.current;

    return {
      componentName,
      lifespan,
      renderCount: renderCountRef.current,
      averageRenderInterval:
        renderCountRef.current > 1 ? lifespan / renderCountRef.current : 0,
    };
  }, [componentName, isEnabled]);

  return {
    trackDataFetch,
    measureRender,
    getComponentStats,
    renderCount: renderCountRef.current,
    isEnabled,
  };
}

/**
 * 複数データフェッチの監視フック
 */
export function useMultiDataFetchMonitor(componentName: string) {
  const [fetchOperations, setFetchOperations] = useState<
    Map<
      string,
      {
        startTime: number;
        status: 'pending' | 'completed' | 'error';
        duration?: number;
      }
    >
  >(new Map());

  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

  const startFetch = useCallback(
    (operationName: string) => {
      if (!isEnabled) return;

      setFetchOperations(prev => {
        const newMap = new Map(prev);
        newMap.set(operationName, {
          startTime: performance.now(),
          status: 'pending',
        });
        return newMap;
      });

      logger.debug(
        `[MultiDataFetch] ${componentName}.${operationName} started`
      );
    },
    [componentName, isEnabled]
  );

  const completeFetch = useCallback(
    (operationName: string, success: boolean) => {
      if (!isEnabled) return;

      setFetchOperations(prev => {
        const newMap = new Map(prev);
        const operation = newMap.get(operationName);

        if (operation) {
          const duration = performance.now() - operation.startTime;
          newMap.set(operationName, {
            ...operation,
            status: success ? 'completed' : 'error',
            duration,
          });

          logger.debug(
            `[MultiDataFetch] ${componentName}.${operationName} ${success ? 'completed' : 'failed'}`,
            {
              duration: `${duration.toFixed(2)}ms`,
            }
          );
        }

        return newMap;
      });
    },
    [componentName, isEnabled]
  );

  const getParallelFetchStats = useCallback(() => {
    if (!isEnabled) return null;

    const operations = Array.from(fetchOperations.entries());
    const completedOps = operations.filter(
      ([, op]) => op.status === 'completed'
    );
    const pendingOps = operations.filter(([, op]) => op.status === 'pending');
    const errorOps = operations.filter(([, op]) => op.status === 'error');

    const totalDuration = completedOps.reduce(
      (sum, [, op]) => sum + (op.duration || 0),
      0
    );
    const maxDuration = Math.max(
      ...completedOps.map(([, op]) => op.duration || 0)
    );

    // 並列実行の効率性を計算
    const parallelEfficiency =
      completedOps.length > 0
        ? totalDuration / completedOps.length / maxDuration
        : 0;

    return {
      totalOperations: operations.length,
      completed: completedOps.length,
      pending: pendingOps.length,
      errors: errorOps.length,
      totalDuration,
      maxDuration,
      parallelEfficiency: parallelEfficiency * 100, // パーセンテージ
      operations: Object.fromEntries(operations),
    };
  }, [fetchOperations, isEnabled]);

  const logParallelFetchSummary = useCallback(() => {
    if (!isEnabled) return;

    const stats = getParallelFetchStats();
    if (!stats || stats.totalOperations === 0) return;

    logger.group(`📊 ${componentName} - Parallel Fetch Summary`);
    logger.info(`Total Operations: ${stats.totalOperations}`);
    logger.info(
      `Completed: ${stats.completed}, Pending: ${stats.pending}, Errors: ${stats.errors}`
    );
    logger.info(`Total Duration: ${stats.totalDuration.toFixed(2)}ms`);
    logger.info(`Max Duration: ${stats.maxDuration.toFixed(2)}ms`);
    logger.info(`Parallel Efficiency: ${stats.parallelEfficiency.toFixed(1)}%`);

    if (stats.parallelEfficiency < 50) {
      logger.warn('Low parallel efficiency detected', {
        suggestion:
          'Consider optimizing data fetching strategy or reducing sequential dependencies',
      });
    }

    logger.groupEnd();
  }, [componentName, getParallelFetchStats, isEnabled]);

  return {
    startFetch,
    completeFetch,
    getParallelFetchStats,
    logParallelFetchSummary,
    isEnabled,
  };
}
