'use client';

import { Suspense } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useComprehensiveActivityStats } from '@/hooks/useActivityCharts';
import { MonthlyActivityChart } from './MonthlyActivityChart';
import { SessionTypeChart } from './SessionTypeChart';
import { RatingTrendChart } from './RatingTrendChart';
import {
  ChartSkeleton,
  PieChartSkeleton,
  LineChartSkeleton,
} from './ChartSkeleton';

interface ActivityChartsContainerProps {
  /** ユーザーID */
  userId: string;
  /** 自分のプロフィールかどうか */
  isOwnProfile?: boolean;
}

/**
 * 活動統計チャートのメインコンテナ
 * 複数のチャートを統合して表示し、エラーハンドリングとローディング状態を管理
 */
export function ActivityChartsContainer({
  userId,
  isOwnProfile = false,
}: ActivityChartsContainerProps) {
  const { stats, error, isLoading, refresh } =
    useComprehensiveActivityStats(userId);

  // エラー状態の表示
  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>活動統計の読み込みに失敗しました</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              className="ml-4"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              再試行
            </Button>
          </AlertDescription>
        </Alert>

        {/* エラー時でもスケルトンを表示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <PieChartSkeleton />
          <div className="lg:col-span-2">
            <LineChartSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // 部分的なエラーがある場合の警告表示
  const hasPartialErrors = stats.errors && stats.errors.length > 0;

  return (
    <div className="space-y-6">
      {/* 部分的エラーの警告 */}
      {hasPartialErrors && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            一部の統計データの読み込みに失敗しました: {stats.errors.join(', ')}
            {isOwnProfile && (
              <Button
                variant="link"
                size="sm"
                onClick={() => refresh()}
                className="ml-2 p-0 h-auto"
              >
                再試行
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* チャート表示 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月別活動統計 */}
        <Suspense fallback={<ChartSkeleton />}>
          <MonthlyActivityChart
            data={stats.monthlyActivity}
            isLoading={isLoading}
          />
        </Suspense>

        {/* 撮影会タイプ分布 */}
        <Suspense fallback={<PieChartSkeleton />}>
          <SessionTypeChart data={stats.sessionTypes} isLoading={isLoading} />
        </Suspense>

        {/* 評価推移（横幅全体） */}
        <div className="lg:col-span-2">
          <Suspense fallback={<LineChartSkeleton />}>
            <RatingTrendChart data={stats.ratingTrend} isLoading={isLoading} />
          </Suspense>
        </div>
      </div>

      {/* データなし状態の案内 */}
      {!isLoading &&
        stats.monthlyActivity.length === 0 &&
        stats.sessionTypes.length === 0 &&
        stats.ratingTrend.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                まだ活動データがありません
              </h3>
              <p className="text-sm max-w-md mx-auto">
                {isOwnProfile
                  ? '撮影会に参加・主催すると、ここに活動統計が表示されます'
                  : 'このユーザーの活動データはまだありません'}
              </p>
            </div>
          </div>
        )}

      {/* デバッグ情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            デバッグ情報（開発環境のみ）
          </summary>
          <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(
              {
                userId,
                isOwnProfile,
                isLoading,
                hasError: !!error,
                dataPoints: {
                  monthly: stats.monthlyActivity.length,
                  types: stats.sessionTypes.length,
                  ratings: stats.ratingTrend.length,
                },
                errors: stats.errors,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
}
