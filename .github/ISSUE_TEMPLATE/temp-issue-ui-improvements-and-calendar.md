---
name: UI改善とカレンダー機能の統合実装
about: カラーシステム統一化とカレンダーでの所属モデル/運営空き時間表示機能の統合実装
title: '[Feature] UI改善とカレンダー機能の統合実装'
labels: feature, refactor, ui-improvement, calendar, design-system
assignees: ''
---

## 📋 概要
カラーシステム統一化とカレンダーでの所属モデル/運営空き時間表示機能を統合して実装する。UIの一貫性を向上させ、運営者とモデルが相互に空き時間を確認できる機能を提供する。

## 🎯 背景・目的

### カラーシステム統一化
- **問題点**: 
  - 統計表示で様々な色（`text-blue-600`, `text-green-600`, `text-purple-600`, `text-yellow-600`など）が使用され、視覚的に散漫になっていた
  - セマンティックカラーと統計表示の色が混在し、デザインシステムの一貫性が欠けていた
  - ブランド要素（ロゴなど）で固定色が使用されていた
- **目的**: 
  - 統計表示のカラーを`text-primary`に統一し、視覚的な一貫性を向上
  - セマンティックカラーはステータス表示（バッジ、メッセージ背景など）のみに使用
  - ブランド要素は`text-primary`を使用して統一感を保つ

### カレンダー機能
- **問題点**: 
  - 運営者が所属モデルの空き時間を確認する際、個別に連絡を取る必要があった
  - モデルが所属運営の対応可能時間を把握できず、スケジュール調整が非効率だった
  - カレンダー上で複数のモデルの空き時間を一覧で確認できなかった
- **目的**: 
  - 運営者とモデルが相互に空き時間を可視化し、スケジュール調整を効率化する
  - カレンダー上で複数のモデルの空き時間を色分けして表示し、一目で把握できるようにする
  - 日付クリック時のモーダルで詳細な空き時間情報を確認できるようにする

## 📝 実装内容

### Part 1: カラーシステム統一化

#### 統計表示のカラー統一
- [x] `OrganizerModelsCommon.tsx`: 統計数値のカラーを`text-primary`に統一
  - `text-blue-600`, `text-green-600`, `text-purple-600`, `text-yellow-600` → `text-primary`
- [x] `PriorityTicketManagement.tsx`: アクティブ/期限切れチケット数のカラーをセマンティックカラーに変更
  - `text-green-600` → `text-success`
  - `text-red-600` → `text-error`
- [x] `public-header.tsx`: ロゴとブランド名のカラーを`text-primary`に統一
  - `text-purple-600` → `text-primary`

#### セマンティックカラーの適用
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

### Part 2: カレンダー機能

#### カレンダー機能
- [x] 運営者側：所属モデルの空き時間をカレンダー上に色分けして表示
- [x] 運営者側：日付クリック時のモーダルに所属モデルの空き時間を表示
- [x] モデル側：日付クリック時のモーダルに所属運営の対応可能時間を表示
- [x] モデルごとに16色のカラーパレットで区別（8色から拡張）
- [x] 表示フォーマットを「時間: 名前」に統一（モバイル対応）
- [x] MultiSelectコンポーネントでモデル選択フィルター機能を実装
- [x] 名前入力による絞り込み機能
- [x] 全選択/全解除機能
- [x] セレクトボックス内にカラーマークを表示
- [x] モデル選択UIを年月選択の下に配置
- [x] モーダル内の空き時間追加ボタンを所属モデルセクションの前に配置
- [x] ページタイトルを「カレンダー」に変更
- [x] 色凡例を削除（MultiSelect内のカラーマークで代替）

#### 所属モデル管理機能の強化
- [x] 所属モデル解除機能を実装（三点メニューから実行）
- [x] 所属解除時の確認ダイアログを追加
- [x] 所属モデルの空き時間件数（3ヶ月先まで）を表示（`OrganizerModelsCommon.tsx`）
- [x] モデル招待フォームをモーダル化
- [x] 新規招待ボタンを画面右上に配置してUIの一貫性を向上

## 🔧 技術的な考慮事項

### カラーシステムの統一ルール
- **統計表示**: `text-primary`を使用（統一感を保つ）
- **ステータス表示**: セマンティックカラー（`text-success`, `text-warning`, `text-error`, `text-info`）を使用
- **ブランド要素**: `text-primary`を使用（ロゴ、ブランド名など）
- **バッジ・メッセージ背景**: セマンティックカラー + 透明度（`bg-success/10`, `border-warning/30`など）

### データ取得
- `user_availability`テーブルのRLSポリシーを活用
  - 運営者は所属モデルの空き時間を閲覧可能（編集不可）
  - モデルは所属運営の空き時間を閲覧可能（編集不可）
- 月単位でデータを取得し、パフォーマンスを最適化
- モデルごとに空き時間を個別に管理し、色分け表示を実現

### カラーパレット
- 16色のカラーパレットを循環割当で使用
- モデルIDに基づいて一意の色を割り当て
- カレンダー上とMultiSelect内で同じ色を使用して一貫性を保持

### UI/UX
- モバイル対応：表示フォーマットを「時間: 名前」に統一（時間を優先表示）
- フィルター機能：MultiSelectコンポーネントで直感的な操作を実現
- 視覚的区別：カラーマークと色分け表示でモデルを識別

### パフォーマンス
- 月変更時にのみデータを再取得
- モデルごとの空き時間データを効率的に管理
- 不要な再レンダリングを防止

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

### カレンダー表示
- 運営者側：所属モデルの空き時間を色分けしてカレンダー上に表示
- 各モデルの空き時間は左側にカラーマークを表示
- 表示フォーマット：「時間: 名前」（例：「10:00-18:00: 橋本環奈」）

### モーダル表示
- **運営者側**：
  1. 自分の設定済み空き時間（編集・削除可能）
  2. 区切り線
  3. 空き時間を追加ボタン
  4. 区切り線（所属モデルの空き時間がある場合）
  5. 所属モデルの空き時間セクション
     - 各モデルの名前、カラーマーク、空き時間を表示
- **モデル側**：
  1. 自分の設定済み空き時間（編集・削除可能）
  2. 区切り線
  3. 空き時間を追加ボタン
  4. 区切り線（所属運営の空き時間がある場合）
  5. 所属運営の対応可能時間セクション（閲覧のみ）

### フィルター機能
- MultiSelectコンポーネントでモデル選択
- 各モデル名の先頭にカラーマークを表示
- 名前入力による絞り込み機能
- 全選択/全解除ボタン
- 選択したモデルのみカレンダー上に表示

### 所属モデル管理画面
- モデルカードに空き時間（3ヶ月先まで）の件数を表示
- 三点メニューから所属解除機能にアクセス
- 確認ダイアログで誤操作を防止

## ⚠️ 破壊的変更
- [x] 破壊的変更なし（既存の機能は維持、カラーのみ変更）

## ✅ 完了条件

### カラーシステム統一化
- [x] すべてのタスクが完了
- [ ] CodeRabbitレビュー通過
- [ ] UI動作確認（統計表示が`text-primary`で統一されているか）
- [ ] セマンティックカラーが適切に使用されているか確認
- [ ] ブランド要素が`text-primary`で統一されているか確認

### カレンダー機能
- [x] すべてのタスクが完了
- [ ] CodeRabbitレビュー通過
- [ ] E2Eテスト通過
  - [ ] 運営者アカウントでカレンダーの日付をクリック
  - [ ] モーダルに「所属モデルの空き時間」セクションが表示される
  - [ ] 各モデルの空き時間が正しく表示される
  - [ ] モデルのカラーマークが正しく表示される
  - [ ] 空き時間がないモデルは表示されない
  - [ ] フィルターで非選択のモデルは表示されない
  - [ ] 自分の空き時間とモデルの空き時間が区別されている
  - [ ] モデルアカウントでカレンダーの日付をクリック
  - [ ] モーダルに「所属運営の対応可能時間」セクションが表示される
  - [ ] モバイルでも正しく表示される
- [ ] ドキュメント更新（必要に応じて）

## 📁 変更対象ファイル

### カラーシステム統一化
- `src/components/profile/organizer/OrganizerModelsCommon.tsx`（カラー変更のみ）
- `src/components/profile/organizer/PendingInvitationsList.tsx`
- `src/components/photo-sessions/PhotoSessionDetail.tsx`
- `src/components/organizer/PriorityTicketManagement.tsx`
- `src/components/layout/public-header.tsx`
- `src/components/photobook/quick/QuickPhotobookShelfClient.tsx`
- `src/components/photobook/quick/QuickPhotobookImageManagerV2.tsx`
- `src/components/photobook/common/DeletePhotobookDialog.tsx`
- `src/components/photobook/advanced/AdvancedPhotobookShelfClient.tsx`
- `src/components/profile/PhotobookGallery.tsx`

### カレンダー機能
- `src/app/[locale]/calendar/page.tsx` - カレンダーページの実装
- `src/components/profile/UserScheduleManager.tsx` - スケジュール管理コンポーネント
- `src/components/profile/organizer/OrganizerModelsCommon.tsx` - 所属モデル管理コンポーネント（空き時間件数表示）
- `src/components/profile/organizer/OrganizerModelManagement.tsx` - 所属モデル管理画面
- `src/components/profile/organizer/ModelInvitationForm.tsx` - モデル招待フォーム
- `src/components/ui/multi-select.tsx` - MultiSelectコンポーネント（既存）

### データベース
- `user_availability`テーブル - ユーザー空き時間管理
- `organizer_models`テーブル - 運営者とモデルの関連
- RLSポリシーによるアクセス制御

## 🔗 関連Issue
- Related to #6（カラーシステム統一化）
- Related to #8（カレンダー機能）

## 📚 参考資料
- `.cursor/rules/dev-rules/unified-color-system.mdc` - 統合カラーシステム実装ガイド
- `.cursor/rules/dev-rules/development-guide.mdc` - 開発ルール
- `src/styles/color-system-v2.css` - カラーシステム定義
- `docs/user-schedule-management-spec.md` - ユーザースケジュール管理仕様
- `supabase/migrations/20250924095138_create_user_availability_correct.sql` - user_availabilityテーブル定義とRLSポリシー

## 📸 スクリーンショット・モックアップ
<!-- UI変更がある場合は、スクリーンショットやモックアップを添付 -->

### 変更前後の比較

#### カラーシステム統一化
- **変更前**: 統計表示で様々な色が使用され、視覚的に散漫
- **変更後**: 統計表示が`text-primary`で統一され、セマンティックカラーはステータス表示のみに使用

#### カレンダー機能
- **変更前**: 運営者とモデルが個別に連絡を取る必要があった
- **変更後**: カレンダー上で相互の空き時間を確認できるようになった

## 📝 実装メモ

### 統合実装の理由
- `OrganizerModelsCommon.tsx`が両方の機能に関連しているため、1つのブランチにまとめることでマージコンフリクトを回避
- UI改善と新機能追加を同時に実装することで、一貫性のあるUIを提供
- レビューとテストを効率化

### 注意事項
- `OrganizerModelsCommon.tsx`はカラー変更と空き時間機能の両方を含む
- カラーシステム統一化は既存機能への影響が少ないリファクタリング
- カレンダー機能は新機能追加のため、十分なテストが必要
