'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

// 日時表示の種類
export type DateTimeFormat =
  | 'date-short' // 2024/12/1
  | 'date-long' // 2024年12月1日日曜日
  | 'time' // 14:30
  | 'datetime-short' // 2024/12/1 14:30
  | 'datetime-long' // 2024年12月1日日曜日 14:30
  | 'date-only' // 12月1日
  | 'time-range' // 14:30-16:00
  | 'relative' // 3時間前
  | 'weekday'; // 日曜日

// 価格表示の種類
export type PriceFormat =
  | 'simple' // ¥5,000
  | 'with-unit' // ¥5,000/人
  | 'range' // ¥3,000-¥8,000
  | 'breakdown'; // ¥5,000 (税込)

interface FormattedDateTimeProps {
  /** 表示する日時（Date、ISO文字列、datetime-local形式） */
  value: Date | string;
  /** 表示フォーマット */
  format: DateTimeFormat;
  /** 終了日時（範囲表示の場合） */
  endValue?: Date | string;
  /** ロケール（省略時は現在のロケール） */
  locale?: string;
  /** カスタムクラス名 */
  className?: string;
  /** タイムゾーン（デフォルト: Asia/Tokyo） */
  timeZone?: string;
  /** アクセシビリティ用のラベル */
  'aria-label'?: string;
}

interface FormattedPriceProps {
  /** 表示する価格 */
  value: number;
  /** 表示フォーマット */
  format: PriceFormat;
  /** 最大価格（範囲表示の場合） */
  maxValue?: number;
  /** 単位（/人、/回など） */
  unit?: string;
  /** 通貨（デフォルト: JPY） */
  currency?: string;
  /** ロケール（省略時は現在のロケール） */
  locale?: string;
  /** カスタムクラス名 */
  className?: string;
  /** アクセシビリティ用のラベル */
  'aria-label'?: string;
}

/**
 * 統一された日時表示コンポーネント
 *
 * 使用例:
 * <FormattedDateTime value={new Date()} format="datetime-long" />
 * <FormattedDateTime value="2024-12-01T14:30" format="time-range" endValue="2024-12-01T16:00" />
 */
export function FormattedDateTime({
  value,
  format,
  endValue,
  locale,
  className,
  timeZone = 'Asia/Tokyo',
  'aria-label': ariaLabel,
}: FormattedDateTimeProps) {
  const currentLocale = useLocale();
  const displayLocale = locale || currentLocale;

  // 日時の正規化（datetime-local形式やISO文字列をDateオブジェクトに変換）
  const normalizeDate = (dateValue: Date | string): Date => {
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // datetime-local形式（YYYY-MM-DDTHH:mm）の場合
    if (
      typeof dateValue === 'string' &&
      dateValue.includes('T') &&
      !dateValue.includes('Z')
    ) {
      return new Date(dateValue + ':00'); // 秒を追加
    }

    return new Date(dateValue);
  };

  const startDate = normalizeDate(value);
  const endDate = endValue ? normalizeDate(endValue) : undefined;

  // フォーマット別の表示処理
  const formatDateTime = (): string => {
    const options: Intl.DateTimeFormatOptions = { timeZone };

    switch (format) {
      case 'date-short':
        return new Intl.DateTimeFormat(displayLocale, {
          ...options,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).format(startDate);

      case 'date-long':
        return new Intl.DateTimeFormat(displayLocale, {
          ...options,
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }).format(startDate);

      case 'time':
        return new Intl.DateTimeFormat(displayLocale, {
          ...options,
          hour: '2-digit',
          minute: '2-digit',
        }).format(startDate);

      case 'datetime-short':
        return new Intl.DateTimeFormat(displayLocale, {
          ...options,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(startDate);

      case 'datetime-long':
        return new Intl.DateTimeFormat(displayLocale, {
          ...options,
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }).format(startDate);

      case 'date-only':
        return new Intl.DateTimeFormat(displayLocale, {
          ...options,
          month: 'long',
          day: 'numeric',
        }).format(startDate);

      case 'time-range':
        if (!endDate) {
          return formatDateTime(); // フォールバック
        }
        const startTime = new Intl.DateTimeFormat(displayLocale, {
          ...options,
          hour: '2-digit',
          minute: '2-digit',
        }).format(startDate);
        const endTime = new Intl.DateTimeFormat(displayLocale, {
          ...options,
          hour: '2-digit',
          minute: '2-digit',
        }).format(endDate);
        return `${startTime}-${endTime}`;

      case 'relative':
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          return displayLocale === 'ja'
            ? `${diffDays}日前`
            : `${diffDays} days ago`;
        } else if (diffHours > 0) {
          return displayLocale === 'ja'
            ? `${diffHours}時間前`
            : `${diffHours} hours ago`;
        } else if (diffMinutes > 0) {
          return displayLocale === 'ja'
            ? `${diffMinutes}分前`
            : `${diffMinutes} minutes ago`;
        } else {
          return displayLocale === 'ja' ? 'たった今' : 'just now';
        }

      case 'weekday':
        return new Intl.DateTimeFormat(displayLocale, {
          ...options,
          weekday: 'long',
        }).format(startDate);

      default:
        return startDate.toISOString();
    }
  };

  const formattedText = formatDateTime();

  return (
    <time
      dateTime={startDate.toISOString()}
      className={cn('inline-block', className)}
      aria-label={ariaLabel}
    >
      {formattedText}
    </time>
  );
}

/**
 * 統一された価格表示コンポーネント
 *
 * 使用例:
 * <FormattedPrice value={5000} format="simple" />
 * <FormattedPrice value={5000} format="with-unit" unit="/人" />
 * <FormattedPrice value={3000} format="range" maxValue={8000} />
 */
export function FormattedPrice({
  value,
  format,
  maxValue,
  unit,
  currency = 'JPY',
  locale,
  className,
  'aria-label': ariaLabel,
}: FormattedPriceProps) {
  const currentLocale = useLocale();
  const displayLocale = locale || currentLocale;

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(displayLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPriceDisplay = (): string => {
    switch (format) {
      case 'simple':
        return formatPrice(value);

      case 'with-unit':
        return `${formatPrice(value)}${unit || ''}`;

      case 'range':
        if (maxValue && maxValue !== value) {
          return `${formatPrice(value)}-${formatPrice(maxValue)}`;
        }
        return formatPrice(value);

      case 'breakdown':
        return `${formatPrice(value)} (税込)`;

      default:
        return formatPrice(value);
    }
  };

  const formattedText = formatPriceDisplay();

  return (
    <span
      className={cn('inline-block font-medium', className)}
      aria-label={ariaLabel}
    >
      {formattedText}
    </span>
  );
}

// 便利なラッパーコンポーネント
export const DateTime = FormattedDateTime;
export const Price = FormattedPrice;
