# ユーザーストレージ設計

## 概要

ShutterHub v2では、ユーザー別の画像・ファイル管理のため、統一されたストレージ構造を採用しています。

## バケット構成

### `user-storage` バケット

**設定:**
- **容量制限**: 10MB（ポートフォリオ機能に対応）
- **ファイル形式**: JPEG, PNG, WebP
- **公開設定**: パブリック読み取り可能
- **アクセス制御**: ユーザー別のRLSポリシー

## ディレクトリ構造

```
user-storage/
├── [userId]/
│   ├── profile/
│   │   ├── avatar.jpg          # プロフィール画像
│   │   └── cover.jpg           # カバー画像（将来実装）
│   ├── portfolio/
│   │   ├── image-001.jpg       # ポートフォリオ画像1
│   │   ├── image-002.jpg       # ポートフォリオ画像2
│   │   └── [custom-name].jpg   # カスタム名の画像
│   └── session-photos/         # 撮影会写真（将来実装）
│       ├── [sessionId]/
│       │   ├── original/       # オリジナル画像
│       │   └── processed/      # 処理済み画像
│       └── ...
└── [anotherUserId]/
    └── ...
```

## パス命名規則

### プロフィール画像
- **パス**: `[userId]/profile/avatar.[ext]`
- **例**: `user123/profile/avatar.jpg`
- **特徴**: 固定ファイル名で上書き更新

### ポートフォリオ画像
- **パス**: `[userId]/portfolio/[imageName].[ext]`
- **例**: `user123/portfolio/image-001.jpg`
- **特徴**: 複数ファイル、カスタム名対応

### 撮影会写真（将来実装）
- **パス**: `[userId]/session-photos/[sessionId]/[type]/[fileName].[ext]`
- **例**: `user123/session-photos/session456/original/photo001.jpg`

## セキュリティポリシー

### RLS（Row Level Security）設定

```sql
-- 読み取り：全ユーザーが公開画像を閲覧可能
CREATE POLICY "Public read access for user storage" ON storage.objects
FOR SELECT USING (bucket_id = 'user-storage');

-- 作成：ユーザーは自分のディレクトリのみ作成可能
CREATE POLICY "Users can upload to their own storage" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-storage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 更新・削除：ユーザーは自分のファイルのみ操作可能
CREATE POLICY "Users can update their own storage" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-storage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own storage" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-storage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## API実装

### プロフィール画像

```typescript
// アップロード
uploadProfileImage(file: File, userId: string)

// 削除
deleteProfileImage(userId: string)

// バリデーション
validateProfileImageFile(file: File)
```

### ポートフォリオ画像（将来実装）

```typescript
// アップロード
uploadPortfolioImage(file: File, userId: string, imageName?: string)

// 一覧取得
getPortfolioImages(userId: string)

// 削除
deletePortfolioImage(userId: string, imageName: string)
```

## 利点

### 1. 拡張性
- ポートフォリオ機能への対応が容易
- 撮影会写真管理への拡張可能
- ユーザー別の容量制限設定が可能

### 2. 管理性
- ユーザー毎に整理されたファイル構造
- 用途別のディレクトリ分離
- 一括削除・移行の容易さ

### 3. セキュリティ
- 明確なアクセス制御
- ユーザー別の権限分離
- プライバシー保護

### 4. パフォーマンス
- 用途別ファイル分離によるクエリ最適化
- CDN活用による高速配信
- 適切なキャッシュ戦略

## 移行計画

### Phase 1: プロフィール画像（現在）
- [x] `user-storage`バケット作成
- [x] プロフィール画像アップロード機能
- [x] 新ディレクトリ構造対応

### Phase 2: ポートフォリオ機能
- [ ] ポートフォリオ画像アップロード
- [ ] 画像管理UI
- [ ] 画像編集・並び替え機能

### Phase 3: 撮影会写真管理
- [ ] 撮影会写真アップロード
- [ ] 写真承認システム
- [ ] 自動処理パイプライン

## 将来の拡張予定

1. **画像自動最適化**: WebP変換、リサイズ
2. **CDN統合**: より高速な画像配信
3. **容量分析**: ユーザー別使用量監視
4. **自動バックアップ**: 重要データの保護
5. **AI画像解析**: コンテンツフィルタリング 