'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudioSearchFilters } from '@/types/database';
import { PREFECTURE_KEYS } from '@/constants/japan';

interface StudioFilterContentProps {
  filters: StudioSearchFilters;
  onFiltersChange: (filters: StudioSearchFilters) => void;
}

/**
 * スタジオ検索用フィルターコンテンツコンポーネント
 * モバイル用ボトムシート内で使用するフィルター項目を表示する
 */
export function StudioFilterContent({
  filters,
  onFiltersChange,
}: StudioFilterContentProps) {
  const t = useTranslations('studio.page');
  const tPrefecture = useTranslations('prefecture');

  const handleQueryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      query: value,
    });
  };

  const handlePrefectureChange = (value: string) => {
    onFiltersChange({
      ...filters,
      prefecture: value === 'all' ? '' : value,
    });
  };

  return (
    <div className="space-y-6">
      {/* キーワード検索 */}
      <div>
        <label className="text-sm font-medium text-theme-text-primary mb-2 block">
          {t('keyword')}
        </label>
        <Input
          data-testid="studio-search-input"
          placeholder={t('keywordPlaceholder')}
          value={filters.query || ''}
          onChange={e => handleQueryChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* 都道府県選択 */}
      <div>
        <label className="text-sm font-medium text-theme-text-primary mb-2 block">
          {t('prefecture')}
        </label>
        <Select
          value={filters.prefecture || 'all'}
          onValueChange={handlePrefectureChange}
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
    </div>
  );
}
