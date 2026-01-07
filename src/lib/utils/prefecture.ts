import {
  PREFECTURE_JA_TO_KEY,
  PREFECTURE_KEY_TO_JA,
  type PrefectureKey,
} from '@/constants/japan';

/**
 * DBから取得した値を正規化する（日本語 → キー）
 * 既存データが日本語で保存されている場合に対応
 */
export function normalizePrefecture(
  value: string | null | undefined
): PrefectureKey | null {
  if (!value) return null;

  // 既にキーの形式の場合
  if (PREFECTURE_KEY_TO_JA[value as PrefectureKey]) {
    return value as PrefectureKey;
  }

  // 日本語名からキーに変換
  return PREFECTURE_JA_TO_KEY[value] || null;
}

/**
 * DBに保存する値を生成する（キー → キー）
 * 後方互換性のため、現在はキーをそのまま返す
 */
export function serializePrefecture(key: PrefectureKey | null): string | null {
  return key;
}

/**
 * 都道府県キーが有効かチェックする
 */
export function isValidPrefectureKey(
  value: string | null | undefined
): value is PrefectureKey {
  if (!value) return false;
  return value in PREFECTURE_KEY_TO_JA;
}
