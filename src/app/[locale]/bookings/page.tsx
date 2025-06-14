import { Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { BookingsList } from '@/components/bookings/BookingsList';

export default function BookingsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>読み込み中...</div>}>
        <BookingsList />
      </Suspense>
    </DashboardLayout>
  );
}
