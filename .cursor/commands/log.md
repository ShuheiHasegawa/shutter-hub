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
```typescript
logger.info('フォトブック作成開始', { userId, title });
logger.info('画像アップロード完了', { imageCount: 5 });
logger.info('保存処理成功', { photobookId });
```

### logger.warn()
- **用途**: 警告レベルの問題、回復可能なエラー
- **タイミング**: データ不整合、代替処理実行、非致命的エラー
```typescript
logger.warn('画像順番更新失敗', {
  imageId,
  error: imageError,
  fallback: 'スキップして続行'
});
```

### logger.error()
- **用途**: エラー、例外、失敗処理
- **タイミング**: catch文、致命的エラー、ユーザーに影響する問題
```typescript
logger.error('フォトブック保存失敗', {
  error,
  photobookId,
  userId,
  context: 'handleSave'
});
```

## 重要な箇所でのログ追加ルール

### 1. Server Actions
```typescript
export async function createPhotobook(userId: string, data: PhotobookFormData) {
  // 開始ログ
  logger.info('フォトブック作成開始', { userId, photobookType: data.photobook_type });
  
  try {
    // 処理中ログ
    logger.info('プラン制限チェック完了', { allowed: limitCheck.allowed });
    
    // DB操作前
    logger.info('DB挿入開始', { title: data.title });
    
    // 成功ログ
    logger.info('フォトブック作成成功', { photobookId: photobook.id });
    
    return { success: true, photobookId: photobook.id };
  } catch (error) {
    // エラーログ
    logger.error('フォトブック作成失敗', { error, userId, data });
    return { success: false, error };
  }
}
```

### 2. 状態変更を伴う処理
```typescript
const handleOrderChange = useCallback((newOrderedImages: PhotobookImage[]) => {
  logger.info('画像順番変更', {
    oldCount: reorderedImages.length,
    newCount: newOrderedImages.length,
    hasChanges: true
  });
  
  setHasOrderChanges(true);
  setReorderedImages(newOrderedImages);
}, []);
```

### 3. 非同期処理・API呼び出し
```typescript
const handleUpload = async (files: File[]) => {
  logger.info('画像アップロード開始', { fileCount: files.length });
  
  try {
    for (const file of files) {
      logger.info('ファイル処理開始', { fileName: file.name, size: file.size });
      
      const result = await uploadImage(file);
      
      if (result.success) {
        logger.info('ファイルアップロード成功', { fileName: file.name, imageId: result.imageId });
      } else {
        logger.warn('ファイルアップロード失敗', { fileName: file.name, error: result.error });
      }
    }
  } catch (error) {
    logger.error('アップロード処理エラー', { error, fileCount: files.length });
  }
};
```

### 4. 条件分岐の重要な箇所
```typescript
if (hasOrderChanges && reorderedImages.length > 0) {
  logger.info('画像順番保存実行', {
    imageCount: reorderedImages.length,
    firstImage: reorderedImages[0]?.id
  });
  
  const result = await reorderPhotobookImages(photobookId, userId, reorderData);
  
  if (result.success) {
    logger.info('画像順番保存成功');
  } else {
    logger.error('画像順番保存失敗', { error: result.error });
  }
}
```

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

// 無意味なログ
logger.info('変数設定', { value: 'test' }); // ❌ 価値のない情報
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

// 有意味な情報
logger.info('重要な状態変化', {
  before: oldState,
  after: newState,
  trigger: 'userAction'
}); // ✅
```

## パフォーマンス考慮事項

### 高頻度処理でのログ
```typescript
// ❌ 避ける：高頻度でのログ
onMouseMove={() => {
  logger.info('マウス移動', { x, y }); // パフォーマンス悪化
}}

// ✅ 推奨：重要な瞬間のみ
onDragEnd={() => {
  logger.info('ドラッグ完了', { oldIndex, newIndex }); // 適切
}}
```

### 大量データのログ
```typescript
// ❌ 避ける：大量データの直接ログ
logger.info('全画像データ', { allImages }); // メモリ使用量大

// ✅ 推奨：要約情報のログ
logger.info('画像データ処理', { 
  imageCount: allImages.length,
  totalSize: allImages.reduce((sum, img) => sum + img.size, 0)
}); // 効率的
```

## 使用例

### 複雑な保存処理のログ追加
```typescript
const handleSave = async () => {
  logger.info('統合保存処理開始', {
    hasOrderChanges,
    hasCoverChanges,
    hasBasicChanges: form.formState.isDirty
  });

  try {
    // 各ステップでログ
    if (hasCoverChanges) {
      logger.info('表紙変更処理', { newCoverId: pendingCoverImageId });
    }
    
    if (hasOrderChanges) {
      logger.info('順番変更処理', { imageCount: reorderedImages.length });
    }

    const result = await savePhotobookChanges(photobookId, userId, saveData);
    
    logger.info('統合保存結果', { success: result.success });
    
  } catch (error) {
    logger.error('統合保存エラー', { error, photobookId, userId });
  }
};
```

## 注意事項

- **必ずクラス化Loggerを使用**: `import { logger } from '@/lib/utils/logger';`
- **適切なログレベル選択**: info/warn/error の使い分け
- **構造化ログ**: オブジェクト形式での詳細情報記録
- **機密情報の除外**: パスワード、トークンなどは絶対にログしない
- **パフォーマンス考慮**: 高頻度処理でのログは避ける

このルールに従って、効果的なデバッグログを追加してください。
