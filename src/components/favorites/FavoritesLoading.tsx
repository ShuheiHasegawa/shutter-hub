import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function FavoritesLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>

        {/* 統計カード */}
        <div className="flex gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-theme-neutral/20 rounded" />
                  <div>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 検索・フィルター */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
        </div>
      </div>

      {/* タブ */}
      <div className="space-y-6">
        <div className="grid w-full grid-cols-2 bg-theme-neutral/10 p-1 rounded-lg">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>

        {/* コンテンツ（StudioCardの構造に合わせる） */}
        <div className="space-y-3 md:space-y-4 pb-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-0">
                {/* メイン画像 */}
                <div className="aspect-video relative bg-theme-neutral/10 rounded-t-lg overflow-hidden">
                  <Skeleton className="w-full h-full" />
                  {/* バッジ（左上） */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  {/* お気に入りボタン（右上） */}
                  <div className="absolute top-2 right-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* スタジオ名 */}
                <Skeleton className="h-6 w-full mb-2" />

                {/* 基本情報 */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>

                {/* 評価 */}
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>

                {/* 設備アイコン */}
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>

                {/* 統計情報 */}
                <div className="space-y-1 border-t border-theme-neutral/20 pt-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
