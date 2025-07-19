# PublicLayout使用ガイド

## 概要

`PublicLayout`は、ログイン不要でアクセス可能なパブリックページ向けの統一レイアウトコンポーネントです。LPページと即座撮影ページなど、認証前のユーザーがアクセスするページで一貫性のあるUI/UXを提供します。

## 構成要素

### PublicHeader
- ShutterHubロゴ（ホームページへのリンク）
- ナビゲーション（即座撮影、撮影会を探す）
- ダークモード切り替え
- ログインボタン

### PublicLayout
- `PublicHeader`の統一ヘッダー
- メインコンテンツエリア
- オプショナルフッター（`showFooter`プロパティで制御）

## 使用方法

### 基本的な使用方法

```tsx
import { PublicLayout } from '@/components/layout/public-layout';

export default function MyPublicPage() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <h1>パブリックページのコンテンツ</h1>
      </div>
    </PublicLayout>
  );
}
```

### フッターを非表示にする場合

```tsx
import { PublicLayout } from '@/components/layout/public-layout';

export default function MyLandingPage() {
  return (
    <PublicLayout showFooter={false}>
      <div className="min-h-screen">
        {/* フッターが不要なランディングページコンテンツ */}
      </div>
    </PublicLayout>
  );
}
```

### カスタムクラスを追加する場合

```tsx
import { PublicLayout } from '@/components/layout/public-layout';

export default function MySpecialPage() {
  return (
    <PublicLayout className="bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        {/* 特別な背景を持つページ */}
      </div>
    </PublicLayout>
  );
}
```

## 適用対象ページ

以下のページで`PublicLayout`を使用することを推奨します：

- ランディングページ（`/`）
- 即座撮影ページ（`/instant`）
- その他のパブリックページ（未ログインでアクセス可能）

## MainLayoutとの使い分け

### PublicLayout
- ログイン不要ページ
- ボトムナビゲーションなし
- シンプルなヘッダー
- オプショナルフッター

### MainLayout
- ログイン必須ページ
- ボトムナビゲーションあり
- 認証後のナビゲーション
- 常にフッターを表示

## レスポンシブ対応

`PublicHeader`はモバイル・デスクトップ両方に対応しています：

- **モバイル**: ナビゲーションは非表示（必要に応じてハンバーガーメニューを追加可能）
- **デスクトップ**: 完全なナビゲーションを表示

## スタイリング

### ヘッダー
- 固定位置（sticky top）
- 背景ブラー効果
- ダークモード対応
- 一貫性のあるブランドカラー（`#6F5091`）

### レイアウト
- `min-h-screen`でフルハイト
- Flexboxレイアウト（header、main、footer）
- メインコンテンツは`flex-1`で残りスペースを占有

## 今後の拡張

必要に応じて以下の機能を追加できます：

1. **モバイルハンバーガーメニュー**
2. **言語切り替え**
3. **パンくずナビゲーション**
4. **カスタムCTAボタン**

## 注意事項

- `InstantPhotoHeader`など、個別のヘッダーコンポーネントは`PublicLayout`導入後は不要
- 既存のページから独自ヘッダーを削除し、`PublicLayout`を使用してください
- `min-h-screen`クラスはレイアウト側で設定済みのため、子コンテンツでは不要 