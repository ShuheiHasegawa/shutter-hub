import { Suspense } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { BookingsList } from '@/components/bookings/BookingsList';

export default function BookingsPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <Suspense fallback={<div>読み込み中...</div>}>
          <BookingsList />
        </Suspense>
      </div>
    </MainLayout>
  );
}
