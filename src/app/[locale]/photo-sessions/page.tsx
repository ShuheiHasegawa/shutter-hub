import { Suspense } from 'react';
import { PhotoSessionList } from '@/components/photo-sessions/PhotoSessionList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function PhotoSessionsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">撮影会一覧</h1>
          <p className="text-muted-foreground mt-2">
            開催予定の撮影会を検索・予約できます
          </p>
        </div>
        <Button asChild>
          <Link href="/photo-sessions/create">
            <Plus className="h-4 w-4 mr-2" />
            撮影会を開催
          </Link>
        </Button>
      </div>

      <Suspense fallback={<div>読み込み中...</div>}>
        <PhotoSessionList />
      </Suspense>
    </div>
  );
}
