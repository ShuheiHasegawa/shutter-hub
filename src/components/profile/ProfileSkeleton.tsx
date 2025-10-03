import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * プロフィールページのスケルトン表示
 * React 18 Suspenseのfallbackコンポーネント
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* ヘッダースケルトン */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* プロフィール情報スケルトン */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6 relative">
              {/* 右上ボタンスケルトン */}
              <div className="absolute top-4 right-4">
                <Skeleton className="h-8 w-16" />
              </div>

              {/* アバターと基本情報スケルトン */}
              <div className="flex flex-col items-center text-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />

                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex items-center justify-center gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>

                  {/* フォロー統計スケルトン */}
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <Skeleton className="h-5 w-8 mx-auto mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="text-center">
                      <Skeleton className="h-5 w-8 mx-auto mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="my-6">
                <Skeleton className="h-px w-full" />
              </div>

              {/* 詳細情報スケルトン */}
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 活動統計スケルトン */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-8 w-12 mx-auto mb-2" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツスケルトン */}
        <div className="lg:col-span-2 space-y-6">
          {/* タブスケルトン */}
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>

          {/* コンテンツスケルトン */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * コンパクトなプロフィールスケルトン
 */
export function ProfileCompactSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-8 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
