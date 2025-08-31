import { Suspense } from 'react';
import { AuthenticatedLayout } from '@/components/layout/dashboard-layout';
import { BookingsList } from '@/components/bookings/BookingsList';

export default function BookingsPage() {
  return (
    <AuthenticatedLayout>
      <Suspense fallback={<div>読み込み中...</div>}>
        <BookingsList />
      </Suspense>
    </AuthenticatedLayout>
  );
}
