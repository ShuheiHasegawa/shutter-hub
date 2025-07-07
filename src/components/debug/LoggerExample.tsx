'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { logger } from '@/lib/utils/logger';

/**
 * Logger機能の使用例を示すデモコンポーネント
 * 開発環境でのみ表示することを推奨
 */
export function LoggerExample() {
  const handleBasicLogs = () => {
    logger.debug('デバッグログのテスト', {
      component: 'LoggerExample',
      timestamp: Date.now(),
    });
    logger.info('情報ログのテスト');
    logger.warn('警告ログのテスト');
    logger.error('エラーログのテスト', new Error('テストエラー'));
  };

  const handleGroupLogs = () => {
    logger.group('撮影会予約処理');
    logger.debug('ユーザー認証の確認');
    logger.info('空き枠の検索中');
    logger.debug('予約データの作成');
    logger.info('予約が完了しました');
    logger.groupEnd();
  };

  const handleTimeMeasurement = () => {
    logger.time('データベースクエリ');

    // 模擬的な非同期処理
    setTimeout(() => {
      logger.timeEnd('データベースクエリ');
      logger.info('クエリが完了しました');
    }, 100);
  };

  const handleTableLog = () => {
    const sampleData = [
      { name: '田中太郎', role: 'model', rating: 4.5 },
      { name: '佐藤花子', role: 'photographer', rating: 4.8 },
      { name: '鈴木一郎', role: 'organizer', rating: 4.2 },
    ];

    logger.table(sampleData);
  };

  const handleConfigCheck = () => {
    const config = logger.getConfig();
    logger.info('現在のLogger設定', config);
  };

  // 開発環境でない場合は何も表示しない
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Logger機能テスト</CardTitle>
        <CardDescription>
          開発環境でのLogger機能の動作確認用コンポーネントです。
          ブラウザのコンソールでログを確認してください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={handleBasicLogs} variant="outline">
            基本ログテスト
          </Button>

          <Button onClick={handleGroupLogs} variant="outline">
            グループログテスト
          </Button>

          <Button onClick={handleTimeMeasurement} variant="outline">
            時間測定テスト
          </Button>

          <Button onClick={handleTableLog} variant="outline">
            テーブルログテスト
          </Button>

          <Button
            onClick={handleConfigCheck}
            variant="outline"
            className="col-span-2"
          >
            設定確認
          </Button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-2">環境変数設定例：</h4>
          <pre className="text-sm font-mono">
            {`NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=true
NEXT_PUBLIC_LOG_LEVEL=debug`}
          </pre>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>現在の設定: {JSON.stringify(logger.getConfig())}</p>
        </div>
      </CardContent>
    </Card>
  );
}
