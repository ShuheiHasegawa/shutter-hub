# エントリー変更機能実装計画

## 背景

ユーザーが誤ってエントリーした場合や、エントリー後に情報が更新された場合に対応するため、エントリー期間終了までエントリー内容を変更可能にする機能を実装する。

## 信頼性確保の設計方針

### 1. 変更可能期間の制限

- **エントリー期間終了まで**のみ変更可能
- 抽選実行後は変更不可
- エントリー期間終了時刻を厳密にチェック

### 2. 変更情報の記録

- 変更回数と最終更新時刻のみ記録
- 詳細な変更履歴は記録しない（シンプルに保つ）

### 3. 変更回数の制限

- 変更回数に上限を設ける（例：3回まで）
- 過度な変更を防止し、システム負荷を軽減

### 4. データ整合性の確保

- トランザクション処理で一貫性を保証
- 変更中の重複リクエストを防止（楽観的ロック）

## 実装内容

### 1. データベーススキーマ拡張

#### 1.1 lottery_entry_groupsテーブルの拡張

- `update_count`カラム追加（変更回数、デフォルト0）
- `updated_at`カラムは既存のため、そのまま使用

### 2. Server Actions実装

#### 2.1 updateMultiSlotLotteryEntry関数

`src/app/actions/multi-slot-lottery.ts`に追加

**処理フロー：**

1. エントリー期間終了チェック
2. 既存エントリーの存在確認
3. 変更回数制限チェック（3回まで）
4. トランザクション処理：
   - 既存のlottery_slot_entriesを削除
   - 新しいlottery_slot_entriesを作成
   - lottery_entry_groupsを更新（update_countをインクリメント、updated_atを更新）

**エラーハンドリング：**

- エントリー期間外：`エントリー期間が終了しています`
- 変更回数上限：`変更回数の上限に達しています（最大3回）`
- 抽選実行済み：`抽選が実行済みのため変更できません`

### 3. フロントエンド実装

#### 3.1 MultiSlotLotteryEntryFormの拡張

`src/components/lottery/MultiSlotLotteryEntryForm.tsx`

**変更点：**

- 既存エントリーがある場合、フォームに既存データを読み込む
- 「エントリー更新」モードと「新規エントリー」モードを切り替え
- 変更回数の表示（例：「残り変更可能回数: 2回」）

#### 3.2 LotteryEntryConfirmationの拡張

`src/components/lottery/LotteryEntryConfirmation.tsx`

**変更点：**

- 「編集」ボタンを常に表示（エントリー期間内の場合のみ有効）
- 変更回数の表示（例：「変更回数: 1回 / 最大3回」）

### 4. createMultiSlotLotteryEntry関数の修正

既存エントリーがある場合の処理を変更：

- 現在：`既にエントリー済みです`エラーを返す
- 変更後：`updateMultiSlotLotteryEntry`を呼び出すか、既存エントリーを更新する処理に統合

## 実装ファイル

### データベース

- `supabase/migrations/[timestamp]_add_entry_update_support.sql`
  - `lottery_entry_groups`テーブルに`update_count`カラム追加

### バックエンド

- `src/app/actions/multi-slot-lottery.ts`
  - `updateMultiSlotLotteryEntry`関数追加
  - `createMultiSlotLotteryEntry`関数の修正（既存エントリー時の処理変更）

### フロントエンド

- `src/components/lottery/MultiSlotLotteryEntryForm.tsx`
  - 既存エントリー読み込み機能
  - 更新モード対応
  - 変更回数表示

- `src/components/lottery/LotteryEntryConfirmation.tsx`
  - 編集ボタンの有効化条件追加
  - 変更回数表示

### 型定義

- `src/types/multi-slot-lottery.ts`
  - `UpdateMultiSlotLotteryEntryData`型追加（CreateMultiSlotLotteryEntryDataと同じ構造）

## セキュリティ・信頼性対策

1. **エントリー期間の厳密なチェック**
   - サーバーサイドで現在時刻とエントリー終了時刻を比較
   - タイムゾーンを考慮した正確な時刻比較

2. **変更回数制限**
   - データベース制約で変更回数を制限（CHECK制約）
   - フロントエンドでも警告表示

3. **トランザクション処理**
   - エントリー変更をアトミックに実行
   - 部分的な更新を防止

## 注意事項

- 変更回数制限は運用状況に応じて調整可能にする（現在は3回）
- エントリー期間終了時刻の表示を明確にする（ユーザーに分かりやすく）
- シンプルな実装を優先し、必要最小限の情報のみ記録する

## 実装順序

1. データベーススキーマ拡張（update_countカラム追加）
2. Server Actions実装（updateMultiSlotLotteryEntry関数）
3. createMultiSlotLotteryEntry関数の修正
4. フロントエンド実装（既存エントリー読み込み、更新モード対応）
5. UI改善（変更回数表示、編集ボタン有効化）

