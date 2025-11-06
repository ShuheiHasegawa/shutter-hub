# 撮影会支払い方法選択機能実装計画

## 実装内容

### 1. データベーススキーマ変更

- `photo_sessions`テーブルに`payment_timing`カラムを追加（TEXT型、デフォルト: 'prepaid'）
- CHECK制約: `payment_timing IN ('prepaid', 'cash_on_site')`
- 既存データにデフォルト値`'prepaid'`を設定

**ファイル**: `supabase/migrations/[timestamp]_add_payment_timing_to_photo_sessions.sql`

### 2. 型定義の更新

- `src/types/database.ts`: `PhotoSession`インターフェースに`payment_timing?: 'prepaid' | 'cash_on_site'`を追加
- `src/types/payment.ts`: `PaymentTiming`型を確認（既存の`'prepaid' | 'cash_on_site'`を使用）
- `src/app/actions/photo-session-slots.ts`: `PhotoSessionWithSlotsData`インターフェースに`payment_timing?: 'prepaid' | 'cash_on_site'`を追加

### 3. Server Actions更新

- `src/app/actions/photo-session-slots.ts`:
- `createPhotoSessionWithSlotsAction`: `payment_timing`フィールドを`photo_sessions`テーブルの`insert`に追加
- `updatePhotoSessionWithSlotsAction`: `payment_timing`フィールドを`update`に追加
- `src/app/actions/bulk-photo-sessions.ts`:
- `createBulkPhotoSessionsAction`: RPC呼び出しに`payment_timing`パラメータを追加
- `src/app/actions/subscription-management.ts`:
- 既存の`getCurrentSubscription`を使用してサブスクリプションチェック（新規関数不要）

### 4. サブスクリプションチェック関数

- `src/app/actions/photo-session-slots.ts`に新規関数を追加:
- `checkCanEnableCashOnSite(userId: string)`: ユーザーがフリープラン以外のサブスクリプション契約済みかチェック
- 返り値: `{ canEnable: boolean; currentPlan?: string }`

### 5. PhotoSessionForm UI実装

- `src/components/photo-sessions/PhotoSessionForm.tsx`:
- `formData`に`payment_timing: 'prepaid' | 'cash_on_site'`を追加（デフォルト: `'prepaid'`）
- 撮影枠設定と公開設定の間に「支払い方法設定」セクションを追加
- `RadioGroup`コンポーネントを使用して支払い方法選択UIを実装
- 現地払い選択時、サブスクリプションチェックを実行
- フリープランの場合は現地払いを無効化し、説明文を表示
- `useSubscription`フックを使用してサブスクリプション状態を取得
- `handleSubmit`で`payment_timing`を`PhotoSessionWithSlotsData`に含める

**配置**: 撮影枠設定セクション（789-806行目）と公開設定セクション（875-897行目）の間

### 6. 予約フローでの支払い方法選択UI

- `src/components/photo-sessions/SlotBookingFlow.tsx`:
- `confirm`ステップで支払い方法選択UIを追加
- `session.payment_timing`が`'cash_on_site'`の場合のみ選択可能
- `RadioGroup`で「Stripe決済」と「現地決済」を選択可能にする
- 選択した支払い方法を`createSlotBooking`に渡す（必要に応じてAPIを更新）
- 現地決済選択時はStripe決済フォームをスキップ

### 7. 多言語対応メッセージ追加

- `messages/ja.json`と`messages/en.json`に以下を追加:
- `photoSessions.form.paymentTiming`: 支払い方法設定
- `photoSessions.form.paymentTimingPrepaid`: Stripe決済（事前決済）
- `photoSessions.form.paymentTimingCashOnSite`: 現地払い
- `photoSessions.form.paymentTimingDescription`: 支払い方法の説明
- `photoSessions.form.cashOnSiteRequiresSubscription`: 現地払いには有料サブスクリプションが必要です
- `photoSessions.booking.selectPaymentMethod`: 支払い方法を選択
- `photoSessions.booking.paymentMethodStripe`: Stripe決済
- `photoSessions.booking.paymentMethodCashOnSite`: 現地決済

### 8. 既存データのマイグレーション

- マイグレーションファイル内で既存の`photo_sessions`レコードに`payment_timing = 'prepaid'`を設定

## 実装順序

1. データベースマイグレーション作成・適用
2. 型定義更新
3. Server Actions更新（サブスクリプションチェック関数含む）
4. PhotoSessionForm UI実装
5. SlotBookingFlow UI実装
6. 多言語対応メッセージ追加
7. 動作確認・テスト

## 注意事項

- 現地払い選択時は、主催者のサブスクリプション状態をリアルタイムでチェック
- フリープランの場合は現地払いオプションを無効化（disabled）し、説明文を表示
- 予約フローでは、`session.payment_timing === 'cash_on_site'`の場合のみ支払い方法選択を表示
- 既存の撮影会データは全て`payment_timing = 'prepaid'`として扱う

## 環境変数による制御（実装済み）

### 環境変数

- `NEXT_PUBLIC_ENABLE_CASH_ON_SITE`: 現地払い機能の有効/無効化（デフォルト: false）
- `NEXT_PUBLIC_CASH_ON_SITE_REQUIRES_SUBSCRIPTION`: サブスクリプションチェックの有無（デフォルト: true）

### 設定パターン

1. **リリース時（Stripe決済のみ）**: `NEXT_PUBLIC_ENABLE_CASH_ON_SITE=false`
2. **サブスクリプションチェックあり**: `NEXT_PUBLIC_ENABLE_CASH_ON_SITE=true`, `NEXT_PUBLIC_CASH_ON_SITE_REQUIRES_SUBSCRIPTION=true`
3. **全員に選択可能**: `NEXT_PUBLIC_ENABLE_CASH_ON_SITE=true`, `NEXT_PUBLIC_CASH_ON_SITE_REQUIRES_SUBSCRIPTION=false`

詳細は `README.md` の「環境変数設定」セクションを参照してください。