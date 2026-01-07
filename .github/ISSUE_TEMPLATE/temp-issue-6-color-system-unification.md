---
name: カラーシステム統一と統計表示の簡素化
about: 統計表示のカラーをtext-primaryに統一し、セマンティックカラーはステータス表示のみに使用
title: '[Refactor] カラーシステム統一と統計表示の簡素化 #6'
labels: refactor, ui-improvement, design-system
assignees: ''
---

## 📋 概要
統計表示のカラーを`text-primary`に統一し、セマンティックカラー（success/warning/error/info）はステータス表示のみに使用するように変更する。これにより、UIの一貫性を向上させ、カラフルになりがちな統計表示をシンプルに保つ。

## 🎯 背景・目的
- **問題点**: 
  - 統計表示で様々な色（`text-blue-600`, `text-green-600`, `text-purple-600`, `text-yellow-600`など）が使用され、視覚的に散漫になっていた
  - セマンティックカラーと統計表示の色が混在し、デザインシステムの一貫性が欠けていた
  - ブランド要素（ロゴなど）で固定色が使用されていた
- **目的**: 
  - 統計表示のカラーを`text-primary`に統一し、視覚的な一貫性を向上
  - セマンティックカラーはステータス表示（バッジ、メッセージ背景など）のみに使用
  - ブランド要素は`text-primary`を使用して統一感を保つ

## 📝 実装内容

### 統計表示のカラー統一
- [x] `OrganizerModelsCommon.tsx`: 統計数値のカラーを`text-primary`に統一
  - `text-blue-600`, `text-green-600`, `text-purple-600`, `text-yellow-600` → `text-primary`
- [x] `PriorityTicketManagement.tsx`: アクティブ/期限切れチケット数のカラーをセマンティックカラーに変更
  - `text-green-600` → `text-success`
  - `text-red-600` → `text-error`
- [x] `public-header.tsx`: ロゴとブランド名のカラーを`text-primary`に統一
  - `text-purple-600` → `text-primary`

### セマンティックカラーの適用
- [x] `PendingInvitationsList.tsx`: バッジとメッセージ背景にセマンティックカラーを適用
  - 保留中: `bg-warning/10 text-warning border-warning/30`
  - 承認済み: `bg-success/10 text-success border-success/30`
  - 拒否: `bg-error/10 text-error border-error/30`
  - メッセージ背景: `bg-info/10 border-info/20`
- [x] `PhotoSessionDetail.tsx`: 予約関連のアラートとバッジにセマンティックカラーを適用
  - 予約済みアラート: `border-success/30 bg-success/10`
  - 予約済みバッジ: `text-success border-success bg-success/10`
- [x] Photobook関連コンポーネント: ステータス表示にセマンティックカラーを適用
  - 公開中: `text-success`
  - アップロード制限警告: `text-warning`
  - 削除アクション: `text-error`
  - ブランド要素: `bg-primary`

## 🔧 技術的な考慮事項

### カラーシステムの統一ルール
- **統計表示**: `text-primary`を使用（統一感を保つ）
- **ステータス表示**: セマンティックカラー（`text-success`, `text-warning`, `text-error`, `text-info`）を使用
- **ブランド要素**: `text-primary`を使用（ロゴ、ブランド名など）
- **バッジ・メッセージ背景**: セマンティックカラー + 透明度（`bg-success/10`, `border-warning/30`など）

### 変更対象コンポーネント
- `src/components/profile/organizer/OrganizerModelsCommon.tsx`
- `src/components/profile/organizer/PendingInvitationsList.tsx`
- `src/components/photo-sessions/PhotoSessionDetail.tsx`
- `src/components/organizer/PriorityTicketManagement.tsx`
- `src/components/layout/public-header.tsx`
- `src/components/photobook/quick/QuickPhotobookShelfClient.tsx`
- `src/components/photobook/quick/QuickPhotobookImageManagerV2.tsx`
- `src/components/photobook/common/DeletePhotobookDialog.tsx`
- `src/components/photobook/advanced/AdvancedPhotobookShelfClient.tsx`
- `src/components/profile/PhotobookGallery.tsx`

## 🎨 UI/UX要件

### カラー使用ガイドライン
- **統計数値**: 常に`text-primary`を使用（例：総モデル数、参加回数、収益など）
- **ステータスバッジ**: セマンティックカラーを使用
  - 成功・完了: `text-success`
  - 警告・注意: `text-warning`
  - エラー・削除: `text-error`
  - 情報・詳細: `text-info`
- **メッセージ背景**: セマンティックカラー + 透明度を使用
  - 例: `bg-success/10 border-success/30`
- **ブランド要素**: `text-primary`を使用（統一感を保つ）

### 視覚的な改善効果
- 統計表示が統一され、視覚的に整理される
- セマンティックカラーが適切に使用され、ステータスの意味が明確になる
- ブランド要素が統一され、ブランドアイデンティティが強化される

## ⚠️ 破壊的変更
- [x] 破壊的変更なし（既存の機能は維持、カラーのみ変更）

## ✅ 完了条件
- [x] すべてのタスクが完了
- [ ] CodeRabbitレビュー通過
- [ ] UI動作確認（統計表示が`text-primary`で統一されているか）
- [ ] セマンティックカラーが適切に使用されているか確認
- [ ] ブランド要素が`text-primary`で統一されているか確認

## 🔗 関連Issue
- Related to #8（カレンダー機能の実装と同時に実施）

## 📚 参考資料
- `.cursor/rules/dev-rules/unified-color-system.mdc` - 統合カラーシステム実装ガイド
- `.cursor/rules/dev-rules/development-guide.mdc` - 開発ルール
- `src/styles/color-system-v2.css` - カラーシステム定義

## 📸 スクリーンショット・モックアップ
<!-- UI変更がある場合は、スクリーンショットやモックアップを添付 -->

### 変更前後の比較
- **変更前**: 統計表示で様々な色が使用され、視覚的に散漫
- **変更後**: 統計表示が`text-primary`で統一され、セマンティックカラーはステータス表示のみに使用

### 実装ファイル
- `src/components/profile/organizer/OrganizerModelsCommon.tsx`
- `src/components/profile/organizer/PendingInvitationsList.tsx`
- `src/components/photo-sessions/PhotoSessionDetail.tsx`
- `src/components/organizer/PriorityTicketManagement.tsx`
- `src/components/layout/public-header.tsx`
- `src/components/photobook/**/*.tsx`（複数ファイル）
