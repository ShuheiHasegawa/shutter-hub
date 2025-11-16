<!-- e0886681-d901-414b-9665-abd88298f162 0776ffe5-b202-448c-ade1-e9b6428963d0 -->
# `<img>`タグのNext.js Imageコンポーネントへの置き換え計画

## 目標

すべての`<img>`タグをNext.js `Image`コンポーネントに置き換え、パフォーマンス最適化（LCP改善、帯域幅削減）を実現する。

## 現状分析

### 対象ファイル（14ファイル、合計約20箇所）

#### 本番コンポーネント（11ファイル）

1. `src/components/social/PostCard.tsx` - 2箇所（投稿画像サムネイル・ダイアログ表示）
2. `src/components/ui/image-upload-common.tsx` - 1箇所（画像プレビュー、aspect-square）
3. `src/components/ui/image-upload.tsx` - 1箇所（画像プレビュー、aspect-square）
4. `src/components/social/CreatePostForm.tsx` - 1箇所（Blob URLプレビュー、固定サイズ96x96）
5. `src/components/social/MessageAttachment.tsx` - 3箇所（メッセージ添付画像、aspect-video）
6. `src/components/photo-sessions/PhotoSessionSlotCard.tsx` - 1箇所（衣装プレビュー、ダイアログ内）
7. `src/components/social/ChatWindow.tsx` - 1箇所（メッセージ画像、動的サイズ）
8. `src/components/photo-sessions/PhotoSessionDetail.tsx` - 2箇所（撮影会画像ギャラリー、aspect-video）
9. `src/components/admin/AdminDisputeManagement.tsx` - 1箇所（証拠画像、固定高さ）
10. `src/components/instant/GuestApprovalPanel.tsx` - 1箇所（アバター画像、固定サイズ64x64）
11. `src/components/photobook/QuickPhotobookImageManager.tsx` - 1箇所（画像プレビュー、固定サイズ80x80）
12. `src/components/photobook/editor/DraggableElements.tsx` - 1箇所（ドラッグ可能な画像要素、固定サイズ96x96）

#### 開発・テスト用ファイル（2ファイル）

13. `src/app/[locale]/performance-test/page.tsx` - 4箇所（パフォーマンステスト用サンプル画像）
14. `src/app/[locale]/dev/sample.html` - 1箇所（HTMLファイル、除外対象）

## 実装ステップ

### Phase 1: 固定サイズ画像の置き換え（優先度：高）

#### 1.1 小さい固定サイズ画像（64x64, 80x80, 96x96）

- `GuestApprovalPanel.tsx` - アバター画像（64x64）
- `QuickPhotobookImageManager.tsx` - 画像プレビュー（80x80）
- `CreatePostForm.tsx` - Blob URLプレビュー（96x96）
- `DraggableElements.tsx` - ドラッグ可能な画像要素（96x96）

**置き換え方法**: `width`と`height`を明示的に指定

```tsx
<Image
  src={imageUrl}
  alt={altText}
  width={96}
  height={96}
  className="object-cover rounded-lg"
/>
```

#### 1.2 固定高さの画像

- `AdminDisputeManagement.tsx` - 証拠画像（h-32 = 128px）

**置き換え方法**: 親要素のサイズに合わせて`fill`を使用

```tsx
<div className="relative h-32 w-full">
  <Image
    src={url}
    alt={altText}
    fill
    className="object-cover rounded"
  />
</div>
```

### Phase 2: アスペクト比固定画像の置き換え（優先度：高）

#### 2.1 aspect-square（1:1）

- `image-upload-common.tsx` - 画像プレビュー
- `image-upload.tsx` - 画像プレビュー

**置き換え方法**: 親要素で`aspect-square`を維持し、`fill`を使用

```tsx
<div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
  <Image
    src={url}
    alt={altText}
    fill
    className="object-cover"
  />
</div>
```

#### 2.2 aspect-video（16:9）

- `MessageAttachment.tsx` - メッセージ添付画像（3箇所）
- `PhotoSessionDetail.tsx` - 撮影会画像ギャラリー（2箇所）

**置き換え方法**: 親要素で`aspect-video`を維持し、`fill`を使用

```tsx
<div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
  <Image
    src={image}
    alt={altText}
    fill
    className="object-cover"
  />
</div>
```

### Phase 3: 動的サイズ画像の置き換え（優先度：中）

#### 3.1 最大サイズ制限付き画像

- `PostCard.tsx` - 投稿画像サムネイル（max-h-[400px]）
- `PostCard.tsx` - ダイアログ内画像（max-h-[70vh]）
- `ChatWindow.tsx` - メッセージ画像（max-w-[280px] sm:max-w-[320px] max-h-[200px] sm:max-h-[240px]）
- `PhotoSessionSlotCard.tsx` - 衣装プレビュー（max-h-96）

**置き換え方法**: 親要素でサイズ制限を設定し、`fill`または適切な`width`/`height`を使用

```tsx
// サムネイルの場合
<div className="relative max-h-[400px] w-full">
  <Image
    src={imageUrl}
    alt={altText}
    fill
    className="object-cover rounded-lg"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
</div>

// ダイアログ内の場合
<div className="relative max-h-[70vh] w-full">
  <Image
    src={imageUrl}
    alt={altText}
    fill
    className="object-contain"
    sizes="100vw"
  />
</div>
```

### Phase 4: 特殊ケースの対応（優先度：中）

#### 4.1 Blob URL（URL.createObjectURL）

- `CreatePostForm.tsx` - ファイルプレビュー

**対応方法**: Next.js ImageはBlob URLを直接サポートしているため、通常通り`Image`コンポーネントを使用可能

```tsx
<Image
  src={URL.createObjectURL(file)}
  alt={`Preview ${index + 1}`}
  width={96}
  height={96}
  className="rounded-md object-cover"
/>
```

**注意**: Blob URLはメモリリークを防ぐため、`useEffect`のクリーンアップで`revokeObjectURL`を呼び出す必要がある（既存コードで対応済みか確認）

#### 4.2 パフォーマンステストページ

- `performance-test/page.tsx` - 4箇所のサンプル画像

**対応方法**: 固定サイズまたは`fill`を使用して置き換え

### Phase 5: 開発・テスト用ファイル（優先度：低）

#### 5.1 HTMLファイル

- `dev/sample.html` - HTMLファイルのため除外（Next.js Imageは使用不可）

## 実装時の注意事項

### 必須対応

1. **import文の追加**: 各ファイルに`import Image from 'next/image'`を追加
2. **未使用importの削除**: 既存の`Image`インポートがある場合は確認
3. **親要素の`relative`指定**: `fill`を使用する場合は親要素に`relative`クラスが必要
4. **適切な`sizes`属性**: レスポンシブ画像には`sizes`属性を設定
5. **Blob URLのクリーンアップ**: `URL.createObjectURL`使用箇所でメモリリーク防止

### パフォーマンス最適化

- `priority`属性: ビューポート内の重要な画像に設定
- `loading="lazy"`: ビューポート外の画像に設定（デフォルト）
- `sizes`属性: レスポンシブ画像に適切な値を設定

### エラーハンドリング

- 画像読み込みエラー時のフォールバック表示（必要に応じて`onError`ハンドラーを追加）

## 期待される成果

1. **パフォーマンス改善**: LCP（Largest Contentful Paint）の改善
2. **帯域幅削減**: 自動的な画像最適化（WebP/AVIF変換）
3. **レスポンシブ対応**: デバイスに応じた最適サイズ配信
4. **コード品質**: 統一された画像表示パターン
5. **ESLint警告解消**: `@next/next/no-img-element`警告の解消

## テスト計画

1. **ビジュアル回帰テスト**: 各コンポーネントで画像表示が正しく動作することを確認
2. **レスポンシブテスト**: モバイル・タブレット・デスクトップでの表示確認
3. **パフォーマンステスト**: Lighthouseスコアの改善確認
4. **Blob URLテスト**: ファイルアップロード時のプレビュー表示確認

## ドキュメント更新

- `development.mdc`の「Next.js Image最適化ルール」セクションに実装完了状況を追記

### To-dos

- [ ] 多言語化キーを追加（messages/ja.json, messages/en.json）