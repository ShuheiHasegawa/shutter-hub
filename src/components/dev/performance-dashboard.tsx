'use client';

import { useState, useEffect } from 'react';
import { performanceMonitor } from '@/lib/utils/performance-monitor';
import { queryMonitor } from '@/lib/supabase/query-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  RefreshCw,
  Zap,
  Database,
} from 'lucide-react';

/**
 * クエリ統計データの型定義
 */
interface QueryStatsData {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  cacheHitRate: number;
}

/**
 * 開発者向けパフォーマンス監視ダッシュボード
 * 開発環境でのみ表示される
 * queryWrapperの実際の通信統計データを表示する
 */
export function PerformanceDashboard() {
  const [stats, setStats] = useState(performanceMonitor.getStats());
  const [queryStats, setQueryStats] = useState<QueryStatsData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 開発環境でのみ表示
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      setStats(performanceMonitor.getStats());
      // queryStatisticsを取得（queryMonitorから）
      try {
        const statsData = (
          queryMonitor as unknown as { getStats?: () => QueryStatsData }
        )?.getStats?.();
        if (statsData) {
          setQueryStats(statsData);
        }
      } catch {
        // silently ignore if getStats is not available
      }
    }, 2000); // 2秒ごとに更新

    return () => clearInterval(interval);
  }, [isEnabled]);

  if (!isEnabled) return null;

  const handleReset = () => {
    performanceMonitor.reset();
    setStats(performanceMonitor.getStats());
  };

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // 実際のクエリ統計データを使用して表示データを決定
  const totalCalls = queryStats?.totalCalls ?? stats.totalCalls;
  const avgResponseTimeNum =
    queryStats?.averageTime ?? stats.averageResponseTime;
  const avgResponseTime = avgResponseTimeNum.toFixed(0);
  const successCount = queryStats?.successCount ?? 0;
  const failureCount = queryStats?.failureCount ?? 0;
  const totalAttempts = successCount + failureCount;
  const successRateNum =
    totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;
  const successRate = successRateNum.toFixed(1);

  const getPerformanceStatus = () => {
    if (totalCalls === 0) return { status: 'idle', color: 'secondary' };
    if (failureCount > 0 && failureCount > successCount * 0.1)
      return { status: 'error', color: 'destructive' };
    if (avgResponseTimeNum > 1000)
      return { status: 'warning', color: 'warning' };
    if (successRateNum >= 95) return { status: 'excellent', color: 'success' };
    return { status: 'good', color: 'default' };
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* トグルボタン */}
      <Button
        onClick={handleToggleVisibility}
        variant="outline"
        size="sm"
        className="mb-2 shadow-lg"
      >
        <Activity className="h-4 w-4" />
        Performance
        <Badge
          variant={
            performanceStatus.color as
              | 'default'
              | 'secondary'
              | 'destructive'
              | 'outline'
          }
          className="ml-2"
        >
          {totalCalls}
        </Badge>
      </Button>

      {/* ダッシュボード */}
      {isVisible && (
        <Card className="w-96 shadow-xl border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                API Performance Monitor
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleToggleVisibility}
                  variant="ghost"
                  size="sm"
                >
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* データソース表示 */}
            {queryStats && (
              <div className="text-xs p-2 bg-blue-50 rounded flex items-center gap-2">
                <Database className="h-3 w-3 text-blue-600" />
                <span className="text-blue-700">
                  実際の通信統計を表示中（Query Wrapper）
                </span>
              </div>
            )}

            {/* 基本統計 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold">{totalCalls}</div>
                <div className="text-sm text-muted-foreground">Total Calls</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold">{avgResponseTime}ms</div>
                <div className="text-sm text-muted-foreground">
                  Avg Response
                </div>
              </div>
            </div>

            {/* 成功率・エラー率 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700">
                    {successRate}%
                  </span>
                </div>
                <div className="text-xs text-green-600">Success</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-700">
                    {queryStats?.cacheHitRate?.toFixed(1) ??
                      stats.cacheHitRate.toFixed(1)}
                    %
                  </span>
                </div>
                <div className="text-xs text-blue-600">Cache Hit</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-semibold text-red-700">
                    {failureCount}
                  </span>
                </div>
                <div className="text-xs text-red-600">Failures</div>
              </div>
            </div>

            {/* クエリ統計詳細 */}
            {queryStats && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-medium mb-2">
                    Query Statistics
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between p-2 bg-muted/20 rounded">
                      <span>Successful:</span>
                      <span className="font-semibold text-green-600">
                        {queryStats.successCount}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/20 rounded">
                      <span>Failed:</span>
                      <span className="font-semibold text-red-600">
                        {queryStats.failureCount}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/20 rounded">
                      <span>Min Time:</span>
                      <span className="font-semibold">
                        {queryStats.minTime?.toFixed(0) ?? 'N/A'}ms
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/20 rounded">
                      <span>Max Time:</span>
                      <span className="font-semibold">
                        {queryStats.maxTime?.toFixed(0) ?? 'N/A'}ms
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 遅いクエリ */}
            {stats.slowQueries.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-sm">Slow Queries</span>
                    <Badge variant="secondary">
                      {stats.slowQueries.length}
                    </Badge>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {stats.slowQueries.slice(0, 3).map((query, index) => (
                      <div
                        key={index}
                        className="text-xs p-2 bg-yellow-50 rounded"
                      >
                        <div className="font-medium">
                          {query.operation}
                          {query.table && ` on ${query.table}`}
                        </div>
                        <div className="text-yellow-700">
                          {query.duration?.toFixed(0)}ms
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 重複リクエスト */}
            {stats.duplicateRequests.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-sm">
                      Duplicate Requests
                    </span>
                    <Badge variant="secondary">
                      {stats.duplicateRequests.length}
                    </Badge>
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {stats.duplicateRequests
                      .slice(0, 2)
                      .map((request, index) => (
                        <div
                          key={index}
                          className="text-xs p-2 bg-orange-50 rounded"
                        >
                          {request.length > 40
                            ? `${request.substring(0, 40)}...`
                            : request}
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* 最適化提案 */}
            {(stats.slowQueries.length > 0 ||
              stats.duplicateRequests.length > 0 ||
              failureCount > 0) && (
              <>
                <Separator />
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-medium text-sm text-blue-800 mb-2">
                    💡 Optimization Suggestions
                  </div>
                  <div className="space-y-1 text-xs text-blue-700">
                    {stats.slowQueries.length > 0 && (
                      <div>
                        • Consider adding database indexes for slow queries
                      </div>
                    )}
                    {stats.duplicateRequests.length > 0 && (
                      <div>
                        • Implement request deduplication or increase SWR
                        dedupingInterval
                      </div>
                    )}
                    {failureCount > 0 && (
                      <div>
                        • Investigate {failureCount} API failures for potential
                        issues
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 統計が空の場合 */}
            {totalCalls === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No API calls detected yet</div>
                <div className="text-xs">
                  Start using the app to see performance metrics
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
