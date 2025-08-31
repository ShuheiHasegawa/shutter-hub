import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { AuthenticatedLayout } from '@/components/layout/dashboard-layout';

export default function CreatePhotoSessionPage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="max-w-2xl">
          <PhotoSessionForm />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
