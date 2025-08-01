# 画像実装統一ガイド

**最終更新**: 2024年12月1日  
**対象**: ShutterHub v2 開発者全員  

## 📋 概要

このガイドは、ShutterHub v2における画像関連実装の**統一性・パフォーマンス・保守性**を確保するための実践的な手引きです。フォトブック機能を含む全ての画像処理で一貫した品質と効率を維持します。

---

## 🚀 クイックスタート

### 基本の画像表示

```typescript
import { OptimizedImage } from '@/components/ui/optimized-image';

// 基本的な使用
<OptimizedImage
  src="/path/to/image.jpg"
  alt="説明文"
  category="photoSession"  // 必須！
  width={800}
  height={600}
/>
```

### フォトブック用高画質画像

```typescript
import { PhotobookImage } from '@/components/ui/optimized-image';

<PhotobookImage
  src={imageUrl}
  alt="フォトブック画像"
  showPrintQuality={false}  // Web表示時はfalse
  width={800}
  height={600}
/>
```

### 大量画像の遅延読み込み

```typescript
import { LazyGalleryGrid } from '@/components/ui/lazy-loading';

<LazyGalleryGrid
  items={images}
  renderItem={(image) => (
    <OptimizedImage
      src={image.src}
      alt={image.alt}
      category="photoSession"
    />
  )}
  columns={3}
/>
```

### 画像アップロード

```typescript
import { uploadEnhancedImage } from '@/lib/storage/enhanced-image-upload';

const handleUpload = async (file: File) => {
  const result = await uploadEnhancedImage(file, {
    category: 'photobook',
    generatePrintVersion: true,
    enableDeduplication: true,
    userId: currentUser.id
  });
  
  if (result.success) {
    console.log('Uploaded URLs:', result.urls);
  }
};
```

---

## 📊 カテゴリ別実装ガイド

### 1. プロフィール画像 (`profile`)

```typescript
import { ProfileImage } from '@/components/ui/optimized-image';

// 推奨実装
<ProfileImage
  src={user.avatar_url}
  alt={`${user.display_name}のプロフィール画像`}
  size="medium"  // small | medium | large
  className="rounded-full"
/>

// 制限事項
- 最大ファイルサイズ: 15MB
- 推奨解像度: 800x600px (Web), 2048x1536px (高画質)
- フォーマット: WebP優先、JPGフォールバック
```

### 2. 撮影会画像 (`photoSession`)

```typescript
import { GalleryImage } from '@/components/ui/optimized-image';

// ギャラリー表示
<GalleryImage
  src={photo.url}
  alt={`撮影会${session.title}の写真`}
  aspectRatio="portrait"  // square | portrait | landscape | auto
  className="hover:scale-105 transition-transform"
/>

// 制限事項
- 最大ファイルサイズ: 25MB
- 推奨解像度: 1200x900px (Web), 4096x3072px (高画質)
- フォーマット: WebP優先
```

### 3. フォトブック画像 (`photobook`)

```typescript
import { PhotobookImage } from '@/components/ui/optimized-image';

// 編集画面（Web品質）
<PhotobookImage
  src={photo.url}
  alt="フォトブック画像"
  showPrintQuality={false}
  width={600}
  height={400}
/>

// プレビュー（印刷品質）
<PhotobookImage
  src={photo.url}
  alt="フォトブック印刷プレビュー"
  showPrintQuality={true}
  priority={true}
/>

// 制限事項
- 最大ファイルサイズ: 50MB（高画質対応）
- 推奨解像度: 1920x1440px (Web), 6000x4500px (印刷用)
- DPI: 300dpi（印刷品質）
- フォーマット: WebP (Web), JPG (印刷)
```

### 4. SNS投稿画像 (`social`)

```typescript
import { SocialImage } from '@/components/ui/optimized-image';

<SocialImage
  src={post.image_url}
  alt={post.description}
  width={400}
  height={400}
  className="rounded-lg"
/>

// 制限事項
- 最大ファイルサイズ: 10MB
- 推奨解像度: 1080x1080px (Web), 2160x2160px (高画質)
- アスペクト比: 正方形推奨
```

---

## ⚡ パフォーマンス最適化

### 遅延読み込み戦略

```typescript
import { LazyLoad, InfiniteScroll } from '@/components/ui/lazy-loading';

// 単一画像の遅延読み込み
<LazyLoad threshold={0.1} rootMargin="50px">
  <OptimizedImage src={src} alt={alt} category="photoSession" />
</LazyLoad>

// 無限スクロール
<InfiniteScroll
  hasMore={hasMoreImages}
  loadMore={loadMoreImages}
  loading={isLoading}
>
  {images.map(image => (
    <OptimizedImage key={image.id} {...image} />
  ))}
</InfiniteScroll>

// プログレッシブローディング
import { useProgressiveLoading } from '@/components/ui/lazy-loading';

const { visibleItems, hasMore, reset } = useProgressiveLoading(
  allImages,
  10,  // バッチサイズ
  200  // 遅延（ms）
);
```

### キャッシュ戦略

```typescript
// Next.js Image設定（next.config.ts）
export default {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,  // 1年キャッシュ
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  async headers() {
    return [
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  }
};
```

---

## 🔧 エラーハンドリング

### 基本的なエラー処理

```typescript
import { OptimizedImage } from '@/components/ui/optimized-image';
import Logger from '@/lib/logger';

<OptimizedImage
  src={imageUrl}
  alt="画像"
  category="photoSession"
  showErrorState={true}
  onError={() => {
    Logger.warning('Image load failed', {
      component: 'gallery',
      action: 'image-load-error',
      src: imageUrl
    });
  }}
  errorFallback={
    <div className="flex items-center justify-center bg-gray-100 h-48">
      <span className="text-gray-500">画像を読み込めませんでした</span>
    </div>
  }
/>
```

### アップロードエラー処理

```typescript
import { uploadEnhancedImage } from '@/lib/storage/enhanced-image-upload';
import { validateImageFile } from '@/lib/image-optimization';
import { IMAGE_ERROR_MESSAGES } from '@/types/image';

const handleFileUpload = async (file: File) => {
  try {
    // バリデーション
    const validation = validateImageFile(file, 'photobook');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // アップロード
    const result = await uploadEnhancedImage(file, {
      category: 'photobook',
      generatePrintVersion: true,
      enableDeduplication: true,
      userId: currentUser.id
    });

    if (!result.success) {
      throw new Error(result.error || IMAGE_ERROR_MESSAGES.UPLOAD_FAILED);
    }

    // 成功処理
    Logger.info('Image upload successful', {
      component: 'upload',
      action: 'upload-success',
      metadata: result.metadata
    });

    return result.urls;

  } catch (error) {
    Logger.error('Image upload failed', error as Error, {
      component: 'upload',
      action: 'upload-failed',
      fileName: file.name,
      fileSize: file.size
    });

    // ユーザーフレンドリーなエラー表示
    const errorMessage = error instanceof Error 
      ? error.message 
      : IMAGE_ERROR_MESSAGES.UPLOAD_FAILED;
    
    setError(errorMessage);
  }
};
```

---

## 🧪 テスト実装

### コンポーネントテスト

```typescript
// __tests__/components/OptimizedImage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { OptimizedImage } from '@/components/ui/optimized-image';

describe('OptimizedImage', () => {
  test('should render with correct category', () => {
    render(
      <OptimizedImage
        src="/test-image.jpg"
        alt="Test image"
        category="photoSession"
        width={800}
        height={600}
      />
    );

    const image = screen.getByAltText('Test image');
    expect(image).toBeInTheDocument();
  });

  test('should handle loading states', async () => {
    const onLoad = jest.fn();
    
    render(
      <OptimizedImage
        src="/test-image.jpg"
        alt="Test image"
        category="profile"
        onLoad={onLoad}
        showLoadingState={true}
      />
    );

    // ローディング状態を確認
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

    // 画像読み込み完了を待機
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });
});
```

### アップロードテスト

```typescript
// __tests__/lib/enhanced-image-upload.test.ts
import { uploadEnhancedImage } from '@/lib/storage/enhanced-image-upload';

describe('Enhanced Image Upload', () => {
  test('should upload with correct category', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await uploadEnhancedImage(file, {
      category: 'photobook',
      generatePrintVersion: true,
      enableDeduplication: true,
      userId: 'test-user'
    });

    expect(result.success).toBe(true);
    expect(result.urls?.web).toBeDefined();
    expect(result.urls?.print).toBeDefined();
    expect(result.urls?.thumbnail).toBeDefined();
  });

  test('should validate file size limits', async () => {
    // 60MBの大きなファイル（photobook: 50MB制限）
    const largeFile = new File(
      [new ArrayBuffer(60 * 1024 * 1024)], 
      'large.jpg',
      { type: 'image/jpeg' }
    );
    
    const result = await uploadEnhancedImage(largeFile, {
      category: 'photobook',
      userId: 'test-user'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ファイルサイズが');
  });
});
```

---

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. 画像が表示されない

```typescript
// ❌ 問題のあるコード
<OptimizedImage src={imageUrl} alt="画像" />  // categoryが未指定

// ✅ 修正版
<OptimizedImage 
  src={imageUrl} 
  alt="画像" 
  category="photoSession"  // 必須指定
/>
```

#### 2. 遅延読み込みが動作しない

```typescript
// ❌ 問題のあるコード
{images.map(img => <OptimizedImage key={img.id} {...img} />)}

// ✅ 修正版
<LazyGalleryGrid
  items={images}
  renderItem={(img) => <OptimizedImage key={img.id} {...img} />}
/>
```

#### 3. アップロードが失敗する

```typescript
// ✅ 適切なエラーハンドリング
const result = await uploadEnhancedImage(file, options);

if (!result.success) {
  console.error('Upload failed:', result.error);
  // エラー状態を適切に処理
  setError(result.error);
  return;
}

// 成功時の処理
setImageUrls(result.urls);
```

#### 4. パフォーマンスが悪い

```typescript
// ✅ パフォーマンス改善チェックリスト
1. 適切なカテゴリ指定 ✓
2. 遅延読み込み実装 ✓
3. 適切な画像サイズ ✓
4. WebP/AVIF対応 ✓
5. キャッシュ設定 ✓

// パフォーマンステストページで確認
http://localhost:8888/ja/performance-test
```

### デバッグツール

```typescript
// 画像最適化のデバッグ
import { 
  getOptimizedImageUrl, 
  calculateCompressionRatio 
} from '@/lib/image-optimization';

// URL生成の確認
const webUrl = getOptimizedImageUrl(originalUrl, 'web', 'photobook');
console.log('Optimized URL:', webUrl);

// 圧縮率の確認
const ratio = calculateCompressionRatio(originalSize, compressedSize);
console.log('Compression ratio:', ratio, '%');
```

---

## 📈 監視・メトリクス

### パフォーマンス監視

```typescript
// 画像読み込み時間の測定
const startTime = performance.now();

<OptimizedImage
  src={imageUrl}
  alt="画像"
  category="photoSession"
  onLoad={() => {
    const loadTime = performance.now() - startTime;
    Logger.info('Image load completed', {
      component: 'gallery',
      action: 'image-loaded',
      loadTime,
      src: imageUrl
    });
  }}
/>
```

### Lighthouse スコア監視

```yaml
# パフォーマンス目標
Performance: > 90
Accessibility: > 95
Best Practices: > 95
SEO: > 95

# Core Web Vitals
LCP: < 2.5s
FID: < 100ms
CLS: < 0.1
```

---

## 🔮 将来の拡張

### 新カテゴリ追加

```typescript
// 1. 型定義更新
export type ImageCategory = 
  | 'profile'
  | 'photoSession'
  | 'photobook'
  | 'social'
  | 'portfolio'  // 新カテゴリ追加

// 2. 品質設定追加
export const IMAGE_QUALITY_CONFIGS = {
  // ... 既存設定
  portfolio: {
    web: { quality: 90, maxWidth: 1600, format: 'webp' },
    print: { quality: 100, maxWidth: 4000, format: 'jpg' },
    thumbnail: { quality: 80, width: 400, height: 300, format: 'webp' }
  }
};

// 3. ファイルサイズ制限追加
export const MAX_FILE_SIZES = {
  // ... 既存制限
  portfolio: 30 * 1024 * 1024  // 30MB
};
```

### AI機能統合予定

```typescript
// 将来実装予定の機能
interface AIImageFeatures {
  autoTagging: boolean;        // 自動タグ付け
  contentAnalysis: boolean;    // コンテンツ分析
  qualityAssessment: boolean;  // 品質評価
  smartCropping: boolean;      // スマート切り抜き
}
```

---

## 📚 関連ドキュメント

- **詳細ルール**: `.cursor/rules/dev-rules/image-implementation-rules.mdc`
- **開発ルール**: `.cursor/rules/dev-rules/development.mdc`
- **型定義**: `src/types/image.ts`
- **実装例**: `src/app/[locale]/performance-test/page.tsx`

---

**このガイドに従って実装することで、ShutterHub v2の画像システムの品質と一貫性が保たれます。不明点は必ず相談してください。**