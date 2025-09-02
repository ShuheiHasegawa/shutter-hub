/**
 * 入力値正規化ユーティリティ
 * 全角→半角変換、空白削除、数値正規化を行う
 */

/**
 * 全角文字を半角文字に変換する
 */
export function toHalfWidth(str: string): string {
  return str.replace(/[０-９]/g, char => {
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
  });
}

/**
 * 文字列の前後の空白を削除する
 */
export function trimWhitespace(str: string): string {
  return str.trim();
}

/**
 * 数値文字列を正規化する（全角→半角、空白削除、数値検証）
 */
export function normalizeNumberString(input: string): {
  normalized: string;
  isValid: boolean;
  numericValue: number | null;
} {
  // 空文字列の場合
  if (!input) {
    return {
      normalized: '',
      isValid: true, // 空文字列は有効（フィルターなし）
      numericValue: null,
    };
  }

  // 1. 前後の空白を削除
  let normalized = trimWhitespace(input);

  // 2. 全角数字を半角に変換
  normalized = toHalfWidth(normalized);

  // 3. カンマを削除（1,000 → 1000）
  normalized = normalized.replace(/,/g, '');

  // 4. 数値として解析
  const numericValue = parseInt(normalized, 10);
  const isValid = !isNaN(numericValue) && numericValue >= 0;

  return {
    normalized,
    isValid,
    numericValue: isValid ? numericValue : null,
  };
}

/**
 * 文字列を正規化する（全角→半角、空白削除）
 */
export function normalizeString(input: string): string {
  if (!input) return '';

  // 1. 前後の空白を削除
  const trimmed = trimWhitespace(input);

  // 2. 全角英数字を半角に変換
  const halfWidth = trimmed.replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => {
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
  });

  // 3. 連続する空白を単一の空白に変換
  const normalized = halfWidth.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * 検索キーワードを正規化する
 */
export function normalizeSearchKeyword(keyword: string): string {
  if (!keyword) return '';

  // 基本的な文字列正規化
  const normalized = normalizeString(keyword);

  // 検索用の追加処理
  // - 大文字小文字は保持（検索時にilike使用のため）

  return normalized;
}

/**
 * 場所名を正規化する
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';

  // 基本的な文字列正規化
  const normalized = normalizeString(location);

  // 場所名用の追加処理
  // - 「都」「府」「県」「市」「区」「町」「村」などは保持

  return normalized;
}

/**
 * 料金範囲の正規化と検証
 */
export function normalizePriceRange(
  min: string,
  max: string
): {
  minPrice: number | null;
  maxPrice: number | null;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const minResult = normalizeNumberString(min);
  const maxResult = normalizeNumberString(max);

  // 最小値の検証
  if (min && !minResult.isValid) {
    errors.push('最低料金は有効な数値を入力してください');
  }

  // 最大値の検証
  if (max && !maxResult.isValid) {
    errors.push('最高料金は有効な数値を入力してください');
  }

  // 範囲の検証
  if (
    minResult.numericValue !== null &&
    maxResult.numericValue !== null &&
    minResult.numericValue > maxResult.numericValue
  ) {
    errors.push('最低料金は最高料金以下にしてください');
  }

  return {
    minPrice: minResult.numericValue,
    maxPrice: maxResult.numericValue,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 参加者数範囲の正規化と検証
 */
export function normalizeParticipantsRange(
  min: string,
  max: string
): {
  minParticipants: number | null;
  maxParticipants: number | null;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const minResult = normalizeNumberString(min);
  const maxResult = normalizeNumberString(max);

  // 最小値の検証
  if (min && !minResult.isValid) {
    errors.push('最少参加者数は有効な数値を入力してください');
  }

  // 最大値の検証
  if (max && !maxResult.isValid) {
    errors.push('最多参加者数は有効な数値を入力してください');
  }

  // 範囲の検証
  if (
    minResult.numericValue !== null &&
    maxResult.numericValue !== null &&
    minResult.numericValue > maxResult.numericValue
  ) {
    errors.push('最少参加者数は最多参加者数以下にしてください');
  }

  // 最小値は1以上
  if (minResult.numericValue !== null && minResult.numericValue < 1) {
    errors.push('最少参加者数は1以上にしてください');
  }

  return {
    minParticipants: minResult.numericValue,
    maxParticipants: maxResult.numericValue,
    isValid: errors.length === 0,
    errors,
  };
}
