/**
 * 開発用Logger機能
 * 環境変数による出力制御を行い、本番環境でのログ漏れを防止する
 */

// ログレベル定義
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// ログレベルの文字列マッピング
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

class Logger {
  private isEnabled: boolean;
  private logLevel: LogLevel;

  constructor() {
    // 環境変数からログ設定を読み込み
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

    const envLogLevel =
      process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase() || 'info';
    this.logLevel = LOG_LEVEL_MAP[envLogLevel] ?? LogLevel.INFO;
  }

  /**
   * エラーログ
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * 警告ログ
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * 情報ログ
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * デバッグログ
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * グループログ開始
   */
  group(label: string): void {
    if (this.isEnabled) {
      console.group(`[GROUP] ${label}`);
    }
  }

  /**
   * グループログ終了
   */
  groupEnd(): void {
    if (this.isEnabled) {
      console.groupEnd();
    }
  }

  /**
   * 実行時間測定開始
   */
  time(label: string): void {
    if (this.isEnabled) {
      console.time(`[TIME] ${label}`);
    }
  }

  /**
   * 実行時間測定終了
   */
  timeEnd(label: string): void {
    if (this.isEnabled) {
      console.timeEnd(`[TIME] ${label}`);
    }
  }

  /**
   * テーブル形式でのログ出力
   */
  table(data: unknown): void {
    if (this.isEnabled && this.shouldLog(LogLevel.DEBUG)) {
      console.table(data);
    }
  }

  /**
   * ログ出力の可否を判定
   */
  private shouldLog(level: LogLevel): boolean {
    return this.isEnabled && level <= this.logLevel;
  }

  /**
   * メッセージをフォーマット
   */
  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} - ${message}`;
  }

  /**
   * 現在の設定を出力
   */
  getConfig(): { isEnabled: boolean; logLevel: string } {
    const levelName =
      Object.keys(LOG_LEVEL_MAP).find(
        key => LOG_LEVEL_MAP[key] === this.logLevel
      ) || 'unknown';

    return {
      isEnabled: this.isEnabled,
      logLevel: levelName,
    };
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// 使用例をコメントで記載
/*
使用例:

import { logger } from '@/lib/utils/logger';

// 基本的な使用
logger.debug('デバッグ情報', { userId: '123', action: 'login' });
logger.info('ユーザーがログインしました');
logger.warn('パフォーマンスが低下しています');
logger.error('エラーが発生しました', error);

// グループログ
logger.group('予約処理');
logger.debug('予約データの検証中');
logger.debug('空き枠の確認中');
logger.info('予約が完了しました');
logger.groupEnd();

// 実行時間測定
logger.time('データベースクエリ');
// ... データベース処理
logger.timeEnd('データベースクエリ');

// テーブル出力
logger.table([
  { name: '太郎', age: 25 },
  { name: '花子', age: 23 }
]);

// 設定確認
console.log(logger.getConfig());
*/
