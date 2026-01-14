'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { Slider } from '@/components/ui/slider';
import {
  MapPin,
  Calendar,
  DollarSign,
  Star,
  Clock,
  Shuffle,
  UserCheck,
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

interface PhotoSessionFilterContentProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

/**
 * 撮影会検索用フィルターコンテンツコンポーネント
 * モバイル用ボトムシート内で使用するフィルター項目を表示する
 */
export function PhotoSessionFilterContent({
  filters,
  onFiltersChange,
}: PhotoSessionFilterContentProps) {
  const t = useTranslations('photoSessions');

  const bookingTypeLabels = {
    first_come: {
      label: t('bookingType.firstCome.title'),
      icon: Clock,
    },
    lottery: {
      label: t('bookingType.lottery.title'),
      icon: Shuffle,
    },
    admin_lottery: {
      label: t('bookingType.adminLottery.title'),
      icon: UserCheck,
    },
    priority: {
      label: t('bookingType.priority.title'),
      icon: Star,
    },
  };

  const handleKeywordChange = (value: string) => {
    onFiltersChange({
      ...filters,
      keyword: value,
    });
  };

  const handleLocationChange = (value: string) => {
    onFiltersChange({
      ...filters,
      location: value,
    });
  };

  const handleDateFromChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dateFrom: value,
    });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dateTo: value,
    });
  };

  // 料金スライダーの設定
  const PRICE_MIN = 0;
  const PRICE_MAX = 99999;
  const PRICE_STEP = 1000;

  // スライダーの値をフィルター状態から取得
  const getSliderValue = (): [number, number] => {
    const min = filters.priceMin ? parseInt(filters.priceMin, 10) : PRICE_MIN;
    const max = filters.priceMax ? parseInt(filters.priceMax, 10) : PRICE_MAX;
    return [
      Math.max(PRICE_MIN, Math.min(PRICE_MAX, min)),
      Math.max(PRICE_MIN, Math.min(PRICE_MAX, max)),
    ];
  };

  const [sliderValue, setSliderValue] =
    useState<[number, number]>(getSliderValue());

  // フィルターが外部から変更された場合にスライダー値を更新
  useEffect(() => {
    const min = filters.priceMin ? parseInt(filters.priceMin, 10) : PRICE_MIN;
    const max = filters.priceMax ? parseInt(filters.priceMax, 10) : PRICE_MAX;
    setSliderValue([
      Math.max(PRICE_MIN, Math.min(PRICE_MAX, min)),
      Math.max(PRICE_MIN, Math.min(PRICE_MAX, max)),
    ]);
  }, [filters.priceMin, filters.priceMax]);

  const handlePriceSliderChange = (value: number[]) => {
    const [min, max] = value as [number, number];
    setSliderValue([min, max]);
    onFiltersChange({
      ...filters,
      priceMin: min === PRICE_MIN ? '' : String(min),
      priceMax: max === PRICE_MAX ? '' : String(max),
    });
  };

  // 価格をフォーマットする関数
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const toggleBookingType = (bookingType: BookingType) => {
    const newTypes = filters.bookingTypes.includes(bookingType)
      ? filters.bookingTypes.filter(type => type !== bookingType)
      : [...filters.bookingTypes, bookingType];
    onFiltersChange({
      ...filters,
      bookingTypes: newTypes,
    });
  };

  return (
    <div className="space-y-6">
      {/* キーワード検索 */}
      <div>
        <Label className="text-sm font-medium text-theme-text-primary mb-2 block">
          {t('sidebar.keyword')}
        </Label>
        <Input
          placeholder={t('list.keywordPlaceholder')}
          value={filters.keyword || ''}
          onChange={e => handleKeywordChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* 場所フィルター */}
      <div>
        <Label className="text-sm font-medium text-theme-text-primary mb-2 block flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {t('sidebar.location')}
        </Label>
        <Input
          placeholder={t('list.locationPlaceholder')}
          value={filters.location || ''}
          onChange={e => handleLocationChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* 日程フィルター */}
      <div>
        <Label className="text-sm font-medium text-theme-text-primary mb-2 block flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {t('sidebar.dateRange')}
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('sidebar.dateFrom')}
            </Label>
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => handleDateFromChange(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('sidebar.dateTo')}
            </Label>
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={e => handleDateToChange(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 料金フィルター */}
      <div>
        <Label className="text-sm font-medium text-theme-text-primary mb-2 block flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          {t('sidebar.priceRange')}
        </Label>
        <div className="space-y-4">
          {/* スライダー */}
          <Slider
            value={sliderValue}
            onValueChange={handlePriceSliderChange}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            className="w-full"
          />
          {/* 現在の範囲表示 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {t('sidebar.priceMin')}:
              </span>
              <span className="font-medium text-theme-text-primary">
                {formatPrice(sliderValue[0])}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {t('sidebar.priceMax')}:
              </span>
              <span className="font-medium text-theme-text-primary">
                {formatPrice(sliderValue[1])}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 予約方式フィルター */}
      <div>
        <Label className="text-sm font-medium text-theme-text-primary mb-2 block flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          {t('bookingType.title')}
        </Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(bookingTypeLabels).map(([key, typeInfo]) => {
            const Icon = typeInfo.icon;
            const isChecked = filters.bookingTypes.includes(key as BookingType);
            return (
              <Toggle
                key={key}
                pressed={isChecked}
                onPressedChange={() => toggleBookingType(key as BookingType)}
                size="sm"
                aria-label={typeInfo.label}
              >
                <Icon className="h-4 w-4" />
                {typeInfo.label}
              </Toggle>
            );
          })}
        </div>
      </div>
    </div>
  );
}
