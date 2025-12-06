---
description: デバッグログ追加専用 - クラス化Loggerを使用したログ追加
---

# Log Command - デバッグログ追加専用

このコマンドは、**クラス化されたLoggerを使用**してデバッグログを追加する専用コマンドです。

## 動作指針

### ✅ 実行すること
- **重要な処理ポイントでのログ追加**: 関数開始・終了・分岐・エラー処理
- **状態変化の追跡**: 重要な状態変更時のログ記録
- **API呼び出しの追跡**: Server Action、外部API呼び出しの開始・結果
- **エラーハンドリング強化**: catch文でのエラー詳細ログ
- **パフォーマンス測定**: 処理時間が重要な箇所での計測ログ

### ❌ 実行しないこと
- **console.log の使用**: 必ずクラス化Loggerを使用
- **過度なログ**: パフォーマンスに影響する頻繁すぎるログ
- **機密情報のログ**: パスワード、トークンなどの機密データ
- **実装変更**: ログ追加のみで、既存ロジックは変更しない

## Logger使用方法

### 基本的な使用パターン

```typescript
import { logger } from '@/lib/utils/logger';

// 関数開始時
logger.info('処理開始', { 
  functionName: 'createPhotobook',
  userId,
  photobookId 
});

// 重要な分岐点
logger.info('条件分岐', { 
  condition: 'hasOrderChanges',
  value: hasOrderChanges,
  reorderedImagesCount: reorderedImages.length
});

// API呼び出し前
logger.info('API呼び出し開始', {
  endpoint: 'savePhotobookChanges',
  payload: saveData
});

// API呼び出し後
logger.info('API呼び出し結果', {
  success: result.success,
  error: result.error
});

// エラー時
logger.error('処理エラー', {
  error,
  context: 'savePhotobook',
  userId,
  photobookId
});

// 処理完了時
logger.info('処理完了', {
  functionName: 'createPhotobook',
  result: 'success'
});
```

## ログレベル使い分け

### logger.info()
- **用途**: 正常な処理フローの追跡
- **タイミング**: 関数開始・終了、重要な状態変化、API呼び出し

### logger.warn()
- **用途**: 警告レベルの問題、回復可能なエラー
- **タイミング**: データ不整合、代替処理実行、非致命的エラー

### logger.error()
- **用途**: エラー、例外、失敗処理
- **タイミング**: catch文、致命的エラー、ユーザーに影響する問題

## 避けるべきログパターン

### ❌ 避けるべき例
```typescript
// console.log の使用
console.log('データ:', data); // ❌

// 機密情報のログ
logger.info('ユーザー情報', { password: user.password }); // ❌

// 過度に頻繁なログ
array.forEach(item => {
  logger.info('配列要素処理', { item }); // ❌ ループ内での頻繁ログ
});
```

### ✅ 推奨パターン
```typescript
// クラス化Logger使用
logger.info('データ処理', { dataCount: data.length }); // ✅

// 集約されたログ
logger.info('配列処理完了', { 
  totalItems: array.length,
  successCount,
  failureCount 
}); // ✅
```

## 注意事項

- **必ずクラス化Loggerを使用**: `import { logger } from '@/lib/utils/logger';`
- **適切なログレベル選択**: info/warn/error の使い分け
- **構造化ログ**: オブジェクト形式での詳細情報記録
- **機密情報の除外**: パスワード、トークンなどは絶対にログしない
- **パフォーマンス考慮**: 高頻度処理でのログは避ける
