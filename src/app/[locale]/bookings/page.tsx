import { Suspense } from 'react';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { BookingsList } from '@/components/bookings/BookingsList';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { CalendarIcon } from 'lucide-react';

export default function BookingsPage() {
  return (
    <AuthenticatedLayout>
      <Suspense fallback={<div>読み込み中...</div>}>
        <PageTitleHeader
          title="予約一覧"
          icon={<CalendarIcon className="h-6 w-6" />}
        />
        <BookingsList />
      </Suspense>
    </AuthenticatedLayout>
  );
}
