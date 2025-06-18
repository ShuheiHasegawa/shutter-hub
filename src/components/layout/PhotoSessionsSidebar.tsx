'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Shuffle,
  UserCheck,
  Star,
  Filter,
  X,
} from 'lucide-react';
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

interface PhotoSessionsSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  onSearch?: () => void;
  isSearchLoading?: boolean;
  className?: string;
}

export function PhotoSessionsSidebar({
  filters,
  onFiltersChange,
  onClearFilters,
  onSearch,
  isSearchLoading = false,
  className = '',
}: PhotoSessionsSidebarProps) {
  const t = useTranslations('photoSessions');
  const tCommon = useTranslations('common');

  const updateFilter = (key: keyof FilterState, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleBookingType = (bookingType: BookingType) => {
    const newTypes = filters.bookingTypes.includes(bookingType)
      ? filters.bookingTypes.filter(type => type !== bookingType)
      : [...filters.bookingTypes, bookingType];

    updateFilter('bookingTypes', newTypes);
  };

  const bookingTypeOptions = [
    {
      value: 'first_come' as BookingType,
      label: t('bookingType.firstCome.title'),
      icon: Clock,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      value: 'lottery' as BookingType,
      label: t('bookingType.lottery.title'),
      icon: Shuffle,
      color: 'bg-green-100 text-green-800',
    },
    {
      value: 'admin_lottery' as BookingType,
      label: t('bookingType.adminLottery.title'),
      icon: UserCheck,
      color: 'bg-purple-100 text-purple-800',
    },
    {
      value: 'priority' as BookingType,
      label: t('bookingType.priority.title'),
      icon: Star,
      color: 'bg-yellow-100 text-yellow-800',
    },
  ];

  const hasActiveFilters =
    filters.keyword ||
    filters.location ||
    filters.priceMin ||
    filters.priceMax ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.bookingTypes.length > 0 ||
    filters.participantsMin ||
    filters.participantsMax ||
    filters.onlyAvailable;

  return (
    <div className={`${className}`}>
      {/* フィルター */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">{tCommon('filter')}</CardTitle>
            </div>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {t('list.activeFilters')}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              {t('list.clearFilters')}
            </Button>
          )}

          {/* キーワード検索 */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              {tCommon('search')}
            </Label>
            <Input
              placeholder={t('list.keywordPlaceholder')}
              value={filters.keyword}
              onChange={e => updateFilter('keyword', e.target.value)}
            />
          </div>

          {/* 場所フィルター */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('form.locationLabel')}
            </Label>
            <Input
              placeholder={t('list.locationPlaceholder')}
              value={filters.location}
              onChange={e => updateFilter('location', e.target.value)}
            />
          </div>

          {/* 日時フィルター */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('sidebar.dateRange')}
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{t('sidebar.dateFrom')}</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => updateFilter('dateFrom', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">{t('sidebar.dateTo')}</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => updateFilter('dateTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 料金フィルター */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('sidebar.priceRange')}
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{t('sidebar.priceMin')}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={e => updateFilter('priceMin', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">{t('sidebar.priceMax')}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="10000"
                  value={filters.priceMax}
                  onChange={e => updateFilter('priceMax', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 参加者数フィルター */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('sidebar.participantsRange')}
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">
                  {t('sidebar.participantsMin')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={filters.participantsMin}
                  onChange={e =>
                    updateFilter('participantsMin', e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-sm">
                  {t('sidebar.participantsMax')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="50"
                  value={filters.participantsMax}
                  onChange={e =>
                    updateFilter('participantsMax', e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* 予約方式フィルター */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              {t('bookingType.title')}
            </Label>
            <div className="space-y-3">
              {bookingTypeOptions.map(option => {
                const Icon = option.icon;
                const isChecked = filters.bookingTypes.includes(option.value);

                return (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={option.value}
                      checked={isChecked}
                      onCheckedChange={() => toggleBookingType(option.value)}
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                      {isChecked && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${option.color}`}
                        >
                          ✓
                        </Badge>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* その他のオプション */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              {t('sidebar.options')}
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="only-available"
                checked={filters.onlyAvailable}
                onCheckedChange={checked =>
                  updateFilter('onlyAvailable', checked)
                }
              />
              <Label
                htmlFor="only-available"
                className="text-sm font-normal cursor-pointer"
              >
                {t('sidebar.onlyAvailable')}
              </Label>
            </div>
          </div>

          {/* 検索実行ボタン */}
          {onSearch && (
            <div className="pt-4 border-t">
              <Button
                onClick={onSearch}
                disabled={isSearchLoading}
                className="w-full"
                size="lg"
              >
                {isSearchLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    検索中...
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4 mr-2" />
                    検索
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
