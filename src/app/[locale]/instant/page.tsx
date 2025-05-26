import { Suspense } from 'react';
import { InstantPhotoLanding } from '@/components/instant/InstantPhotoLanding';
import { LoadingCard } from '@/components/ui/loading-card';

export default function InstantPhotoPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<LoadingCard />}>
        <InstantPhotoLanding />
      </Suspense>
    </div>
  );
}
