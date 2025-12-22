'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

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
  value: Date | string | null | undefined;
  /** 表示フォーマット */
  format: DateTimeFormat;
  /** 終了日時（範囲表示の場合） */
  endValue?: Date | string | null | undefined;
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
  timeZone: propTimeZone,
  'aria-label': ariaLabel,
}: FormattedDateTimeProps) {
  const currentLocale = useLocale();
  const displayLocale = locale || currentLocale;
  const { user } = useAuth();
  const [timeZone, setTimeZone] = useState(propTimeZone || 'Asia/Tokyo');

  // user_metadataからタイムゾーンを取得
  useEffect(() => {
    if (user?.user_metadata?.timezone) {
      setTimeZone(user.user_metadata.timezone);
    } else if (propTimeZone) {
      setTimeZone(propTimeZone);
    }
  }, [user, propTimeZone]);

  // デバッグ: value が空文字列の場合をログ出力
  useEffect(() => {
    if (value === '') {
      logger.warn('[FormattedDateTime] Empty string value received:', {
        value,
        format,
      });
    }
  }, [value, format]);

  // valueがnull/undefinedの場合は早期リターン（Hooksの後に配置）
  if (value === null || value === undefined) {
    return (
      <time className={cn('inline-block', className)} aria-label={ariaLabel}>
        <span className="text-muted-foreground">日時不明</span>
      </time>
    );
  }

  // 日時の正規化（datetime-local形式やISO文字列をDateオブジェクトに変換）
  const normalizeDate = (
    dateValue: Date | string | null | undefined
  ): Date | null => {
    try {
      let date: Date;

      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        // 空文字列やnull/undefined文字列のチェック
        if (
          !dateValue ||
          dateValue.trim() === '' ||
          dateValue === 'null' ||
          dateValue === 'undefined'
        ) {
          return null;
        }

        // datetime-local形式（YYYY-MM-DDTHH:mm）の場合 - 秒とタイムゾーンがない場合のみ
        // ISO 8601タイムゾーンオフセット（+00:00 や -05:00）は除外する
        // dateValueが文字列であることを確認してからmatch()を呼ぶ
        const hasNegativeTimezoneOffset =
          dateValue.match(/-\d{2}:\d{2}$/) !== null;
        const isDateTimeLocal =
          dateValue.includes('T') &&
          !dateValue.includes('Z') &&
          !dateValue.includes('+') &&
          !hasNegativeTimezoneOffset; // マイナスのタイムゾーンオフセットを除外

        if (isDateTimeLocal && !dateValue.includes('.')) {
          // 秒がない場合のみ ':00' を追加
          date = new Date(dateValue + ':00');
        } else {
          date = new Date(dateValue);
        }
      } else {
        return null;
      }

      // 無効な日付のチェック
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch (error) {
      logger.error('[FormattedDateTime] Date normalization error:', error, {
        dateValue,
        dateValueType: typeof dateValue,
      });
      return null; // エラー時はnullを返す
    }
  };

  const startDate = normalizeDate(value);
  const normalizedEndDate = endValue ? normalizeDate(endValue) : null;
  const endDate = normalizedEndDate || undefined;

  // 無効な日付の場合はフォールバック表示
  if (!startDate) {
    return (
      <time className={cn('inline-block', className)} aria-label={ariaLabel}>
        <span className="text-muted-foreground">日時不明</span>
      </time>
    );
  }

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
          // endDateが無効な場合はstartDateのみを表示
          return new Intl.DateTimeFormat(displayLocale, {
            ...options,
            hour: '2-digit',
            minute: '2-digit',
          }).format(startDate);
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

  try {
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
  } catch (error) {
    // フォーマットエラーが発生した場合のフォールバック
    logger.error(
      'FormattedDateTime format error',
      String(error),
      `value: ${String(value)}, format: ${format}, endValue: ${endValue ? String(endValue) : 'none'}`
    );
    return (
      <time className={cn('inline-block', className)} aria-label={ariaLabel}>
        <span className="text-muted-foreground">日時不明</span>
      </time>
    );
  }
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
  currency: propCurrency,
  locale,
  className,
  'aria-label': ariaLabel,
}: FormattedPriceProps) {
  const currentLocale = useLocale();
  const displayLocale = locale || currentLocale;
  const { user } = useAuth();
  const [currency, setCurrency] = useState(propCurrency || 'JPY');

  // user_metadataから通貨を取得
  useEffect(() => {
    if (user?.user_metadata?.currency) {
      setCurrency(user.user_metadata.currency);
    } else if (propCurrency) {
      setCurrency(propCurrency);
    }
  }, [user, propCurrency]);

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
