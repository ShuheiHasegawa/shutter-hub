'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { StudiosList } from '@/components/studio/StudiosList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudioSearchFilters } from '@/types/database';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { STUDIO_SORT_OPTIONS, DEFAULT_STUDIO_SEARCH } from '@/constants/studio';
import { PREFECTURE_KEYS } from '@/constants/japan';
import Link from 'next/link';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { StickyHeader } from '@/components/ui/sticky-header';
import { BuildingIcon, MapPin } from 'lucide-react';
import { MobileFloatButtons } from '@/components/ui/mobile-float-buttons';
import { StudioFilterContent } from '@/components/studio/StudioFilterContent';
import { LayoutToggle } from '@/components/ui/layout-toggle';
import { useLayoutPreference } from '@/hooks/useLayoutPreference';
import { Toggle } from '@/components/ui/toggle';
import { useUserProfile } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

export default function StudiosPage() {
  const t = useTranslations('studio.page');
  const tLayout = useTranslations('studio.layout');
  const tPrefecture = useTranslations('prefecture');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const { layout, updateLayout } = useLayoutPreference('studio-layout');
  const { profile, loading: profileLoading } = useUserProfile();
  const [filters, setFilters] = useState<StudioSearchFilters>({
    query: searchParams.get('q') || '',
    prefecture: searchParams.get('prefecture') || '',
    sort_by: DEFAULT_STUDIO_SEARCH.sort_by,
    sort_order: DEFAULT_STUDIO_SEARCH.sort_order,
  });
  const [triggerSearch, setTriggerSearch] = useState(false);
  const [filterByActivityLocation, setFilterByActivityLocation] =
    useState(false);

  // ソートオプションを翻訳キーから動的に生成
  const sortOptions = useMemo(() => {
    const valueToKeyMap: Record<string, string> = {
      created_at_desc: 'createdAtDesc',
      created_at_asc: 'createdAtAsc',
      name_asc: 'nameAsc',
      name_desc: 'nameDesc',
      rating_desc: 'ratingDesc',
      rating_asc: 'ratingAsc',
      price_asc: 'priceAsc',
      price_desc: 'priceDesc',
    };
    return STUDIO_SORT_OPTIONS.map(option => ({
      ...option,
      label: t(`sort.${valueToKeyMap[option.value]}` as string),
    }));
  }, [t]);

  // 初期表示時に自動で検索を実行
  useEffect(() => {
    setTriggerSearch(true);
  }, []);

  // 活動拠点フィルター変更時の処理
  useEffect(() => {
    // filterByActivityLocationがtrueでprofile?.prefectureがnullの場合はリセット
    if (filterByActivityLocation && !profile?.prefecture) {
      setFilterByActivityLocation(false);
      return;
    }

    // filterByActivityLocationが変更された時に検索を実行
    if (filterByActivityLocation && profile?.prefecture) {
      // フィルターがONになった場合、prefectureを更新して検索
      setFilters(prev => ({
        ...prev,
        prefecture: profile.prefecture || '',
      }));
      handleSearch();
    } else if (!filterByActivityLocation) {
      // フィルターがOFFになった場合、prefectureをクリアして検索
      setFilters(prev => ({
        ...prev,
        prefecture: '',
      }));
      handleSearch();
    }
  }, [filterByActivityLocation, profile?.prefecture]);

  const handleSearchChange = (
    field: keyof StudioSearchFilters,
    value: string | number | boolean
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
    // 検索を未実行状態に戻す（フィルター変更時）
    setTriggerSearch(false);
  };

  const handleSearch = () => {
    setTriggerSearch(true);
  };

  const handleReset = () => {
    setFilters({
      query: '',
      prefecture: '',
      sort_by: DEFAULT_STUDIO_SEARCH.sort_by,
      sort_order: DEFAULT_STUDIO_SEARCH.sort_order,
    });
    setTriggerSearch(false);
  };

  return (
    <AuthenticatedLayout>
      <PageTitleHeader
        title={t('title')}
        icon={<BuildingIcon className="h-6 w-6" />}
        actions={
          <Link href="/studios/create">
            <Button
              data-testid="studio-create-button"
              className="flex items-center gap-2 whitespace-nowrap"
              variant="cta"
              title={t('addNew')}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden md:inline ml-1">{t('addNew')}</span>
              <span className="sr-only md:hidden">{t('addNew')}</span>
            </Button>
          </Link>
        }
      />
      <div className="flex flex-col flex-1 min-h-0">
        {/* 検索・フィルター（StickyHeaderで固定） */}
        <StickyHeader>
          {/* 1行目: 検索フィルター（デスクトップのみ表示） */}
          <div className="hidden md:block">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* キーワード検索 */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-theme-text-primary">
                  {t('keyword')}
                </label>
                <Input
                  data-testid="studio-search-input"
                  placeholder={t('keywordPlaceholder')}
                  value={filters.query || ''}
                  onChange={e => handleSearchChange('query', e.target.value)}
                />
              </div>

              {/* 都道府県 */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-theme-text-primary">
                  {t('prefecture')}
                </label>
                <Select
                  value={filters.prefecture || 'all'}
                  onValueChange={value =>
                    handleSearchChange(
                      'prefecture',
                      value === 'all' ? '' : value
                    )
                  }
                >
                  <SelectTrigger data-testid="studio-prefecture-select">
                    <SelectValue placeholder={t('prefecturePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')}</SelectItem>
                    {PREFECTURE_KEYS.map(key => (
                      <SelectItem key={key} value={key}>
                        {tPrefecture(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 検索・クリアボタン */}
              <div className="md:col-span-2 flex items-end space-x-2">
                <Button
                  data-testid="studio-reset-button"
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  {t('clear')}
                </Button>
                <Button
                  data-testid="studio-search-button"
                  onClick={handleSearch}
                  className="flex-1"
                  variant="accent"
                >
                  <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                  {t('search')}
                </Button>
              </div>
            </div>
          </div>

          {/* 2行目: 活動拠点フィルター、並び順、レイアウト切り替え */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
            {/* 左側: 活動拠点で絞るToggleボタン */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 活動拠点で絞る（プロフィールに都道府県が設定されている場合のみ表示） */}
              {!profileLoading && profile?.prefecture && (
                <Toggle
                  pressed={filterByActivityLocation}
                  onPressedChange={pressed => {
                    logger.info('活動拠点フィルター変更:', {
                      isChecked: pressed,
                      profilePrefecture: profile?.prefecture,
                    });

                    setFilterByActivityLocation(pressed);
                  }}
                  aria-label={tCommon('filterByLocation', {
                    prefecture: tPrefecture(profile.prefecture),
                  })}
                >
                  <MapPin className="h-4 w-4" />
                  {tCommon('filterByLocation', {
                    prefecture: tPrefecture(profile.prefecture),
                  })}
                </Toggle>
              )}
            </div>

            {/* 右側: 並び順とレイアウト切り替え */}
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap ml-auto">
              {/* 並び順 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  並び順:
                </span>
                <Select
                  value={`${filters.sort_by}_${filters.sort_order}`}
                  onValueChange={value => {
                    const [sort_by, sort_order] = value.split('_');
                    setFilters(prev => ({
                      ...prev,
                      sort_by: sort_by as
                        | 'name'
                        | 'rating'
                        | 'price'
                        | 'distance'
                        | 'created_at',
                      sort_order: sort_order as 'asc' | 'desc',
                    }));
                  }}
                >
                  <SelectTrigger
                    className="w-[180px] sm:w-[200px]"
                    data-testid="studio-sort-select"
                  >
                    <SelectValue placeholder="並び順" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* レイアウト切り替えボタン */}
              <LayoutToggle
                currentLayout={layout}
                onLayoutChange={updateLayout}
                labels={{
                  card: tLayout('card'),
                  grid: tLayout('grid'),
                  table: tLayout('table'),
                  toggle: tLayout('toggle'),
                }}
              />
            </div>
          </div>
        </StickyHeader>

        {/* スタジオ一覧 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="pb-16 md:pb-16">
            <StudiosList
              filters={filters}
              triggerSearch={triggerSearch}
              layout={layout}
            />
          </div>
        </div>

        {/* モバイル用フィルターシート */}
        <div className="md:hidden">
          <MobileFloatButtons
            filterTitle={t('mobileFilter.title')}
            filterFloatButtonLabel={t('mobileFilter.floatButton')}
            onFilterReset={handleReset}
            onFilterApply={handleSearch}
            scrollToTopLabel={tCommon('scrollToTop')}
            filterChildren={
              <StudioFilterContent
                filters={filters}
                onFiltersChange={setFilters}
              />
            }
          />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
