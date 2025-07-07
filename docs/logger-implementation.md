# Logger機能実装ガイド

## 概要

ShutterHub v2に実装された環境変数制御によるLogger機能の使用ガイドです。開発時のデバッグを効率化し、本番環境での不要なログ出力を防ぎます。

## 特徴

- ✅ 環境変数による出力制御
- ✅ ログレベル別の出力制御
- ✅ 本番環境での自動無効化
- ✅ 実行時間測定機能
- ✅ グループログ機能
- ✅ TypeScript型安全対応

## セットアップ

### 1. 環境変数設定

`.env.local` ファイルに以下を追加：

```env
# Logger設定（開発用）
NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

### 2. ログレベル設定

| レベル | 値 | 説明 |
|--------|----|----|
| error | 0 | エラーのみ |
| warn | 1 | 警告以上 |
| info | 2 | 情報以上（推奨） |
| debug | 3 | すべて（開発時） |

## 基本的な使用方法

### インポート

```typescript
import { logger } from '@/lib/utils/logger';
```

### 基本ログ

```typescript
// デバッグ情報
logger.debug('ユーザー情報を取得中', { userId: '123', action: 'fetch' });

// 情報ログ
logger.info('ユーザーがログインしました');

// 警告ログ
logger.warn('API応答時間が遅延しています', { responseTime: 3000 });

// エラーログ
logger.error('データベース接続エラー', error);
```

### グループログ

```typescript
logger.group('撮影会予約処理');
logger.debug('ユーザー認証の確認');
logger.info('空き枠の検索中');
logger.debug('予約データの作成');
logger.info('予約が完了しました');
logger.groupEnd();
```

### 実行時間測定

```typescript
logger.time('データベースクエリ');
const result = await supabase.from('table').select('*');
logger.timeEnd('データベースクエリ');
```

### テーブル表示

```typescript
const userData = [
  { name: '田中太郎', role: 'model', rating: 4.5 },
  { name: '佐藤花子', role: 'photographer', rating: 4.8 }
];
logger.table(userData);
```

## 実践的な使用例

### Server Actionでの使用

```typescript
'use server';

import { logger } from '@/lib/utils/logger';

export async function createPhotoSession(data: PhotoSessionData) {
  logger.group('撮影会作成処理');
  logger.time('total-execution');

  try {
    logger.debug('処理開始', { title: data.title });

    // 認証チェック
    const user = await getUser();
    if (!user) {
      logger.warn('未認証ユーザーによる作成試行');
      return { success: false, error: '認証が必要です' };
    }

    logger.debug('認証完了', { userId: user.id });

    // データベース処理
    logger.time('database-insert');
    const result = await insertPhotoSession(data);
    logger.timeEnd('database-insert');

    if (result.error) {
      logger.error('データベースエラー', { error: result.error, data });
      return { success: false, error: '作成に失敗しました' };
    }

    logger.info('撮影会作成成功', { 
      sessionId: result.data.id,
      title: result.data.title
    });

    return { success: true, data: result.data };

  } catch (error) {
    logger.error('予期しないエラー', { error, data });
    return { success: false, error: '予期しないエラーが発生しました' };
  } finally {
    logger.timeEnd('total-execution');
    logger.groupEnd();
  }
}
```

### クライアントコンポーネントでの使用

```typescript
'use client';

import { logger } from '@/lib/utils/logger';

export function BookingForm() {
  const handleSubmit = async (data: FormData) => {
    logger.group('予約フォーム送信');
    
    try {
      logger.debug('バリデーション開始', { data });
      
      const validated = validateBookingData(data);
      logger.debug('バリデーション完了');

      logger.time('api-request');
      const response = await fetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(validated)
      });
      logger.timeEnd('api-request');

      if (!response.ok) {
        logger.error('API呼び出しエラー', { 
          status: response.status, 
          statusText: response.statusText 
        });
        return;
      }

      logger.info('予約送信成功');
      
    } catch (error) {
      logger.error('予約送信エラー', error);
    } finally {
      logger.groupEnd();
    }
  };
}
```

## 本番環境での動作

### 環境変数設定

本番環境では以下のように設定：

```env
# 本番環境設定
NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=false
# または設定しない（デフォルトでfalse）
```

### 自動無効化

- `NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=false` の場合、すべてのログが無効化
- パフォーマンスへの影響を最小限に抑制
- 本番環境でのログ漏れを完全防止

## パフォーマンスに関する注意

### 推奨事項

1. **大量データのログ出力は避ける**
   ```typescript
   // ❌ 避ける
   logger.debug('全ユーザーデータ', massiveUserArray);
   
   // ✅ 推奨
   logger.debug('ユーザー数', { count: massiveUserArray.length });
   ```

2. **重い処理をログ内で行わない**
   ```typescript
   // ❌ 避ける
   logger.debug('処理結果', expensiveCalculation());
   
   // ✅ 推奨
   const result = expensiveCalculation();
   logger.debug('処理結果', { resultSummary: result.summary });
   ```

3. **適切なログレベルの使用**
   - 本番環境では `info` レベルを推奨
   - 開発環境では `debug` レベルで詳細確認

## 設定確認

現在の設定を確認：

```typescript
const config = logger.getConfig();
console.log('Logger設定:', config);
// 出力例: { isEnabled: true, logLevel: 'debug' }
```

## 移行ガイド

### 既存のconsole.logから移行

```typescript
// 移行前
console.log('ユーザー情報:', user);
console.error('エラー発生:', error);

// 移行後
logger.debug('ユーザー情報', { user });
logger.error('エラー発生', error);
```

### 段階的移行

1. **新機能**: 最初からLoggerを使用
2. **重要な処理**: console.logをLoggerに置き換え
3. **全体**: 時間のあるときに一括置換

## トラブルシューティング

### ログが表示されない場合

1. 環境変数の確認
   ```bash
   echo $NEXT_PUBLIC_ENABLE_DEBUG_LOGGING
   ```

2. ログレベルの確認
   ```typescript
   logger.getConfig(); // 設定状況を確認
   ```

3. ブラウザコンソールの確認
   - Devツールのコンソールタブを開く
   - フィルター設定を確認

### 本番環境でログが表示される場合

1. `.env.production` の確認
2. Vercelの環境変数設定を確認
3. ビルド時の環境変数を確認

## まとめ

Logger機能により、以下のメリットが得られます：

- 🚀 **開発効率向上**: 詳細なデバッグ情報
- 🔒 **本番環境安全**: 自動的なログ無効化
- 📊 **パフォーマンス計測**: 実行時間の可視化  
- 🎯 **問題解決**: 構造化されたエラー情報
- 🛠️ **保守性**: 一元化されたログ管理

環境変数による制御により、開発中は詳細なログを出力し、本番環境では完全に無効化することで、パフォーマンスとセキュリティを両立できます。 