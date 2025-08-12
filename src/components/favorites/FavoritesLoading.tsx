import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';

export function FavoritesLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-8 w-8 text-pink-600" />
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
        <div className="grid w-full grid-cols-3 bg-theme-neutral/10 p-1 rounded-lg">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>

        {/* コンテンツグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video relative bg-theme-neutral/10">
                <Skeleton className="w-full h-full" />
                {/* お気に入りボタン */}
                <div className="absolute top-4 right-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
