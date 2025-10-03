/**
 * ユーザー活動統計関連の型定義
 */

/**
 * 月別活動データ
 */
export interface MonthlyActivityData {
  /** 月（YYYY-MM形式） */
  month: string;
  /** 参加した撮影会数 */
  participated: number;
  /** 主催した撮影会数 */
  organized: number;
}

/**
 * 撮影会タイプ分布データ
 */
export interface SessionTypeData {
  /** タイプ名 */
  name: string;
  /** 件数 */
  value: number;
  /** グラフ表示用カラー */
  color: string;
}

/**
 * 評価推移データ
 */
export interface RatingTrendData {
  /** 日付（YYYY-MM-DD形式） */
  date: string;
  /** 平均評価 */
  rating: number;
  /** 該当期間のセッション数 */
  sessionCount: number;
}

/**
 * 活動時間帯ヒートマップデータ（将来用）
 */
export interface ActivityHeatmapData {
  /** 時間（0-23） */
  hour: number;
  /** 曜日 */
  day: string;
  /** 活動回数 */
  count: number;
}

/**
 * 地域別活動データ（将来用）
 */
export interface RegionalActivityData {
  /** 都道府県名 */
  prefecture: string;
  /** セッション数 */
  sessionCount: number;
  /** 平均評価 */
  averageRating: number;
}

/**
 * 統計チャート用のカラーパレット
 */
export interface ChartColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * チャートの共通プロパティ
 */
export interface BaseChartProps {
  /** グラフの高さ（px） */
  height?: number;
  /** レスポンシブ対応 */
  responsive?: boolean;
  /** ローディング状態 */
  isLoading?: boolean;
}
