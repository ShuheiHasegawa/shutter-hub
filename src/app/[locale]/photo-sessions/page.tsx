'use client';

import { Suspense, useState, useEffect } from 'react';
import { PhotoSessionList } from '@/components/photo-sessions/PhotoSessionList';
import { PhotoSessionsSidebar } from '@/components/layout/PhotoSessionsSidebar';
import { CompactFilterBar } from '@/components/photo-sessions/CompactFilterBar';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
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
  // 初期状態はfalse（閉じた状態）
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
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

    // 画面サイズに応じた初期設定
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        // XL画面以上：サイドバーを開く
        setSidebarOpen(true);
      } else {
        // XL画面未満：サイドバーを閉じる
        setSidebarOpen(false);
      }
    };

    // 初回設定
    handleResize();

    // リサイズイベントリスナー
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

  // マウント前はサーバーサイド対応のため最小限のレンダリング
  if (!isMounted) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">読み込み中...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('list.title')}</h1>
            <p className="text-muted-foreground">{t('list.description')}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* フィルター切り替えボタン */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="gap-2"
            >
              {sidebarOpen ? (
                <>
                  <SidebarClose className="h-4 w-4" />
                  <span className="hidden sm:inline">フィルターを閉じる</span>
                </>
              ) : (
                <>
                  <SidebarOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">フィルターを開く</span>
                </>
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

        {/* フィルター閉じ時の状態インジケーター */}
        {!sidebarOpen && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-700 text-sm">
              フィルターは閉じています。横幅を最大限活用して撮影会を表示しています。
            </p>
          </div>
        )}

        {/* スマホ・タブレット用コンパクトフィルター（XL画面未満のみ） */}
        <div className="xl:hidden">
          <CompactFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
          />
        </div>

        {/* メインコンテンツ */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            sidebarOpen ? 'xl:grid xl:grid-cols-[320px,1fr] xl:gap-6' : 'w-full'
          }`}
        >
          {/* デスクトップサイドバー（XL画面以上のみ） */}
          {sidebarOpen && (
            <aside className="hidden xl:block">
              <div className="sticky top-6">
                <PhotoSessionsSidebar
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={clearFilters}
                />
              </div>
            </aside>
          )}

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
                    <h2 className="text-lg font-semibold">フィルター</h2>
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
                  />
                </div>
              </aside>
            </div>
          )}

          {/* メインコンテンツエリア */}
          <main
            className={`min-w-0 transition-all duration-500 ease-in-out ${
              sidebarOpen &&
              typeof window !== 'undefined' &&
              window.innerWidth >= 1280
                ? 'flex-1'
                : 'w-full max-w-none'
            }`}
          >
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">
                    {t('list.loading')}
                  </span>
                </div>
              }
            >
              <PhotoSessionList filters={filters} />
            </Suspense>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
