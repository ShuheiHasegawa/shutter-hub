'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  normalizeSearchKeyword,
  normalizeLocation,
} from '@/lib/utils/input-normalizer';
import { logger } from '@/lib/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  // Users, // 参加者数フィルターで使用（一旦非表示）
  DollarSign,
  Clock,
  Shuffle,
  UserCheck,
  Star,
  Filter,
  Search,
  X,
} from 'lucide-react';
import type { BookingType } from '@/types/database';
import { LeftLineSection } from '@/components/ui/left-line-section';

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

  // ref定義（テキスト入力フィールド用）
  const keywordRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const priceMinRef = useRef<HTMLInputElement>(null);
  const priceMaxRef = useRef<HTMLInputElement>(null);
  const dateFromRef = useRef<HTMLInputElement>(null);
  const dateToRef = useRef<HTMLInputElement>(null);
  const participantsMinRef = useRef<HTMLInputElement>(null);
  const participantsMaxRef = useRef<HTMLInputElement>(null);

  // チェックボックスはstateで管理（即時反映が必要）
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>(
    filters.bookingTypes || []
  );
  const [onlyAvailable, setOnlyAvailable] = useState(
    filters.onlyAvailable || false
  );

  // 検索実行時にrefから値を取得して親に通知
  const handleSearch = () => {
    const newFilters: FilterState = {
      keyword: keywordRef.current?.value || '',
      location: locationRef.current?.value || '',
      priceMin: priceMinRef.current?.value || '',
      priceMax: priceMaxRef.current?.value || '',
      dateFrom: dateFromRef.current?.value || '',
      dateTo: dateToRef.current?.value || '',
      participantsMin: participantsMinRef.current?.value || '',
      participantsMax: participantsMaxRef.current?.value || '',
      bookingTypes,
      onlyAvailable,
    };

    // 正規化処理
    newFilters.keyword = normalizeSearchKeyword(newFilters.keyword);
    newFilters.location = normalizeLocation(newFilters.location);

    logger.info('[PhotoSessionsSidebar] 検索実行', { newFilters });

    onFiltersChange(newFilters);
    onSearch?.();
  };

  // クリア処理
  const handleClearFilters = () => {
    // refの値をクリア
    if (keywordRef.current) keywordRef.current.value = '';
    if (locationRef.current) locationRef.current.value = '';
    if (priceMinRef.current) priceMinRef.current.value = '';
    if (priceMaxRef.current) priceMaxRef.current.value = '';
    if (dateFromRef.current) dateFromRef.current.value = '';
    if (dateToRef.current) dateToRef.current.value = '';
    if (participantsMinRef.current) participantsMinRef.current.value = '';
    if (participantsMaxRef.current) participantsMaxRef.current.value = '';

    // チェックボックスのstateもクリア
    setBookingTypes([]);
    setOnlyAvailable(false);

    // 空のフィルター状態で親に通知
    const emptyFilters: FilterState = {
      keyword: '',
      location: '',
      priceMin: '',
      priceMax: '',
      dateFrom: '',
      dateTo: '',
      participantsMin: '',
      participantsMax: '',
      bookingTypes: [],
      onlyAvailable: false,
    };

    logger.info('[PhotoSessionsSidebar] フィルタークリア', { emptyFilters });

    // 親のフィルター状態も更新
    onFiltersChange(emptyFilters);
    onClearFilters();

    // クリア後、空のフィルターで検索を実行
    if (onSearch) {
      onSearch();
    }
  };

  const toggleBookingType = (bookingType: BookingType) => {
    const newTypes = bookingTypes.includes(bookingType)
      ? bookingTypes.filter(type => type !== bookingType)
      : [...bookingTypes, bookingType];
    setBookingTypes(newTypes);
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
          </div>
        </CardHeader>

        <CardContent>
          {/* キーワード検索 */}
          <LeftLineSection>
            <Label className="text-base font-semibold mb-3 block">
              {tCommon('search')}
            </Label>
            <Input
              ref={keywordRef}
              placeholder={t('list.keywordPlaceholder')}
              defaultValue={filters.keyword}
            />
          </LeftLineSection>

          {/* 場所フィルター */}
          <LeftLineSection>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('form.locationLabel')}
            </Label>
            <Input
              ref={locationRef}
              placeholder={t('list.locationPlaceholder')}
              defaultValue={filters.location}
            />
          </LeftLineSection>

          {/* 日時フィルター */}
          <LeftLineSection>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('sidebar.dateRange')}
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{t('sidebar.dateFrom')}</Label>
                <Input
                  ref={dateFromRef}
                  type="date"
                  defaultValue={filters.dateFrom}
                />
              </div>
              <div>
                <Label className="text-sm">{t('sidebar.dateTo')}</Label>
                <Input
                  ref={dateToRef}
                  type="date"
                  defaultValue={filters.dateTo}
                />
              </div>
            </div>
          </LeftLineSection>

          {/* 料金フィルター */}
          <LeftLineSection>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('sidebar.priceRange')}
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{t('sidebar.priceMin')}</Label>
                <Input
                  ref={priceMinRef}
                  type="number"
                  min="0"
                  placeholder="0"
                  defaultValue={filters.priceMin}
                />
              </div>
              <div>
                <Label className="text-sm">{t('sidebar.priceMax')}</Label>
                <Input
                  ref={priceMaxRef}
                  type="number"
                  min="0"
                  placeholder="10000"
                  defaultValue={filters.priceMax}
                />
              </div>
            </div>
          </LeftLineSection>

          {/* 参加者数フィルター - 一旦非表示 */}
          {/* <LeftLineSection>
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
                  ref={participantsMinRef}
                  type="number"
                  min="1"
                  placeholder="1"
                  defaultValue={filters.participantsMin}
                />
              </div>
              <div>
                <Label className="text-sm">
                  {t('sidebar.participantsMax')}
                </Label>
                <Input
                  ref={participantsMaxRef}
                  type="number"
                  min="1"
                  placeholder="50"
                  defaultValue={filters.participantsMax}
                />
              </div>
            </div>
          </LeftLineSection> */}

          {/* 予約方式フィルター */}
          <LeftLineSection>
            <Label className="text-base font-semibold mb-3 block">
              {t('bookingType.title')}
            </Label>
            <div className="space-y-3">
              {bookingTypeOptions.map(option => {
                const Icon = option.icon;
                const isChecked = bookingTypes.includes(option.value);

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
          </LeftLineSection>

          {/* 検索実行ボタン */}
          {onSearch && (
            <div className="pt-4 border-t">
              <Button
                onClick={handleSearch}
                disabled={isSearchLoading}
                className="w-full"
                variant="action"
              >
                {isSearchLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    検索中...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    検索
                  </>
                )}
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="w-full mt-2"
          >
            <X className="h-4 w-4 mr-2" />
            {t('list.clearFilters')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
