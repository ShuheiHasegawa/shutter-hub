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
import { BuildingIcon } from 'lucide-react';

export default function StudiosPage() {
  const t = useTranslations('studio.page');
  const tPrefecture = useTranslations('prefecture');
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<StudioSearchFilters>({
    query: searchParams.get('q') || '',
    prefecture: searchParams.get('prefecture') || '',
    sort_by: DEFAULT_STUDIO_SEARCH.sort_by,
    sort_order: DEFAULT_STUDIO_SEARCH.sort_order,
  });
  const [triggerSearch, setTriggerSearch] = useState(false);

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
              className="flex items-center gap-2 whitespace-nowrap"
              variant="cta"
            >
              <PlusIcon className="w-4 h-4" />
              {t('addNew')}
            </Button>
          </Link>
        }
      />
      <div className="flex flex-col flex-1 min-h-0">
        {/* 検索・フィルター（StickyHeaderで固定） */}
        <StickyHeader className="px-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* キーワード検索 */}
            <div>
              <label className="text-sm font-medium text-theme-text-primary">
                {t('keyword')}
              </label>
              <Input
                placeholder={t('keywordPlaceholder')}
                value={filters.query || ''}
                onChange={e => handleSearchChange('query', e.target.value)}
              />
            </div>

            {/* 都道府県 */}
            <div>
              <label className="text-sm font-medium text-theme-text-primary">
                {t('prefecture')}
              </label>
              <Select
                value={filters.prefecture || 'all'}
                onValueChange={value =>
                  handleSearchChange('prefecture', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger>
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

            {/* ソート */}
            <div>
              <label className="text-sm font-medium text-theme-text-primary">
                {t('sortBy')}
              </label>
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
                <SelectTrigger>
                  <SelectValue />
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

            {/* 検索・リセットボタン */}
            <div className="flex items-end space-x-2">
              <Button
                onClick={handleSearch}
                className="flex-1"
                variant="accent"
              >
                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                {t('search')}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                {t('reset')}
              </Button>
            </div>
          </div>
        </StickyHeader>

        {/* スタジオ一覧 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 pb-16 md:pb-16">
            <StudiosList filters={filters} triggerSearch={triggerSearch} />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
