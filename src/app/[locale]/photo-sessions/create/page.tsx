import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

export default function CreatePhotoSessionPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/photo-sessions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            撮影会一覧に戻る
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">撮影会を開催</h1>
        <p className="text-muted-foreground mt-2">
          新しい撮影会を企画・開催しましょう
        </p>
      </div>

      <div className="max-w-2xl">
        <PhotoSessionForm />
      </div>
    </div>
  );
}
