---
trigger: manual
description:
globs:
---

## 🏗️ **2. コンポーネント使用ルール**

### **A. 必須使用コンポーネント**

#### **画像表示**

```typescript
// ✅ 正しい使用
import { OptimizedImage, PhotobookImage, ProfileImage } from '@/components/ui/optimized-image';

// ProfileImage: プロフィール専用
<ProfileImage src={src} alt={alt} size="medium" />

// PhotobookImage: フォトブック専用（高画質対応）
<PhotobookImage src={src} alt={alt} showPrintQuality={false} />

// OptimizedImage: 汎用（カテゴリ指定必須）
<OptimizedImage src={src} alt={alt} category="photoSession" />
```

#### **遅延読み込み**

```typescript
// ✅ 大量画像表示時は必須
import { LazyGalleryGrid, InfiniteScroll } from '@/components/ui/lazy-loading';

<LazyGalleryGrid
  items={images}
  renderItem={(image) => <OptimizedImage {...image} />}
  columns={3}
/>
```

### **B. 禁止パターン**

```typescript
// ❌ 生のNext.js Imageの直接使用
import Image from 'next/image';
<Image src={src} alt={alt} />

// ❌ HTMLのimg要素使用
<img src={src} alt={alt} />

// ❌ カテゴリ未指定
<OptimizedImage src={src} alt={alt} /> // categoryが必須

// ❌ 大量画像での遅延読み込み無し
{images.map(img => <OptimizedImage key={img.id} {...img} />)}
```

---

## 💾 **3. アップロード実装ルール**

### **A. 必須使用システム**

```typescript
// ✅ 強化アップロードシステム必須使用
import { uploadEnhancedImage } from '@/lib/storage/enhanced-image-upload';

const result = await uploadEnhancedImage(file, {
  category: 'photobook', // カテゴリ必須指定
  generatePrintVersion: true, // フォトブック用は高画質版生成
  enableDeduplication: true, // 重複検出推奨
  userId: currentUser.id, // ユーザーID必須
  relatedId: photobookId, // 関連ID推奨
});
```

### **B. アップロード前チェック**

```typescript
// ✅ 必須バリデーション
import { validateImageFile } from '@/lib/image-optimization';

const validation = validateImageFile(file, category);
if (!validation.valid) {
  // エラーハンドリング必須
  throw new Error(validation.error);
}
```

### **C. 禁止パターン**

```typescript
// ❌ 直接Supabase Storage使用
await supabase.storage.from('bucket').upload(path, file);

// ❌ バリデーション省略
const result = await uploadEnhancedImage(file, options); // バリデーション無し

// ❌ エラーハンドリング省略
const result = await uploadEnhancedImage(file, options);
// result.successチェック無し
```

---

## 🎨 **4. UI/UX統一ルール**

### **A. ローディング状態**

```typescript
// ✅ 必須実装パターン
const [isLoading, setIsLoading] = useState(true);

<OptimizedImage
  src={src}
  alt={alt}
  onLoad={() => setIsLoading(false)}
  showLoadingState={true}  // Skeleton表示
/>
```

### **B. エラー状態**

```typescript
// ✅ エラー処理必須
<OptimizedImage
  src={src}
  alt={alt}
  showErrorState={true}
  errorFallback={<CustomErrorComponent />}
  onError={() => Logger.warning('Image load failed', { src })}
/>
```

### **C. アクセシビリティ**

```typescript
// ✅ alt属性必須・適切な記述
<OptimizedImage
  src={src}
  alt="ユーザー田中太郎のプロフィール写真" // 具体的で意味のある説明
/>

// ❌ 不適切なalt
<OptimizedImage src={src} alt="画像" />       // 曖昧
<OptimizedImage src={src} alt="" />          // 空（装飾画像以外）
<OptimizedImage src={src} alt={filename} />   // ファイル名
```

---

## 📊 **5. パフォーマンス要件**

### **A. 必須指標**

```yaml
画像読み込み時間:
  profile: < 500ms
  thumbnail: < 200ms
  gallery: < 1s (10枚)

圧縮率:
  minimum: 50% (元サイズ比)
  target: 70% (WebP使用時)

キャッシュヒット率:
  target: > 85%
  monitoring: 必須
```

### **B. 最適化チェックリスト**

- [ ] WebP/AVIF対応確認
- [ ] レスポンシブ画像設定
- [ ] 遅延読み込み実装
- [ ] キャッシュヘッダー設定
- [ ] 圧縮率測定・記録

---

## 🔒 **6. セキュリティ・プライバシー**

### **A. ファイルアップロード**

```typescript
// ✅ 必須セキュリティチェック
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// ファイル形式検証
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('サポートされていないファイル形式');
}

// ファイルサイズ制限
const MAX_SIZES = {
  profile: 15 * 1024 * 1024, // 15MB
  photobook: 50 * 1024 * 1024, // 50MB
  social: 10 * 1024 * 1024, // 10MB
};
```

### **B. プライバシー保護**

```typescript
// ✅ メタデータ除去必須（将来実装）
const sanitizedFile = await removeExifData(file);

// ✅ アクセス権限チェック
if (imageMetadata.user_id !== currentUser.id && !imageMetadata.is_public) {
  throw new Error('アクセス権限がありません');
}
```

---

## 📁 **7. ファイル構造ルール**

### **A. 新規画像関連ファイルの配置**

```
src/
├── lib/
│   ├── image-optimization.ts          # 画像最適化コア（変更禁止）
│   └── storage/
│       ├── enhanced-image-upload.ts   # アップロードシステム（変更禁止）
│       └── [新機能]-image-handler.ts   # 新機能は別ファイル
├── components/
│   └── ui/
│       ├── optimized-image.tsx        # 最適化画像UI（変更禁止）
│       ├── lazy-loading.tsx           # 遅延読み込み（変更禁止）
│       └── [機能名]-image-gallery.tsx  # 機能別ギャラリー
└── types/
    └── image.ts                       # 画像関連型定義統合
```

### **B. 命名規則**

```typescript
// ✅ 推奨命名パターン
// コンポーネント: [機能名]Image[種類]
ProfileImageUploader;
PhotobookImageEditor;
SocialImagePreview;

// 関数: [動作][Image][対象]
uploadProfileImage;
optimizePhotoSessionImage;
validatePhotobookImage;

// 型: [対象]Image[種類]
ProfileImageData;
PhotoSessionImageMetadata;
PhotobookImageSettings;
```

---

## 🧪 **8. テスト要件**

### **A. 必須テスト項目**

```typescript
// ✅ 画像アップロードテスト
describe('Enhanced Image Upload', () => {
  test('should upload with correct category', async () => {
    const result = await uploadEnhancedImage(file, {
      category: 'photobook',
      userId: 'test-user',
    });
    expect(result.success).toBe(true);
  });

  test('should validate file size limits', async () => {
    const largeFile = new File(
      [new ArrayBuffer(60 * 1024 * 1024)],
      'large.jpg'
    );
    const result = await uploadEnhancedImage(largeFile, {
      category: 'profile', // 15MB制限
      userId: 'test-user',
    });
    expect(result.success).toBe(false);
  });
});
```

### **B. パフォーマンステスト**

```typescript
// ✅ 必須パフォーマンス測定
test('should load images within time limits', async () => {
  const startTime = performance.now();
  // 画像読み込み処理
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(500); // 500ms以内
});
```

---

## 🚨 **9. エラーハンドリング統一**

### **A. 必須ログ記録**

```typescript
// ✅ Logger使用必須
import Logger from '@/lib/logger';

// 成功時
Logger.info('Image upload completed', {
  component: 'image-upload',
  action: 'upload-success',
  category,
  fileSize: file.size,
  userId,
});

// エラー時
Logger.error('Image upload failed', error, {
  component: 'image-upload',
  action: 'upload-failed',
  category,
  fileName: file.name,
  userId,
});
```

### **B. ユーザー向けエラーメッセージ**

```typescript
// ✅ 統一エラーメッセージ
const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'ファイルサイズが制限を超えています',
  INVALID_FORMAT: 'サポートされていないファイル形式です',
  UPLOAD_FAILED: 'アップロードに失敗しました。しばらく後に再試行してください',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  PERMISSION_DENIED: 'ファイルへのアクセス権限がありません',
};
```

---

## 📈 **10. 監視・メトリクス**

### **A. 必須監視項目**

```typescript
// ✅ 実装必須メトリクス
interface ImageMetrics {
  uploadCount: number;
  averageUploadTime: number;
  compressionRatio: number;
  cacheHitRate: number;
  errorRate: number;
  storageUsage: number;
}
```

### **B. アラート設定**

```yaml
alerts:
  error_rate: > 5%        # エラー率5%超過
  upload_time: > 10s      # アップロード時間10秒超過
  storage_usage: > 80%    # ストレージ使用率80%超過
  cache_hit_rate: < 70%   # キャッシュヒット率70%未満
```

---

## 🔄 **11. マイグレーション・更新ルール**

### **A. 既存画像の扱い**

```typescript
// ✅ 後方互換性維持必須
function migrateExistingImages(oldImageUrl: string): OptimizedImageUrls {
  return {
    web: getOptimizedImageUrl(oldImageUrl, 'web'),
    thumbnail: getOptimizedImageUrl(oldImageUrl, 'thumbnail'),
    print: oldImageUrl, // 元画像を高画質版として使用
  };
}
```

### **B. 段階的移行**

```typescript
// ✅ 新旧併用期間の考慮
function getImageUrl(
  imageId: string,
  quality: 'web' | 'print' = 'web'
): string {
  const metadata = getImageMetadata(imageId);

  // 新システム対応済み
  if (metadata?.urls) {
    return metadata.urls[quality] || metadata.urls.web;
  }

  // 旧システム（フォールバック）
  return getLegacyImageUrl(imageId);
}
```

---

## 📝 **12. レビュー・承認フロー**

### **A. 必須レビュー項目**

- [ ] カテゴリ分類の適切性
- [ ] パフォーマンス最適化の実装
- [ ] エラーハンドリングの完備
- [ ] アクセシビリティ対応
- [ ] セキュリティチェック

### **B. 承認基準**

```yaml
code_review:
  required_reviewers: 2
  performance_test: 必須
  security_check: 必須
  accessibility_test: 必須
```

---

## 🎯 **13. 将来拡張への考慮**

### **A. 拡張可能性**

```typescript
// ✅ 将来のカテゴリ追加を考慮
interface ExtensibleImageConfig {
  [category: string]: {
    web: QualityConfig;
    print?: QualityConfig;
    thumbnail: QualityConfig;
    custom?: Record<string, QualityConfig>; // 将来の品質レベル
  };
}
```

### **B. 機能追加ガイドライン**

1. **新カテゴリ追加**: 品質設定・テスト・ドキュメント更新必須
2. **新品質レベル**: 既存レベルとの互換性確保
3. **新最適化手法**: パフォーマンス比較・段階的導入

---

## ⚠️ **重要な注意事項**

### **🚫 絶対禁止**

1. **core filesの直接変更**

   - `image-optimization.ts`
   - `enhanced-image-upload.ts`
   - `optimized-image.tsx`
   - `lazy-loading.tsx`

2. **設定値の任意変更**

   - 品質設定の独断変更
   - ファイルサイズ制限の緩和
   - キャッシュ戦略の変更

3. **セキュリティ機能の省略**
   - ファイル形式チェック
   - サイズ制限チェック
   - アクセス権限確認

### **📞 相談必須事項**

- 新しい画像カテゴリの追加
- パフォーマンス設定の変更
- セキュリティ要件の変更
- 大幅なアーキテクチャ変更

---

## 📚 **参考リソース**

### **内部ドキュメント**

- `/docs/ui-implementation.md`
- `/docs/user-storage-design.md`
- `.cursor/rules/dev-rules/development.mdc`

### **実装例**

- `/src/app/[locale]/performance-test/page.tsx`
- `/src/components/photobook/SinglePhoto.tsx`
- `/src/lib/storage/photo-session-images.ts`

### **テスト例**

- 新規実装時は performance-test ページで動作確認
- 既存機能への影響確認必須

---

**このルールへの準拠は必須です。違反時は実装修正を求めます。**
**不明点は必ず相談してから実装してください。**
