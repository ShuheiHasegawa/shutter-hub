'use client';

import { Suspense, useState } from 'react';
import { PhotoSessionList } from '@/components/photo-sessions/PhotoSessionList';
import { PhotoSessionsSidebar } from '@/components/layout/PhotoSessionsSidebar';
import { Button } from '@/components/ui/button';
import { Plus, SidebarOpen, SidebarClose } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import type { BookingType } from '@/types/database';

interface FilterState {
  keyword: string;
  location: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  bookingTypes: BookingType[];
  participantsMin: string;
  participantsMax: string;
  onlyAvailable: boolean;
}

export default function PhotoSessionsPage() {
  const t = useTranslations('photoSessions');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    location: '',
    priceMin: '',
    priceMax: '',
    dateFrom: '',
    dateTo: '',
    bookingTypes: [],
    participantsMin: '',
    participantsMax: '',
    onlyAvailable: false,
  });

  const clearFilters = () => {
    setFilters({
      keyword: '',
      location: '',
      priceMin: '',
      priceMax: '',
      dateFrom: '',
      dateTo: '',
      bookingTypes: [],
      participantsMin: '',
      participantsMax: '',
      onlyAvailable: false,
    });
  };

  return (
    <div className="container mx-auto py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('list.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('list.description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? (
              <SidebarClose className="h-4 w-4" />
            ) : (
              <SidebarOpen className="h-4 w-4" />
            )}
          </Button>
          <Button asChild>
            <Link href="/photo-sessions/create">
              <Plus className="h-4 w-4 mr-2" />
              {t('createSession')}
            </Link>
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex gap-8">
        {/* サイドバー */}
        <aside
          className={`w-80 flex-shrink-0 transition-all duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarOpen ? 'block' : 'hidden lg:block'}`}
        >
          <PhotoSessionsSidebar
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
            className="sticky top-8"
          />
        </aside>

        {/* メインコンテンツエリア */}
        <main className="flex-1 min-w-0">
          <Suspense fallback={<div>{t('list.loading')}</div>}>
            <PhotoSessionList filters={filters} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
