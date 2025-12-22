'use client';

import { Suspense, useState, useEffect } from 'react';
import { PhotoSessionList } from '@/components/photo-sessions/PhotoSessionList';
import { CompactFilterBar } from '@/components/photo-sessions/CompactFilterBar';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { LayoutToggle } from '@/components/photo-sessions/LayoutToggle';
import { StickyHeader } from '@/components/ui/sticky-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLayoutPreference } from '@/hooks/useLayoutPreference';
import { CameraIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUserProfile } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
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
  const { layout, updateLayout } = useLayoutPreference();
  const { profile, loading: profileLoading } = useUserProfile();
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
  const [sortBy, setSortBy] = useState<
    'start_time' | 'price' | 'created_at' | 'popularity' | 'end_time'
  >('start_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterByActivityLocation, setFilterByActivityLocation] =
    useState(false);

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
          actions={
            <LayoutToggle
              currentLayout={layout}
              onLayoutChange={updateLayout}
            />
          }
        />

        {/* フィルターとコントロール（StickyHeaderで固定） */}
        <StickyHeader className="px-4 py-3 space-y-3">
          {/* 1行目: CompactFilterBar（検索バーとフィルターボタン） */}
          <CompactFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
            onSearch={handleSearch}
            isSearchLoading={isSearchLoading}
          />

          {/* 2行目: チェックボックス、並び順、作成ボタン */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
            {/* 左側: チェックボックス */}
            <div className="flex items-center gap-2 flex-wrap">
              <Checkbox
                id="only-available-header"
                checked={filters.onlyAvailable}
                onCheckedChange={checked => {
                  const next = checked === true;
                  setFilters(prev => ({
                    ...prev,
                    onlyAvailable: next,
                  }));
                  handleSearch();
                }}
              />
              <Label
                htmlFor="only-available-header"
                className="text-sm font-normal cursor-pointer select-none"
              >
                {t('sidebar.onlyAvailable')}
              </Label>

              {/* 活動拠点で絞る */}
              <div className="flex items-center gap-2 md:ml-4 md:border-l md:pl-4 border-gray-200 dark:border-gray-700">
                <Checkbox
                  id="activity-location-header"
                  checked={filterByActivityLocation}
                  disabled={profileLoading}
                  onCheckedChange={checked => {
                    const isChecked = checked === true;
                    logger.info('活動拠点フィルター変更:', {
                      isChecked,
                      profilePrefecture: profile?.prefecture,
                      profileLoading,
                    });

                    if (isChecked) {
                      if (!profile?.prefecture) {
                        toast.error(
                          'プロフィール設定で活動拠点（都道府県）を設定してください'
                        );
                        logger.warn('活動拠点フィルターエラー: 都道府県未設定');
                        return;
                      }

                      setFilterByActivityLocation(true);
                      setFilters(prev => ({
                        ...prev,
                        location: profile.prefecture || '',
                      }));
                      handleSearch();
                    } else {
                      setFilterByActivityLocation(false);
                      setFilters(prev => ({
                        ...prev,
                        location: '',
                      }));
                      handleSearch();
                    }
                  }}
                />
                <Label
                  htmlFor="activity-location-header"
                  className={`text-sm font-normal cursor-pointer select-none flex items-center gap-1 ${profileLoading ? 'opacity-50' : ''}`}
                >
                  <span>活動拠点で絞る</span>
                  {filterByActivityLocation && profile?.prefecture && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({profile.prefecture})
                    </span>
                  )}
                  {profileLoading && (
                    <Loader2 className="h-3 w-3 animate-spin ml-1" />
                  )}
                </Label>
              </div>
            </div>

            {/* 右側: 並び順と作成ボタン */}
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
              {/* 並び順 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  並び順:
                </span>
                <Select
                  value={`${sortBy}_${sortOrder}`}
                  onValueChange={value => {
                    const [newSortBy, newSortOrder] = value.split('_') as [
                      (
                        | 'start_time'
                        | 'price'
                        | 'created_at'
                        | 'popularity'
                        | 'end_time'
                      ),
                      'asc' | 'desc',
                    ];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                >
                  <SelectTrigger className="w-[180px] sm:w-[200px]">
                    <SelectValue placeholder="並び順" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start_time_asc">
                      開催日時順（早い順）
                    </SelectItem>
                    <SelectItem value="start_time_desc">
                      開催日時順（遅い順）
                    </SelectItem>
                    <SelectItem value="end_time_asc">
                      終了日時順（早い順）
                    </SelectItem>
                    <SelectItem value="end_time_desc">
                      終了日時順（遅い順）
                    </SelectItem>
                    <SelectItem value="price_asc">価格順（安い順）</SelectItem>
                    <SelectItem value="price_desc">価格順（高い順）</SelectItem>
                    <SelectItem value="popularity_desc">
                      人気順（高い順）
                    </SelectItem>
                    <SelectItem value="popularity_asc">
                      人気順（低い順）
                    </SelectItem>
                    <SelectItem value="created_at_desc">
                      新着順（新しい順）
                    </SelectItem>
                    <SelectItem value="created_at_asc">
                      新着順（古い順）
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 撮影会を作成ボタン */}
              <Button asChild size="sm" variant="cta">
                <Link
                  href={
                    profile?.user_type === 'organizer'
                      ? '/photo-sessions/create/organizer'
                      : '/photo-sessions/create'
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  撮影会を作成
                </Link>
              </Button>
            </div>
          </div>
        </StickyHeader>

        {/* メインコンテンツ */}
        <div className="flex-1 min-h-0">
          {/* 
            [サイドバー型フィルターの一時廃止]
            スマホ以外の画面幅でも常にコンパクトフィルターを表示するため、
            以下のサイドバーコンポーネントの表示を一時的に無効化しています。
            コンポーネント自体は削除せず、将来的な復活に備えてコメントアウトしています。
          */}
          {/*
          <aside className="hidden xl:block w-[320px] flex-shrink-0 mr-6">
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
          */}

          {/* モバイル・タブレットサイドバー（XL画面未満でのオーバーレイ） - 一時無効化 */}
          {/*
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
          */}

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
                onFiltersChange={setFilters}
                layout={layout}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={(newSortBy, newSortOrder) => {
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
