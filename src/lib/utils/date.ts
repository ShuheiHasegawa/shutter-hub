// 日付フォーマット用のユーティリティ関数
// クライアント・サーバー両方で使用可能

// 注意: サーバーサイド専用の関数（getUserTimezone, getUserLocale）は
// date-server.ts に移動しました

export function formatDate(
  date: Date,
  format: 'short' | 'long' | 'time' = 'short',
  timeZone?: string
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timeZone || 'Asia/Tokyo',
  };

  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = 'numeric';
      options.day = 'numeric';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'long';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }

  return new Intl.DateTimeFormat('ja-JP', options).format(date);
}

// 多言語対応の日付フォーマット関数
export function formatDateLocalized(
  date: Date,
  locale: string = 'ja-JP',
  format: 'short' | 'long' | 'time' = 'short',
  timeZone?: string
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timeZone || 'Asia/Tokyo',
  };

  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = 'numeric';
      options.day = 'numeric';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'long';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatDateTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone || 'Asia/Tokyo',
  }).format(date);
}

export function formatDateTimeLocalized(
  date: Date,
  locale: string = 'ja-JP',
  timeZone?: string
): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone || 'Asia/Tokyo',
  }).format(date);
}

export function formatTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone || 'Asia/Tokyo',
  }).format(date);
}

export function formatTimeLocalized(
  date: Date,
  locale: string = 'ja-JP',
  timeZone?: string
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone || 'Asia/Tokyo',
  }).format(date);
}

/**
 * 短い日時フォーマット（月日 + 時分）
 * 例: 1/21 14:30, Jan 21 02:30 PM
 */
export function formatShortDateTime(
  date: Date,
  locale: string = 'ja-JP',
  timeZone?: string
): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone || 'Asia/Tokyo',
  }).format(date);
}

export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = formatDate(startDate, 'long');
  const startTime = formatTime(startDate);
  const endTime = formatTime(endDate);

  return `${start} ${startTime} - ${endTime}`;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isFuture(date: Date): boolean {
  return date > new Date();
}

export function isPast(date: Date): boolean {
  return date < new Date();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export function differenceInHours(laterDate: Date, earlierDate: Date): number {
  return Math.floor(
    (laterDate.getTime() - earlierDate.getTime()) / (1000 * 60 * 60)
  );
}

export function differenceInDays(laterDate: Date, earlierDate: Date): number {
  return Math.floor(
    (laterDate.getTime() - earlierDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}
