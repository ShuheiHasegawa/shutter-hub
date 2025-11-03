'use client';

import { useState, useRef } from 'react';
import {
  normalizeSearchKeyword,
  normalizeLocation,
} from '@/lib/utils/input-normalizer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Search,
  X,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  ChevronDown,
  Clock,
  Shuffle,
  UserCheck,
  Star,
  SlidersHorizontal,
  LucideIcon,
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

interface CompactFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  onSearch?: () => void;
  isSearchLoading?: boolean;
  className?: string;
}

export function CompactFilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
  onSearch,
  isSearchLoading = false,
  className = '',
}: CompactFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const removeFilter = (key: string, value?: string) => {
    if (key === 'bookingTypes' && value) {
      toggleBookingType(value as BookingType);
      // 検索を実行して変更を反映
      setTimeout(() => handleSearch(), 0);
    } else if (key === 'onlyAvailable') {
      setOnlyAvailable(false);
      // 検索を実行して変更を反映
      setTimeout(() => handleSearch(), 0);
    } else if (key === 'dateRange') {
      if (dateFromRef.current) dateFromRef.current.value = '';
      if (dateToRef.current) dateToRef.current.value = '';
      setTimeout(() => handleSearch(), 0);
    } else if (key === 'priceRange') {
      if (priceMinRef.current) priceMinRef.current.value = '';
      if (priceMaxRef.current) priceMaxRef.current.value = '';
      setTimeout(() => handleSearch(), 0);
    } else if (key === 'participantsRange') {
      if (participantsMinRef.current) participantsMinRef.current.value = '';
      if (participantsMaxRef.current) participantsMaxRef.current.value = '';
      setTimeout(() => handleSearch(), 0);
    } else {
      // キーワードや場所など
      if (key === 'keyword' && keywordRef.current) {
        keywordRef.current.value = '';
      } else if (key === 'location' && locationRef.current) {
        locationRef.current.value = '';
      }
      setTimeout(() => handleSearch(), 0);
    }
  };

  const bookingTypeLabels = {
    first_come: { label: '先着順', icon: Clock, shortLabel: '先着' },
    lottery: { label: '抽選', icon: Shuffle, shortLabel: '抽選' },
    admin_lottery: { label: '管理者抽選', icon: UserCheck, shortLabel: '管理' },
    priority: { label: '優先予約', icon: Star, shortLabel: '優先' },
  };

  const getActiveFilterBadges = () => {
    const badges: Array<{
      key: string;
      value?: string;
      label: string;
      fullLabel: string;
      icon: LucideIcon;
      color: string;
    }> = [];

    if (filters.keyword) {
      badges.push({
        key: 'keyword',
        label:
          filters.keyword.length > 8
            ? `${filters.keyword.slice(0, 8)}...`
            : filters.keyword,
        fullLabel: `検索: ${filters.keyword}`,
        icon: Search,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
      });
    }

    if (filters.location) {
      badges.push({
        key: 'location',
        label:
          filters.location.length > 6
            ? `${filters.location.slice(0, 6)}...`
            : filters.location,
        fullLabel: `場所: ${filters.location}`,
        icon: MapPin,
        color: 'bg-green-100 text-green-800 border-green-200',
      });
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateRange =
        filters.dateFrom && filters.dateTo
          ? `${filters.dateFrom.slice(5)} ～ ${filters.dateTo.slice(5)}`
          : filters.dateFrom
            ? `${filters.dateFrom.slice(5)}以降`
            : `${filters.dateTo.slice(5)}まで`;
      badges.push({
        key: 'dateRange',
        label: dateRange,
        fullLabel: `日程: ${dateRange}`,
        icon: Calendar,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
      });
    }

    if (filters.priceMin || filters.priceMax) {
      const priceRange =
        filters.priceMin && filters.priceMax
          ? `¥${Math.floor(parseInt(filters.priceMin) / 1000)}k-${Math.floor(parseInt(filters.priceMax) / 1000)}k`
          : filters.priceMin
            ? `¥${Math.floor(parseInt(filters.priceMin) / 1000)}k+`
            : `¥${Math.floor(parseInt(filters.priceMax) / 1000)}k以下`;
      badges.push({
        key: 'priceRange',
        label: priceRange,
        fullLabel: `料金: ${priceRange}`,
        icon: DollarSign,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
      });
    }

    if (filters.participantsMin || filters.participantsMax) {
      const participantsRange =
        filters.participantsMin && filters.participantsMax
          ? `${filters.participantsMin}-${filters.participantsMax}人`
          : filters.participantsMin
            ? `${filters.participantsMin}人+`
            : `${filters.participantsMax}人以下`;
      badges.push({
        key: 'participantsRange',
        label: participantsRange,
        fullLabel: `参加者: ${participantsRange}`,
        icon: Users,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      });
    }

    filters.bookingTypes.forEach(type => {
      const typeInfo = bookingTypeLabels[type];
      if (typeInfo) {
        badges.push({
          key: 'bookingTypes',
          value: type,
          label: typeInfo.shortLabel,
          fullLabel: typeInfo.label,
          icon: typeInfo.icon,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        });
      }
    });

    if (filters.onlyAvailable) {
      badges.push({
        key: 'onlyAvailable',
        label: '空きあり',
        fullLabel: '空きありのみ',
        icon: Users,
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      });
    }

    return badges;
  };

  const activeFilters = getActiveFilterBadges();
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* メインフィルターバー - モバイル最適化 */}
      <Card className="border-b transition-all duration-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          {/* モバイル用コンパクトレイアウト */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 検索入力 - フル幅活用 */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              <Input
                ref={keywordRef}
                placeholder="撮影会を検索..."
                defaultValue={filters.keyword}
                className="pl-8 sm:pl-10 text-sm sm:text-base border-0 shadow-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* フィルター展開ボタン - スマート配置 */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 sm:gap-2 relative flex-shrink-0 px-2.5 sm:px-3 h-9 sm:h-10 text-xs sm:text-sm border-b"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">フィルター</span>
                  <ChevronDown
                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                  {hasActiveFilters && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 text-xs bg-red-500 text-white border-0 rounded-full flex items-center justify-center">
                      {activeFilters.length > 9 ? '9+' : activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            {/* クリアボタン - 条件付き表示 */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="flex-shrink-0 px-2 sm:px-2.5 h-9 sm:h-10 text-xs sm:text-sm text-gray-500"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">クリア</span>
              </Button>
            )}
          </div>

          {/* 空きがある撮影会のみ表示チェックボックス */}
          <div className="mt-3 pt-3 border-t border-gray-400">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="only-available-compact"
                checked={onlyAvailable}
                onCheckedChange={checked => {
                  setOnlyAvailable(checked === true);
                  // 空きがある撮影会のみ表示は例外で即座に検索実行
                  setTimeout(() => handleSearch(), 0);
                }}
                className="w-4 h-4"
              />
              <Label
                htmlFor="only-available-compact"
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <Users className="h-4 w-4 text-emerald-600" />
                空きがある撮影会のみ表示
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクティブフィルターバッジ - 横スクロール対応 */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-xs sm:text-sm text-gray-600 font-medium py-1 flex-shrink-0">
            適用中:
          </span>
          <div className="flex gap-1.5 sm:gap-2 min-w-max">
            {activeFilters.map((filter, index) => {
              const Icon = filter.icon;
              return (
                <Badge
                  key={`${filter.key}-${filter.value || index}`}
                  variant="secondary"
                  className={`${filter.color} gap-1 pr-1 transition-all duration-200 text-xs sm:text-sm flex-shrink-0 cursor-default`}
                  title={filter.fullLabel}
                >
                  <Icon className="h-3 w-3" />
                  <span className="truncate max-w-[80px] sm:max-w-none">
                    {filter.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilter(filter.key, filter.value)}
                    className="h-3.5 w-3.5 p-0 ml-0.5 rounded-full flex-shrink-0"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* 詳細フィルター展開エリア - 完全モバイル対応 */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="space-y-0">
          <Card className="border-blue-200 mt-3">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {/* 場所フィルター */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    場所
                  </Label>
                  <Input
                    ref={locationRef}
                    placeholder="渋谷、新宿..."
                    defaultValue={filters.location}
                    className="text-sm"
                  />
                </div>

                {/* 日程フィルター */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    開始日
                  </Label>
                  <Input
                    ref={dateFromRef}
                    type="date"
                    defaultValue={filters.dateFrom}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    終了日
                  </Label>
                  <Input
                    ref={dateToRef}
                    type="date"
                    defaultValue={filters.dateTo}
                    className="text-sm"
                  />
                </div>

                {/* 料金フィルター */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    最低料金
                  </Label>
                  <Input
                    ref={priceMinRef}
                    type="number"
                    placeholder="0"
                    defaultValue={filters.priceMin}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    最高料金
                  </Label>
                  <Input
                    ref={priceMaxRef}
                    type="number"
                    placeholder="10000"
                    defaultValue={filters.priceMax}
                    className="text-sm"
                  />
                </div>

                {/* 参加者数フィルター */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    最少参加者
                  </Label>
                  <Input
                    ref={participantsMinRef}
                    type="number"
                    placeholder="1"
                    defaultValue={filters.participantsMin}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    最多参加者
                  </Label>
                  <Input
                    ref={participantsMaxRef}
                    type="number"
                    placeholder="50"
                    defaultValue={filters.participantsMax}
                    className="text-sm"
                  />
                </div>

                {/* 予約方式フィルター - モバイル最適化 */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-600" />
                    予約方式
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                    {Object.entries(bookingTypeLabels).map(
                      ([key, typeInfo]) => {
                        const Icon = typeInfo.icon;
                        const isChecked = bookingTypes.includes(
                          key as BookingType
                        );
                        return (
                          <div
                            key={key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={key}
                              checked={isChecked}
                              onCheckedChange={() =>
                                toggleBookingType(key as BookingType)
                              }
                              className="w-4 h-4"
                            />
                            <Label
                              htmlFor={key}
                              className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0"
                            >
                              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{typeInfo.label}</span>
                            </Label>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              {/* 検索実行ボタン */}
              <div className="mt-4 sm:mt-6 pt-4 border-t border-blue-200">
                <div className="flex justify-center">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearchLoading}
                    className="w-full sm:w-auto"
                    size="sm"
                    variant="navigation"
                  >
                    {isSearchLoading ? (
                      <>
                        <div className="animate-spin-slow rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 475px) {
          .xs\\:inline {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}
