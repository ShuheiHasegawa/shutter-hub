'use client';

import { useState } from 'react';
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
  className?: string;
}

export function CompactFilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
  className = '',
}: CompactFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const removeFilter = (key: string, value?: string) => {
    if (key === 'bookingTypes' && value) {
      toggleBookingType(value as BookingType);
    } else if (key === 'onlyAvailable') {
      updateFilter('onlyAvailable', false);
    } else if (key === 'dateRange') {
      updateFilter('dateFrom', '');
      updateFilter('dateTo', '');
    } else if (key === 'priceRange') {
      updateFilter('priceMin', '');
      updateFilter('priceMax', '');
    } else if (key === 'participantsRange') {
      updateFilter('participantsMin', '');
      updateFilter('participantsMax', '');
    } else {
      updateFilter(key as keyof FilterState, '');
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
      <Card className="border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          {/* モバイル用コンパクトレイアウト */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 検索入力 - フル幅活用 */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              <Input
                placeholder="撮影会を検索..."
                value={filters.keyword}
                onChange={e => updateFilter('keyword', e.target.value)}
                className="pl-8 sm:pl-10 text-sm sm:text-base border-0 shadow-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              />
            </div>

            {/* フィルター展開ボタン - スマート配置 */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 sm:gap-2 relative flex-shrink-0 px-2.5 sm:px-3 h-9 sm:h-10 text-xs sm:text-sm border-gray-300 hover:border-blue-400 hover:bg-blue-50"
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
                onClick={onClearFilters}
                className="flex-shrink-0 px-2 sm:px-2.5 h-9 sm:h-10 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">クリア</span>
              </Button>
            )}
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
                  className={`${filter.color} gap-1 pr-1 hover:shadow-md transition-all duration-200 text-xs sm:text-sm flex-shrink-0 cursor-default`}
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
                    className="h-3.5 w-3.5 p-0 ml-0.5 hover:bg-black/10 rounded-full flex-shrink-0"
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
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 mt-3">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {/* 場所フィルター */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    場所
                  </Label>
                  <Input
                    placeholder="渋谷、新宿..."
                    value={filters.location}
                    onChange={e => updateFilter('location', e.target.value)}
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
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => updateFilter('dateFrom', e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    終了日
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={e => updateFilter('dateTo', e.target.value)}
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
                    type="number"
                    placeholder="0"
                    value={filters.priceMin}
                    onChange={e => updateFilter('priceMin', e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    最高料金
                  </Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={filters.priceMax}
                    onChange={e => updateFilter('priceMax', e.target.value)}
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
                    type="number"
                    placeholder="1"
                    value={filters.participantsMin}
                    onChange={e =>
                      updateFilter('participantsMin', e.target.value)
                    }
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    最多参加者
                  </Label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={filters.participantsMax}
                    onChange={e =>
                      updateFilter('participantsMax', e.target.value)
                    }
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
                        const isChecked = filters.bookingTypes.includes(
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

              {/* その他オプション */}
              <div className="mt-4 sm:mt-6 pt-4 border-t border-blue-200">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="only-available"
                    checked={filters.onlyAvailable}
                    onCheckedChange={checked =>
                      updateFilter('onlyAvailable', checked)
                    }
                    className="w-4 h-4"
                  />
                  <Label
                    htmlFor="only-available"
                    className="text-sm cursor-pointer flex items-center gap-2"
                  >
                    <Users className="h-4 w-4 text-emerald-600" />
                    空きがある撮影会のみ表示
                  </Label>
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
