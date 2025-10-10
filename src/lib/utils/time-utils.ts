// 時間変換ユーティリティ関数

/**
 * 時間文字列を分単位に変換する
 * @param time HH:MM形式の時間文字列
 * @returns 0-1439の分単位数値
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 分単位を時間文字列に変換する
 * @param minutes 0-1439の分単位数値
 * @returns HH:MM形式の時間文字列
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * 時間範囲をフォーマットする
 * @param startMinutes 開始時間（分）
 * @param endMinutes 終了時間（分）
 * @returns "HH:MM - HH:MM"形式の文字列
 */
export function formatTimeRange(
  startMinutes: number,
  endMinutes: number
): string {
  return `${minutesToTime(startMinutes)} - ${minutesToTime(endMinutes)}`;
}

/**
 * 時間の妥当性をチェックする
 * @param startTime 開始時間
 * @param endTime 終了時間
 * @returns 妥当性チェック結果
 */
export function validateTimeRange(
  startTime: string,
  endTime: string
): {
  isValid: boolean;
  error?: string;
} {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes >= endMinutes) {
    return {
      isValid: false,
      error: '開始時間は終了時間より前である必要があります',
    };
  }

  if (startMinutes < 0 || startMinutes >= 1440) {
    return {
      isValid: false,
      error: '開始時間が無効です',
    };
  }

  if (endMinutes <= 0 || endMinutes > 1440) {
    return {
      isValid: false,
      error: '終了時間が無効です',
    };
  }

  return { isValid: true };
}

/**
 * 日付オブジェクトをローカルタイムゾーンでYYYY-MM-DD形式の文字列に変換する
 * UTCタイムゾーン変換を避けて正確な日付を取得する
 * @param date 日付オブジェクト
 * @returns YYYY-MM-DD形式の日付文字列
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付文字列の妥当性をチェックする
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns 妥当性チェック結果
 */
export function validateDateString(dateStr: string): {
  isValid: boolean;
  error?: string;
} {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: '無効な日付形式です',
    };
  }

  // 過去の日付チェック（当日は許可）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date < today) {
    return {
      isValid: false,
      error: '過去の日付は設定できません',
    };
  }

  // 6ヶ月以上先の日付チェック
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  sixMonthsLater.setHours(0, 0, 0, 0);

  if (date > sixMonthsLater) {
    return {
      isValid: false,
      error: '6ヶ月以上先の日付は設定できません',
    };
  }

  return { isValid: true };
}
