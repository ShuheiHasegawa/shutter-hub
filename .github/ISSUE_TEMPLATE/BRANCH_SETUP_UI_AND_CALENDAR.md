# UI改善とカレンダー機能の統合実装 - ブランチセットアップガイド

## 📋 概要
このドキュメントは、UI改善（カラーシステム統一化）とカレンダー機能を1つのブランチにまとめて実装するためのセットアップガイドです。

## 🌿 ブランチ名
```
feature/ui-improvements-and-calendar
```

## 📝 コミットメッセージ例

### メインコミット
```
feat: UI改善とカレンダー機能の統合実装

- カラーシステム統一化: 統計表示をtext-primaryに統一、セマンティックカラーをステータス表示のみに使用
- カレンダー機能: 運営者とモデルが相互に空き時間を確認できる機能を実装
- 所属モデル管理機能の強化: 空き時間件数表示、所属解除機能を追加

Related to #6, #8
```

### 分割コミット（推奨）
```
refactor: カラーシステム統一化と統計表示の簡素化

- 統計表示のカラーをtext-primaryに統一
- セマンティックカラーをステータス表示のみに使用
- ブランド要素をtext-primaryに統一

Related to #6
```

```
feat: カレンダーでの所属モデル/運営空き時間表示機能

- 運営者が所属モデルの空き時間をカレンダー上に色分け表示
- モデルが所属運営の対応可能時間を表示
- MultiSelectコンポーネントでモデル選択フィルター機能を実装
- 所属モデル管理機能の強化（所属解除、空き時間件数表示）

Related to #8
```

## 🔧 実装手順

### 1. ブランチ作成
```bash
# mainブランチから最新を取得
git checkout main
git pull origin main

# 新しいブランチを作成
git checkout -b feature/ui-improvements-and-calendar
```

### 2. 実装順序（推奨）

#### Step 1: カラーシステム統一化
1. `public-header.tsx` - ロゴとブランド名のカラー統一
2. `OrganizerModelsCommon.tsx` - 統計表示のカラー統一（空き時間機能は後で追加）
3. `PendingInvitationsList.tsx` - セマンティックカラーの適用
4. `PhotoSessionDetail.tsx` - セマンティックカラーの適用
5. `PriorityTicketManagement.tsx` - セマンティックカラーの適用
6. Photobook関連コンポーネント - セマンティックカラーの適用

#### Step 2: カレンダー機能
1. `calendar/page.tsx` - カレンダーページの実装
2. `UserScheduleManager.tsx` - スケジュール管理機能
3. `OrganizerModelsCommon.tsx` - 空き時間件数表示機能の追加
4. `OrganizerModelManagement.tsx` - 所属モデル管理画面の更新
5. `ModelInvitationForm.tsx` - モデル招待フォームのモーダル化

### 3. コミット

#### オプションA: 1つのコミットにまとめる
```bash
git add .
git commit -m "feat: UI改善とカレンダー機能の統合実装

- カラーシステム統一化: 統計表示をtext-primaryに統一、セマンティックカラーをステータス表示のみに使用
- カレンダー機能: 運営者とモデルが相互に空き時間を確認できる機能を実装
- 所属モデル管理機能の強化: 空き時間件数表示、所属解除機能を追加

Related to #6, #8"
```

#### オプションB: 2つのコミットに分ける（推奨）
```bash
# カラーシステム統一化
git add src/components/layout/public-header.tsx
git add src/components/profile/organizer/PendingInvitationsList.tsx
git add src/components/photo-sessions/PhotoSessionDetail.tsx
git add src/components/organizer/PriorityTicketManagement.tsx
git add src/components/photobook/**/*.tsx
# OrganizerModelsCommon.tsxのカラー変更のみ（空き時間機能は含めない）
git add -p src/components/profile/organizer/OrganizerModelsCommon.tsx

git commit -m "refactor: カラーシステム統一化と統計表示の簡素化

- 統計表示のカラーをtext-primaryに統一
- セマンティックカラーをステータス表示のみに使用
- ブランド要素をtext-primaryに統一

Related to #6"

# カレンダー機能
git add src/app/[locale]/calendar/page.tsx
git add src/components/profile/UserScheduleManager.tsx
git add src/components/profile/organizer/OrganizerModelsCommon.tsx
git add src/components/profile/organizer/OrganizerModelManagement.tsx
git add src/components/profile/organizer/ModelInvitationForm.tsx

git commit -m "feat: カレンダーでの所属モデル/運営空き時間表示機能

- 運営者が所属モデルの空き時間をカレンダー上に色分け表示
- モデルが所属運営の対応可能時間を表示
- MultiSelectコンポーネントでモデル選択フィルター機能を実装
- 所属モデル管理機能の強化（所属解除、空き時間件数表示）

Related to #8"
```

### 4. プッシュ
```bash
git push origin feature/ui-improvements-and-calendar
```

## ✅ 実装チェックリスト

### カラーシステム統一化
- [ ] `public-header.tsx`: ロゴとブランド名が`text-primary`に統一されている
- [ ] `OrganizerModelsCommon.tsx`: 統計数値が`text-primary`に統一されている
- [ ] `PendingInvitationsList.tsx`: バッジとメッセージ背景にセマンティックカラーが適用されている
- [ ] `PhotoSessionDetail.tsx`: 予約関連のアラートとバッジにセマンティックカラーが適用されている
- [ ] `PriorityTicketManagement.tsx`: アクティブ/期限切れチケット数がセマンティックカラーになっている
- [ ] Photobook関連コンポーネント: ステータス表示にセマンティックカラーが適用されている

### カレンダー機能
- [ ] 運営者側：所属モデルの空き時間がカレンダー上に色分け表示される
- [ ] 運営者側：日付クリック時のモーダルに所属モデルの空き時間が表示される
- [ ] モデル側：日付クリック時のモーダルに所属運営の対応可能時間が表示される
- [ ] MultiSelectコンポーネントでモデル選択フィルター機能が動作する
- [ ] 所属モデル管理画面に空き時間件数が表示される
- [ ] 所属解除機能が正常に動作する

## 🧪 テスト手順

### カラーシステム統一化
1. 各ページで統計表示が`text-primary`で統一されているか確認
2. ステータスバッジがセマンティックカラーで表示されているか確認
3. ブランド要素（ロゴなど）が`text-primary`で統一されているか確認

### カレンダー機能
1. 運営者アカウントでカレンダーページにアクセス
2. 所属モデルの空き時間が色分け表示されるか確認
3. 日付をクリックしてモーダルに所属モデルの空き時間が表示されるか確認
4. MultiSelectでモデル選択フィルターが動作するか確認
5. モデルアカウントでカレンダーページにアクセス
6. 所属運営の対応可能時間が表示されるか確認

## 📚 参考資料
- `.github/ISSUE_TEMPLATE/temp-issue-ui-improvements-and-calendar.md` - 統合Issueテンプレート
- `.cursor/rules/dev-rules/unified-color-system.mdc` - 統合カラーシステム実装ガイド
- `.cursor/rules/dev-rules/development-guide.mdc` - 開発ルール
