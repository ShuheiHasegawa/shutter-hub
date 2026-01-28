import { Suspense } from 'react';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { InstantPhotoLanding } from '@/components/instant/InstantPhotoLanding';
import { LoadingCard } from '@/components/ui/loading-card';

export default function InstantPhotoPage() {
  return (
    <AuthenticatedLayout allowPublic>
      <Suspense fallback={<LoadingCard />}>
        <InstantPhotoLanding />
      </Suspense>
    </AuthenticatedLayout>
  );
}
