'use client';

import { Suspense, useState, useEffect } from 'react';
import { PhotoSessionList } from '@/components/photo-sessions/PhotoSessionList';
import { PhotoSessionsSidebar } from '@/components/layout/PhotoSessionsSidebar';
import { CompactFilterBar } from '@/components/photo-sessions/CompactFilterBar';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { Button } from '@/components/ui/button';
import { CameraIcon, SidebarClose } from 'lucide-react';
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
  // 初期状態はfalse（閉じた状態）
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
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

  // クライアントサイド初期化とレスポンシブ対応
  useEffect(() => {
    setIsMounted(true);

    // PC版（XL画面以上）ではサイドバーを常に開く
    // モバイル版（XL画面未満）では閉じる（オーバーレイ表示のため）
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        // XL画面以上：サイドバーを常に開く（PC版では開閉不可）
        setSidebarOpen(true);
      } else {
        // XL画面未満：サイドバーを閉じる（モバイル版はオーバーレイで開閉可能）
        setSidebarOpen(false);
      }
    };

    // 初回設定
    handleResize();

    // リサイズイベントリスナー（モバイル→PC遷移時のみサイドバーを開く）
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleSearch = () => {
    setIsSearchLoading(true);
    setSearchTrigger(prev => prev + 1);
    // ローディング状態は PhotoSessionList 側で管理されるため、
    // 一定時間後にリセット
    setTimeout(() => {
      setIsSearchLoading(false);
    }, 1000);
  };

  // マウント前はサーバーサイド対応のため最小限のレンダリング
  if (!isMounted) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin-slow rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-muted-foreground">
              {t('list.loading')}
            </span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col h-full">
        <PageTitleHeader
          title="撮影会一覧"
          icon={<CameraIcon className="h-6 w-6" />}
        />

        {/* スマホ・タブレット用コンパクトフィルター（XL画面未満のみ） */}
        <div className="xl:hidden flex-shrink-0">
          <CompactFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
            onSearch={handleSearch}
            isSearchLoading={isSearchLoading}
          />
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 min-h-0 xl:grid xl:grid-cols-[320px,1fr] xl:gap-6">
          {/* デスクトップサイドバー（XL画面以上：常に表示） */}
          <aside className="hidden xl:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto sidebar-scroll">
              <PhotoSessionsSidebar
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
                onSearch={handleSearch}
                isSearchLoading={isSearchLoading}
              />
            </div>
          </aside>

          {/* モバイル・タブレットサイドバー（XL画面未満でのオーバーレイ） */}
          {sidebarOpen && (
            <div
              className="xl:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            >
              <aside
                className="absolute left-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">
                      {t('sidebar.filters')}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarOpen(false)}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <SidebarClose className="h-4 w-4" />
                    </Button>
                  </div>
                  <PhotoSessionsSidebar
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={clearFilters}
                    onSearch={handleSearch}
                    isSearchLoading={isSearchLoading}
                  />
                </div>
              </aside>
            </div>
          )}

          {/* メインコンテンツエリア */}
          <main className="min-w-0 flex flex-col flex-1 min-h-0 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin-slow rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-sm text-muted-foreground">
                    {t('list.loading')}
                  </span>
                </div>
              }
            >
              <PhotoSessionList
                filters={filters}
                searchTrigger={searchTrigger}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(prev => !prev)}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
