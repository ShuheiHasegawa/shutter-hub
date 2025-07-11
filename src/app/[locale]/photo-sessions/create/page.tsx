import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function CreatePhotoSessionPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="max-w-2xl">
          <PhotoSessionForm />
        </div>
      </div>
    </DashboardLayout>
  );
}
