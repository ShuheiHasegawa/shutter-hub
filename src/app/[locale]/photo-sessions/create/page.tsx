import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function CreatePhotoSessionPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">撮影会を開催</h1>
          <p className="text-muted-foreground mt-2">
            新しい撮影会を企画・開催しましょう
          </p>
        </div>

        <div className="max-w-2xl">
          <PhotoSessionForm />
        </div>
      </div>
    </DashboardLayout>
  );
}
