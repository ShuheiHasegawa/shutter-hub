import { Suspense } from 'react';
import { PublicLayout } from '@/components/layout/public-layout';
import { InstantPhotoLanding } from '@/components/instant/InstantPhotoLanding';
import { LoadingCard } from '@/components/ui/loading-card';

export default function InstantPhotoPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<LoadingCard />}>
        <InstantPhotoLanding />
      </Suspense>
    </PublicLayout>
  );
}
