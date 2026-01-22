import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * チャート用スケルトンローディング
 */
export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          {/* グラフエリアのスケルトン */}
          <div className="w-full space-y-4">
            {/* Y軸ラベルとグラフエリア */}
            <div className="flex gap-4">
              <div className="w-8 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              <div className="flex-1 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-2">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <Skeleton
                        key={j}
                        className="flex-1 h-6"
                        style={{
                          height: `${Math.random() * 40 + 20}px`,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {/* X軸ラベル */}
            <div className="flex gap-2 ml-12">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-4" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 円グラフ用スケルトン
 */
export function PieChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          <div className="flex items-center gap-8">
            {/* 円グラフ */}
            <div className="relative">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="h-20 w-20 rounded-full" />
              </div>
            </div>
            {/* 凡例 */}
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 線グラフ用スケルトン
 */
export function LineChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          <div className="w-full space-y-4">
            {/* Y軸とグラフエリア */}
            <div className="flex gap-4">
              <div className="w-8 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
              <div className="flex-1 relative">
                {/* 折れ線グラフのパス風 */}
                <div className="absolute inset-0 flex items-end">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex-1 flex justify-center">
                      <Skeleton
                        className="w-2 bg-primary/20"
                        style={{
                          height: `${Math.random() * 100 + 20}px`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* X軸ラベル */}
            <div className="flex gap-2 ml-12">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-3" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
