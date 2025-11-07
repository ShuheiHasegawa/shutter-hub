import { Suspense } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { InstantPhotoLanding } from '@/components/instant/InstantPhotoLanding';
import { LoadingCard } from '@/components/ui/loading-card';

export default function InstantPhotoPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            <Suspense fallback={<LoadingCard />}>
              <InstantPhotoLanding />
              <Footer />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
