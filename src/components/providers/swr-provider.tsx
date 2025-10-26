'use client';

import { SWRConfig } from 'swr';
import { performanceMonitor } from '@/lib/utils/performance-monitor';
import { logger } from '@/lib/utils/logger';

/**
 * SWRグローバル設定プロバイダー
 * 全てのSWRリクエストを統一的に監視し、パフォーマンス最適化を行う
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // デフォルトフェッチャーは設定しない（各フックで個別に設定）

        // キャッシュ設定
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 2000, // 2秒間の重複防止

        // エラーリトライ設定
        errorRetryCount: 3,
        errorRetryInterval: 1000,

        // SWRイベントの監視
        onSuccess: (data, key) => {
          if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true') {
            logger.debug('[SWR] Success', {
              key,
              dataSize: JSON.stringify(data).length,
            });
          }
        },

        onError: (error, key) => {
          if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true') {
            logger.error('[SWR] Error', error, { key });
          }
        },

        onLoadingSlow: key => {
          if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true') {
            logger.warn('[SWR] Slow loading detected', { key });
          }
        },

        // キャッシュヒット時の監視（一時的に無効化）
        // use: [
        //   useSWRNext => (key, fetcher, config) => {
        //     const swr = useSWRNext(key, fetcher, config);

        //     // キャッシュヒットの検出
        //     if (swr.data && !swr.isLoading && !swr.isValidating) {
        //       performanceMonitor.recordCacheHit(
        //         typeof key === 'string' ? key : JSON.stringify(key)
        //       );
        //     }

        //     return swr;
        //   },
        // ],

        // パフォーマンス監視設定
        loadingTimeout: 3000, // 3秒でスローローディング判定
      }}
    >
      {children}
    </SWRConfig>
  );
}

/**
 * SWR統計情報を取得するヘルパー関数
 */
export function getSWRStats() {
  return performanceMonitor.getStats();
}

/**
 * SWR統計情報をコンソールに出力するヘルパー関数
 */
export function logSWRStats() {
  performanceMonitor.logStats();
}
