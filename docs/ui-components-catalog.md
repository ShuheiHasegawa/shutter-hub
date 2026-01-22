# UIコンポーネントカタログ

このドキュメントは、`src/components/ui/`配下の共通UIコンポーネントの一覧と用途をまとめたものです。

新しいUI要素を実装する前に、このカタログを確認して既存コンポーネントの活用を検討してください。

---

## レイアウト・装飾

### LeftLineSection
- **用途**: セクション区切り、ナビゲーション的な区切り
- **特徴**: 細いライン（0.5px）、ブランドカラー、ホバー効果付き
- **使用例**: フィルターサイドバー、設定画面のセクション
- **ファイル**: `src/components/ui/left-line-section.tsx`
- **バリアント**: `LeftLineSectionWithIcon`, `ColoredLeftLineSection`

### StatItem
- **用途**: 統計情報の表示（参加者数、料金など）
- **特徴**: 太いボーダー（4px）、グレー系、バリアント対応
- **使用例**: スロット情報、ダッシュボード統計
- **ファイル**: `src/components/ui/stat-item.tsx`
- **バリアント**: `default`, `primary`, `success`, `warning`, `error`

### Card
- **用途**: コンテンツのカード表示
- **特徴**: Shadcn/uiベース、ヘッダー・コンテンツ・フッター対応
- **使用例**: 撮影会カード、設定パネル
- **ファイル**: `src/components/ui/card.tsx`

### InfoCard
- **用途**: 情報表示用のカード
- **特徴**: アイコン・タイトル・説明文対応
- **使用例**: ダッシュボードの情報カード
- **ファイル**: `src/components/ui/info-card.tsx`

---

## データ表示

### FormattedDateTime
- **用途**: 日時の多言語化表示
- **特徴**: 複数のフォーマット対応、タイムゾーン対応
- **使用例**: イベント日時、投稿日時
- **ファイル**: `src/components/ui/formatted-display.tsx`
- **フォーマット**: `date-short`, `date-long`, `time`, `datetime-short`, `datetime-long`, `date-only`, `time-range`, `relative`, `weekday`

### FormattedPrice
- **用途**: 価格の多言語化表示
- **特徴**: 通貨記号、単位、範囲表示対応
- **使用例**: 料金表示、決済金額
- **ファイル**: `src/components/ui/formatted-display.tsx`
- **フォーマット**: `simple`, `with-unit`, `range`, `breakdown`

### EmptyState
- **用途**: 空状態の表示
- **特徴**: アイコン・タイトル・説明・アクションボタン対応
- **使用例**: 検索結果なし、リストが空の場合
- **ファイル**: `src/components/ui/empty-state.tsx`

### EmptyImage
- **用途**: 画像がない場合のフォールバック表示
- **特徴**: アイコン + グラデーション背景
- **使用例**: プロフィール画像、撮影会画像
- **ファイル**: `src/components/ui/empty-image.tsx`

### LoadingState
- **用途**: ローディング状態の表示
- **特徴**: スピナー・メッセージ対応
- **使用例**: データ取得中、処理実行中
- **ファイル**: `src/components/ui/loading-state.tsx`

### LoadingCard
- **用途**: カード形式のローディング表示
- **特徴**: スケルトンローダー
- **使用例**: リスト読み込み中
- **ファイル**: `src/components/ui/loading-card.tsx`

### Skeleton
- **用途**: コンテンツ読み込み中のプレースホルダー
- **特徴**: Shadcn/uiベース
- **使用例**: テキスト・画像の読み込み中
- **ファイル**: `src/components/ui/skeleton.tsx`

---

## 画像関連

### ImageLightbox
- **用途**: 画像の拡大表示（ライトボックス）
- **特徴**: 全画面表示、背景クリックで閉じる
- **使用例**: 撮影会画像、プロフィール画像の拡大
- **ファイル**: `src/components/ui/image-lightbox.tsx`

### ImageUpload
- **用途**: 画像アップロード機能
- **特徴**: ドラッグ&ドロップ、プレビュー、複数画像対応
- **使用例**: 撮影会画像のアップロード
- **ファイル**: `src/components/ui/image-upload.tsx`

### ImageUploadCommon
- **用途**: 共通的な画像アップロード機能
- **特徴**: シンプルなアップロードUI、単一/複数画像対応
- **使用例**: スロット画像、プロフィール画像
- **ファイル**: `src/components/ui/image-upload-common.tsx`

### OptimizedImage
- **用途**: 最適化された画像表示
- **特徴**: Next.js Image最適化、遅延読み込み
- **使用例**: パフォーマンス重視の画像表示
- **ファイル**: `src/components/ui/optimized-image.tsx`

---

## フォーム要素

### Button
- **用途**: ボタン
- **特徴**: Shadcn/uiベース、複数のバリアント・サイズ
- **使用例**: 送信ボタン、アクションボタン
- **ファイル**: `src/components/ui/button.tsx`

### Input
- **用途**: テキスト入力
- **特徴**: Shadcn/uiベース、バリデーション対応
- **使用例**: 名前、メールアドレス入力
- **ファイル**: `src/components/ui/input.tsx`

### Textarea
- **用途**: 複数行テキスト入力
- **特徴**: Shadcn/uiベース
- **使用例**: 説明文、コメント入力
- **ファイル**: `src/components/ui/textarea.tsx`

### Select
- **用途**: セレクトボックス
- **特徴**: Shadcn/uiベース、検索対応
- **使用例**: 都道府県選択、カテゴリ選択
- **ファイル**: `src/components/ui/select.tsx`

### MultiSelect
- **用途**: 複数選択
- **特徴**: タグ表示、検索対応
- **使用例**: タグ選択、複数カテゴリ選択
- **ファイル**: `src/components/ui/multi-select.tsx`

### Checkbox
- **用途**: チェックボックス
- **特徴**: Shadcn/uiベース
- **使用例**: 同意確認、オプション選択
- **ファイル**: `src/components/ui/checkbox.tsx`

### RadioGroup
- **用途**: ラジオボタングループ
- **特徴**: Shadcn/uiベース
- **使用例**: 単一選択、予約方式選択
- **ファイル**: `src/components/ui/radio-group.tsx`

### Switch
- **用途**: トグルスイッチ
- **特徴**: Shadcn/uiベース
- **使用例**: 設定のON/OFF
- **ファイル**: `src/components/ui/switch.tsx`

### Toggle
- **用途**: トグルボタン
- **特徴**: Shadcn/uiベース
- **使用例**: 表示切り替え
- **ファイル**: `src/components/ui/toggle.tsx`

### Slider
- **用途**: スライダー
- **特徴**: Shadcn/uiベース、範囲選択対応
- **使用例**: 価格範囲、日付範囲
- **ファイル**: `src/components/ui/slider.tsx`

### PriceInput
- **用途**: 価格入力
- **特徴**: 通貨記号、バリデーション対応
- **使用例**: 料金設定
- **ファイル**: `src/components/ui/price-input.tsx`

### PrefectureSelect
- **用途**: 都道府県選択
- **特徴**: 都道府県リスト、検索対応
- **使用例**: 住所入力、地域フィルター
- **ファイル**: `src/components/ui/prefecture-select.tsx`

### Form
- **用途**: フォーム管理
- **特徴**: React Hook Form統合、バリデーション対応
- **使用例**: 複雑なフォーム
- **ファイル**: `src/components/ui/form.tsx`

---

## ナビゲーション

### NavLink
- **用途**: ナビゲーションリンク
- **特徴**: アクティブ状態、バリアント対応
- **使用例**: サイドバー、タブナビゲーション
- **ファイル**: `src/components/ui/nav-link.tsx`

### BackButton
- **用途**: 戻るボタン
- **特徴**: ブラウザ履歴対応
- **使用例**: 詳細ページから一覧へ戻る
- **ファイル**: `src/components/ui/back-button.tsx`

### ActionBar
- **用途**: 固定フッターアクションバー
- **特徴**: モバイル最適化、複数ボタン対応
- **使用例**: 予約ボタン、送信ボタン
- **ファイル**: `src/components/ui/action-bar.tsx`

### ActionSheet
- **用途**: モバイル用アクションシート
- **特徴**: 下部からスライド、複数アクション対応
- **使用例**: モバイルでのアクションメニュー
- **ファイル**: `src/components/ui/action-sheet.tsx`

---

## ダイアログ・モーダル

### Dialog
- **用途**: ダイアログ表示
- **特徴**: Shadcn/uiベース、モーダル対応
- **使用例**: 確認ダイアログ、フォーム入力
- **ファイル**: `src/components/ui/dialog.tsx`

### AlertDialog
- **用途**: アラートダイアログ
- **特徴**: Shadcn/uiベース、確認・キャンセル対応
- **使用例**: 削除確認、重要な操作確認
- **ファイル**: `src/components/ui/alert-dialog.tsx`

### Sheet
- **用途**: サイドシート
- **特徴**: Shadcn/uiベース、左右上下対応
- **使用例**: モバイルメニュー、設定パネル
- **ファイル**: `src/components/ui/sheet.tsx`

### Popover
- **用途**: ポップオーバー
- **特徴**: Shadcn/uiベース、位置調整対応
- **使用例**: ツールチップ、詳細情報表示
- **ファイル**: `src/components/ui/popover.tsx`

### Alert
- **用途**: アラート表示
- **特徴**: Shadcn/uiベース、バリアント対応
- **使用例**: エラーメッセージ、成功メッセージ
- **ファイル**: `src/components/ui/alert.tsx`

---

## フィードバック

### Toast
- **用途**: トースト通知
- **特徴**: Shadcn/uiベース、自動非表示
- **使用例**: 操作成功・失敗の通知
- **ファイル**: `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx`

### Progress
- **用途**: プログレスバー
- **特徴**: Shadcn/uiベース、パーセンテージ表示
- **使用例**: アップロード進捗、読み込み進捗
- **ファイル**: `src/components/ui/progress.tsx`

---

## ユーザー関連

### UserProfileDisplay
- **用途**: ユーザープロフィール表示
- **特徴**: アバター・名前・認証バッジ対応
- **使用例**: 投稿者情報、主催者情報
- **ファイル**: `src/components/ui/user-profile-display.tsx`

### Avatar
- **用途**: アバター表示
- **特徴**: Shadcn/uiベース、フォールバック対応
- **使用例**: ユーザーアイコン
- **ファイル**: `src/components/ui/avatar.tsx`

### StarRating
- **用途**: 星評価表示・入力
- **特徴**: 5段階評価、読み取り専用・編集可能対応
- **使用例**: レビュー評価、撮影会評価
- **ファイル**: `src/components/ui/star-rating.tsx`

### FavoriteHeartButton
- **用途**: お気に入りボタン
- **特徴**: ハートアイコン、アニメーション
- **使用例**: 撮影会のお気に入り
- **ファイル**: `src/components/ui/favorite-heart-button.tsx`

---

## バッジ・ラベル

### Badge
- **用途**: バッジ表示
- **特徴**: Shadcn/uiベース、複数のバリアント
- **使用例**: ステータス表示、タグ表示
- **ファイル**: `src/components/ui/badge.tsx`

### SlotNumberBadge
- **用途**: スロット番号バッジ
- **特徴**: 撮影枠番号専用
- **使用例**: 撮影枠の識別
- **ファイル**: `src/components/ui/slot-number-badge.tsx`

---

## その他

### ClickableText
- **用途**: クリック可能なテキスト
- **特徴**: リンク風のスタイル、アクセシビリティ対応
- **使用例**: 詳細を見る、もっと見る
- **ファイル**: `src/components/ui/clickable-text.tsx`

### ScrollToTopButton
- **用途**: ページトップへ戻るボタン
- **特徴**: スクロール位置に応じて表示/非表示
- **使用例**: 長いページのナビゲーション
- **ファイル**: `src/components/ui/scroll-to-top-button.tsx`

### MobileFloatButtons
- **用途**: モバイル用フローティングボタン
- **特徴**: 画面下部固定、複数ボタン対応
- **使用例**: モバイルでの主要アクション
- **ファイル**: `src/components/ui/mobile-float-buttons.tsx`

### StickyHeader
- **用途**: 固定ヘッダー
- **特徴**: スクロール時に固定、透明度調整
- **使用例**: ページヘッダー
- **ファイル**: `src/components/ui/sticky-header.tsx`

### LazyLoading
- **用途**: 遅延読み込み
- **特徴**: Intersection Observer使用
- **使用例**: 画像・コンテンツの遅延読み込み
- **ファイル**: `src/components/ui/lazy-loading.tsx`

### MapPicker
- **用途**: 地図上での位置選択
- **特徴**: Google Maps統合
- **使用例**: 撮影会の場所選択
- **ファイル**: `src/components/ui/map-picker.tsx`

### ThemeToggle
- **用途**: テーマ切り替え（ライト/ダーク）
- **特徴**: next-themes統合
- **使用例**: 設定画面、ヘッダー
- **ファイル**: `src/components/ui/theme-toggle.tsx`

### LanguageToggle
- **用途**: 言語切り替え
- **特徴**: next-intl統合
- **使用例**: ヘッダー、設定画面
- **ファイル**: `src/components/ui/language-toggle.tsx`

### LayoutToggle
- **用途**: レイアウト切り替え
- **特徴**: グリッド/リスト表示切り替え
- **使用例**: 一覧画面の表示切り替え
- **ファイル**: `src/components/ui/layout-toggle.tsx`

---

## 使い分けガイド

### 左ボーダー付き要素

| コンポーネント | 用途 | ボーダー幅 | 色 | 使用例 |
|--------------|------|-----------|-----|--------|
| LeftLineSection | セクション区切り | 0.5px | ブランドカラー | フィルターサイドバー |
| StatItem | 統計情報表示 | 4px | グレー/バリアント | 参加者数、料金 |
| border-l-4直接指定 | カード装飾 | 4px | 状態に応じた色 | カードの状態表示 |

### 画像表示

| コンポーネント | 用途 | 特徴 |
|--------------|------|------|
| EmptyImage | 画像なし時のフォールバック | アイコン + グラデーション |
| ImageLightbox | 拡大表示 | 全画面ライトボックス |
| OptimizedImage | 最適化表示 | Next.js Image最適化 |

### ローディング表示

| コンポーネント | 用途 | 特徴 |
|--------------|------|------|
| LoadingState | 一般的なローディング | スピナー + メッセージ |
| LoadingCard | カード形式のローディング | スケルトンローダー |
| Skeleton | プレースホルダー | コンテンツ形状のスケルトン |

---

## 更新履歴

- 2025-01-16: 初版作成
- 2025-01-16: StatItemコンポーネント追加
