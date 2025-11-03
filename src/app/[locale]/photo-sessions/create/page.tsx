import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';

export default function CreatePhotoSessionPage() {
  return (
    <AuthenticatedLayout>
      <PhotoSessionForm />
    </AuthenticatedLayout>
  );
}
