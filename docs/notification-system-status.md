# 通知システム実装状況

## 概要

ShutterHubの通知システムは、ユーザーに重要なイベントや更新をリアルタイムで通知するための統合システムです。Supabase Realtimeを活用したリアルタイム通知配信と、ユーザー設定に基づく柔軟な通知フィルタリングを提供します。

### アーキテクチャ概要

- **通知作成**: `createNotification` Server Action（`src/app/actions/notifications.ts`）
- **通知取得・管理**: `useNotifications` Hook（`src/hooks/useNotifications.ts`）
- **通知表示**: `NotificationCenter` コンポーネント（`src/components/notifications/NotificationCenter.tsx`）
- **通知設定**: `notification_settings` テーブル（種別ごとのON/OFF設定）
- **リアルタイム配信**: Supabase Realtime（WebSocketベース）

### 主要コンポーネント

1. **`createNotification` Server Action**
   - 通知を作成し、`notifications`テーブルに保存
   - サービスロールクライアントを使用（RLSをバイパス）
   - 関連ページの再検証を実行

2. **`useNotifications` Hook**
   - 通知一覧の取得・管理
   - リアルタイム通知の受信
   - 通知設定に基づくフィルタリング
   - トースト通知の表示制御

3. **`NotificationCenter` コンポーネント**
   - 通知一覧の表示
   - 既読/未読管理
   - 通知の削除・クリア

4. **通知設定システム**
   - 種別ごとの通知ON/OFF設定
   - トースト通知の有効/無効
   - リアルタイム通知の有効/無効
   - メール通知の有効/無効（将来実装）

## 実装済み通知一覧

### 運営者招待関連

#### 1. `organizer_invitation_received`
- **発行箇所**: `src/app/actions/organizer-model.ts:139`
- **発行タイミング**: 運営者がモデルに招待を送信した時
- **受信者**: 招待されたモデル
- **優先度**: `high`
- **関連設定**: なし（運営者招待は常に通知）
- **実装状況**: ✅ 実装済み

```typescript
await createNotification({
  userId: data.model_id,
  type: 'organizer_invitation_received',
  category: 'organizer',
  priority: 'high',
  title: '運営者からの招待が届きました',
  message: `${organizerProfile.display_name}さんから所属モデルの招待が届きました。`,
  // ...
});
```

#### 2. `organizer_invitation_accepted`
- **発行箇所**: `src/app/actions/organizer-model.ts:646`
- **発行タイミング**: モデルが招待を承認した時
- **受信者**: 招待を送信した運営者
- **優先度**: `normal`
- **関連設定**: なし
- **実装状況**: ✅ 実装済み

#### 3. `organizer_invitation_rejected`
- **発行箇所**: `src/app/actions/organizer-model.ts:765`
- **発行タイミング**: モデルが招待を拒否した時
- **受信者**: 招待を送信した運営者
- **優先度**: `normal`
- **関連設定**: なし
- **実装状況**: ✅ 実装済み

### 参加者メッセージ

#### 4. `participant_message`（型定義なし）
- **発行箇所**: `src/components/photo-sessions/ParticipantManagement.tsx:203`
- **発行タイミング**: 運営者が参加者にメッセージを送信した時
- **受信者**: 選択された参加者
- **優先度**: 未指定（デフォルト: `normal`）
- **関連設定**: なし
- **実装状況**: ⚠️ 部分実装（直接`notifications`テーブルに挿入、型定義なし）
- **改善点**: `createNotification` Server Actionを使用するように修正が必要

```typescript
// 現在の実装（改善が必要）
return supabase.from('notifications').insert({
  user_id: participant.user_id,
  type: 'participant_message', // 型定義に存在しない
  title: '撮影会主催者からのメッセージ',
  message: messageText,
  // ...
});
```

## 未実装通知一覧（カテゴリ別）

### 即座撮影関連（6種類）

#### 1. `instant_photo_new_request`
- **発行タイミング**: ゲストが即座撮影リクエストを作成した時
- **受信者**: 近くのカメラマン（最大3名、自動マッチング対象）
- **関連Server Action**: `src/app/actions/instant-photo.ts` - `createInstantPhotoRequest`
- **実装箇所**: `createInstantPhotoRequest`関数内、`autoMatchRequest`実行後
- **優先度**: ❌ **実装不要**（不公平性の懸念、システム負荷の観点から不要と判断）
- **依存関係**: 自動マッチングシステム（実装済み）
- **判断理由**: 不公平性が生まれる可能性、システム負荷を考慮して実装を見送り

#### 2. `instant_photo_match_found`
- **発行タイミング**: カメラマンがリクエストを受諾し、ゲストが承認した時
- **受信者**: ゲスト（リクエスト送信者）
- **関連Server Action**: `src/app/actions/instant-photo.ts` - `approvePhotographer`
- **実装箇所**: `approvePhotographer`関数内、ステータスが`matched`に更新された後
- **優先度**: 🔴 高（マッチング完了の通知）
- **依存関係**: ゲスト承認フロー（実装済み）

#### 3. `instant_photo_payment_received`
- **発行タイミング**: ゲストがエスクロー決済を完了した時
- **受信者**: カメラマン
- **関連Server Action**: `src/app/actions/instant-payment.ts` - `confirmEscrowPayment`
- **実装箇所**: `confirmEscrowPayment`関数内、`escrow_status`が`escrowed`に更新された後
- **優先度**: 🔴 高（決済完了の通知）
- **依存関係**: Stripe決済システム（実装済み）

#### 4. `instant_photo_booking_completed`
- **発行タイミング**: 撮影が完了し、予約ステータスが`completed`になった時
- **受信者**: ゲスト、カメラマン
- **関連Server Action**: `src/app/actions/instant-payment.ts` - `confirmDeliveryWithReview`
- **実装箇所**: `confirmDeliveryWithReview`関数内、`status`が`completed`に更新された後
- **優先度**: 🟡 中（完了通知）
- **依存関係**: 写真配信システム（実装済み）

#### 5. `instant_photo_booking_started`
- **発行タイミング**: 撮影開始時（カメラマンが撮影開始を通知した時）
- **受信者**: ゲスト
- **関連Server Action**: 未実装（撮影開始通知機能が必要）
- **実装箇所**: 新規実装が必要
- **優先度**: 🟢 低（オプション機能）

#### 6. `instant_photo_photos_delivered`
- **発行タイミング**: カメラマンが写真を配信した時
- **受信者**: ゲスト
- **関連Server Action**: `src/app/actions/instant-payment.ts` - `deliverPhotos`
- **実装箇所**: `deliverPhotos`関数内、`photo_deliveries`テーブルにレコードが作成された後
- **優先度**: 🔴 高（写真配信の通知）
- **依存関係**: 写真配信システム（実装済み）

### 撮影会関連（7種類）

#### 1. `photo_session_booking_confirmed`
- **発行タイミング**: 予約が確定した時
- **受信者**: 予約者、運営者
- **関連Server Action**: `src/app/actions/photo-session-booking.ts` - `createPhotoSessionBooking`
- **実装箇所**: `createPhotoSessionBooking`関数内、予約作成成功後
- **優先度**: 🔴 高（予約確定の通知）
- **依存関係**: 予約システム（実装済み）

#### 2. `photo_session_booking_cancelled`
- **発行タイミング**: 予約がキャンセルされた時
- **受信者**: 予約者、運営者
- **関連Server Action**: `src/app/actions/photo-session-booking.ts` - `cancelPhotoSessionBooking`
- **実装箇所**: `cancelPhotoSessionBooking`関数内、キャンセル成功後
- **優先度**: 🔴 高（キャンセル通知）
- **依存関係**: 予約システム（実装済み）

#### 3. `photo_session_reminder`
- **発行タイミング**: 撮影会の24時間前、1時間前など
- **受信者**: 予約者
- **関連Server Action**: 未実装（cron jobまたはEdge Functionが必要）
- **実装箇所**: 新規実装が必要（定期実行タスク）
- **優先度**: ❌ **実装不要**（オーバースペック、お気に入り登録で代替可能）
- **依存関係**: 定期実行システム（未実装）
- **判断理由**: システム負荷を考慮し、お気に入り登録機能で十分と判断

#### 4. `photo_session_slot_available`
- **発行タイミング**: キャンセル待ちユーザーが繰り上げ当選した時
- **受信者**: 繰り上げ当選したユーザー
- **関連Server Action**: `src/app/actions/photo-session-waitlist.ts` - `promoteFromWaitlist`
- **実装箇所**: `promoteFromWaitlist`関数内、繰り上げ処理成功後
- **優先度**: 🔴 高（繰り上げ通知）
- **依存関係**: キャンセル待ちシステム（実装済み）

#### 5. `photo_session_review_request`
- **発行タイミング**: 撮影会終了後、レビュー依頼を送信する時
- **受信者**: 参加者
- **関連Server Action**: 未実装（cron jobまたはEdge Functionが必要）
- **実装箇所**: 新規実装が必要（定期実行タスク）
- **優先度**: ❌ **実装不要**（オーバースペック、お気に入り登録で代替可能）
- **依存関係**: 定期実行システム（未実装）
- **判断理由**: システム負荷を考慮し、お気に入り登録機能で十分と判断

#### 6. `photo_session_document_signed`
- **発行タイミング**: 参加者が同意書・契約書に署名した時
- **受信者**: 運営者
- **関連Server Action**: 未実装（ドキュメント署名機能が必要）
- **実装箇所**: 新規実装が必要
- **優先度**: ❌ **実装不要**（オーバースペック）
- **判断理由**: 現状ではオーバースペックな機能と判断

#### 7. `photo_session_photos_available`
- **発行タイミング**: 運営者が写真をアップロードし、参加者が閲覧可能になった時
- **受信者**: 参加者
- **関連Server Action**: 未実装（写真アップロード機能が必要）
- **実装箇所**: 新規実装が必要
- **優先度**: ❌ **実装不要**（オーバースペック）
- **判断理由**: 現状ではオーバースペックな機能と判断

### フォロー関連（4種類）

#### 1. `follow_new_follower`
- **発行タイミング**: フォローが承認された時（承認不要の場合は即座）
- **受信者**: フォローされたユーザー
- **関連Server Action**: `src/app/actions/follow.ts` - `followUser`
- **実装箇所**: `followUser`関数内、`status`が`accepted`になった時
- **優先度**: ❌ **実装不要**（オーバースペック）
- **依存関係**: フォローシステム（実装済み）
- **判断理由**: 現状ではオーバースペックな機能と判断

#### 2. `follow_request_received`
- **発行タイミング**: フォローリクエストが送信された時（承認が必要な場合）
- **受信者**: フォローリクエストを受けたユーザー
- **関連Server Action**: `src/app/actions/follow.ts` - `followUser`
- **実装箇所**: `followUser`関数内、`status`が`pending`になった時
- **優先度**: ❌ **実装不要**（オーバースペック）
- **依存関係**: フォローシステム（実装済み）
- **判断理由**: 現状ではオーバースペックな機能と判断

#### 3. `follow_request_accepted`
- **発行タイミング**: フォローリクエストが承認された時
- **受信者**: フォローリクエストを送信したユーザー
- **関連Server Action**: `src/app/actions/follow.ts` - `approveFollowRequest`
- **実装箇所**: `approveFollowRequest`関数内、`status`が`accepted`に更新された後
- **優先度**: ❌ **実装不要**（オーバースペック）
- **依存関係**: フォローシステム（実装済み）
- **判断理由**: 現状ではオーバースペックな機能と判断

#### 4. `follow_mutual_follow`
- **発行タイミング**: 相互フォローになった時
- **受信者**: 相互フォローになった両ユーザー
- **関連Server Action**: `src/app/actions/follow.ts` - `followUser`, `approveFollowRequest`
- **実装箇所**: フォロー関係作成時、相互フォロー状態をチェックして通知
- **優先度**: ❌ **実装不要**（オーバースペック）
- **判断理由**: 現状ではオーバースペックな機能と判断

### メッセージ関連（3種類）

#### 1. `message_new_message`
- **発行タイミング**: 新しいメッセージが送信された時
- **受信者**: メッセージの受信者（会話の相手）
- **関連Server Action**: `src/app/actions/message.ts` - `sendMessage`
- **実装箇所**: `sendMessage`関数内、メッセージ挿入成功後
- **優先度**: 🔴 高（メッセージ通知）
- **依存関係**: メッセージングシステム（実装済み）
- **注意**: リアルタイムメッセージングが既に実装されているため、通知の必要性を検討

#### 2. `message_group_invite`
- **発行タイミング**: グループ会話に招待された時
- **受信者**: 招待されたユーザー
- **関連Server Action**: 未実装（グループ会話機能が必要）
- **実装箇所**: 新規実装が必要
- **優先度**: 🟢 低（将来機能）

#### 3. `message_group_message`
- **発行タイミング**: グループ会話に新しいメッセージが送信された時
- **受信者**: グループ会話の参加者（送信者を除く）
- **関連Server Action**: 未実装（グループ会話機能が必要）
- **実装箇所**: 新規実装が必要
- **優先度**: 🟢 低（将来機能）

### レビュー関連（2種類）

#### 1. `review_received`
- **発行タイミング**: レビューが投稿された時
- **受信者**: レビュー対象者（モデル、カメラマン、運営者）
- **関連Server Action**: `src/app/actions/reviews.ts` - `createPhotoSessionReview`, `createUserReview`
- **実装箇所**: レビュー作成成功後
- **優先度**: 🟡 中（レビュー通知）
- **依存関係**: レビューシステム（実装済み）

#### 2. `review_reminder`
- **発行タイミング**: 撮影会終了後、レビュー未投稿の参加者にリマインダーを送信
- **受信者**: レビュー未投稿の参加者
- **関連Server Action**: 未実装（cron jobまたはEdge Functionが必要）
- **実装箇所**: 新規実装が必要（定期実行タスク）
- **優先度**: ❌ **実装不要**（オーバースペック、システム負荷を考慮）
- **判断理由**: 現状ではオーバースペックな機能と判断。システム負荷を考慮し、定期実行タスクは見送り

### 決済関連（2種類）

#### 1. `payment_success`
- **発行タイミング**: 決済が成功した時
- **受信者**: 決済者
- **関連Server Action**: `src/app/actions/instant-payment.ts` - `confirmEscrowPayment`
- **実装箇所**: 決済成功時
- **優先度**: 🟡 中（決済確認通知）
- **依存関係**: Stripe決済システム（実装済み）
- **注意**: 即座撮影の決済は`instant_photo_payment_received`でカバー可能

#### 2. `payment_failed`
- **発行タイミング**: 決済が失敗した時
- **受信者**: 決済者
- **関連Server Action**: Stripe Webhook処理
- **実装箇所**: Webhookハンドラー内
- **優先度**: ❌ **実装不要**（オーバースペック）
- **依存関係**: Stripe Webhook（未実装）
- **判断理由**: 現状ではオーバースペックな機能と判断

### システム関連（3種類）

#### 1. `system_maintenance`
- **発行タイミング**: システムメンテナンス開始前、終了後
- **受信者**: 全ユーザーまたは影響を受けるユーザー
- **関連Server Action**: 未実装（管理画面から手動送信）
- **実装箇所**: 新規実装が必要（管理機能）
- **優先度**: 🟡 中（システム通知）

#### 2. `system_update`
- **発行タイミング**: 重要な機能更新・アップデート時
- **受信者**: 全ユーザーまたは対象ユーザー
- **関連Server Action**: 未実装（管理画面から手動送信）
- **実装箇所**: 新規実装が必要（管理機能）
- **優先度**: 🟢 低（お知らせ）

#### 3. `system_security_alert`
- **発行タイミング**: セキュリティ関連の重要なアラート
- **受信者**: 影響を受けるユーザー
- **関連Server Action**: 未実装（セキュリティ監視システム）
- **実装箇所**: 新規実装が必要
- **優先度**: 🔴 高（セキュリティ）

### その他（1種類）

#### 1. `general_announcement`
- **発行タイミング**: 一般的なお知らせ
- **受信者**: 全ユーザーまたは対象ユーザー
- **関連Server Action**: 未実装（管理画面から手動送信）
- **実装箇所**: 新規実装が必要（管理機能）
- **優先度**: 🟢 低（お知らせ）

## 実装すべきタイミング（優先度順）

### 優先度：高（即座実装推奨）

1. **`photo_session_booking_confirmed`** - 予約確定通知
   - 実装箇所: `src/app/actions/photo-session-booking.ts:19` - `createPhotoSessionBooking`
   - タイミング: 予約作成成功後、`bookingId`が返された時
   - 受信者: 予約者、運営者

2. **`photo_session_booking_cancelled`** - 予約キャンセル通知
   - 実装箇所: `src/app/actions/photo-session-booking.ts:84` - `cancelPhotoSessionBooking`
   - タイミング: キャンセル成功後
   - 受信者: 予約者、運営者

3. **`photo_session_slot_available`** - 繰り上げ当選通知
   - 実装箇所: `src/app/actions/photo-session-waitlist.ts:311` - `promoteFromWaitlist`
   - タイミング: 繰り上げ処理成功後、`promoted_users`に含まれるユーザーに通知
   - 受信者: 繰り上げ当選したユーザー

4. ~~**`instant_photo_new_request`** - リクエスト作成通知~~ ❌ **実装不要**
   - ~~実装箇所: `src/app/actions/instant-photo.ts:19` - `createInstantPhotoRequest`~~
   - ~~タイミング: `autoMatchRequest`実行後、マッチング対象のカメラマンに通知~~
   - ~~受信者: 自動マッチング対象のカメラマン（最大3名）~~
   - **判断理由**: 不公平性の懸念、システム負荷を考慮して実装を見送り

5. **`instant_photo_match_found`** - マッチング完了通知
   - 実装箇所: `src/app/actions/instant-photo.ts:1030` - `approvePhotographer`
   - タイミング: ステータスが`matched`に更新された後
   - 受信者: ゲスト

6. **`instant_photo_payment_received`** - 決済完了通知
   - 実装箇所: `src/app/actions/instant-payment.ts:111` - `confirmEscrowPayment`
   - タイミング: `escrow_status`が`escrowed`に更新された後
   - 受信者: カメラマン

7. **`instant_photo_photos_delivered`** - 写真配信通知
   - 実装箇所: `src/app/actions/instant-payment.ts:163` - `deliverPhotos`
   - タイミング: `photo_deliveries`テーブルにレコードが作成された後
   - 受信者: ゲスト

8. **`message_new_message`** - メッセージ通知
   - 実装箇所: `src/app/actions/message.ts:85` - `sendMessage`
   - タイミング: メッセージ挿入成功後
   - 受信者: 会話の相手（送信者を除く）
   - **注意**: リアルタイムメッセージングが既に実装されているため、通知の必要性を検討

### 優先度：中（次期実装推奨）

1. **`instant_photo_booking_completed`** - 撮影完了通知
   - 実装箇所: `src/app/actions/instant-payment.ts:298` - `confirmDeliveryWithReview`
   - タイミング: `status`が`completed`に更新された後
   - 受信者: ゲスト、カメラマン

2. **`review_received`** - レビュー受信通知
   - 実装箇所: `src/app/actions/reviews.ts:68` - `createPhotoSessionReview`, `createUserReview`
   - タイミング: レビュー作成成功後
   - 受信者: レビュー対象者

### 実装不要と判断した通知

以下の通知は、システム負荷やオーバースペックの観点から実装を見送りました：

1. ~~**`instant_photo_new_request`**~~ - 不公平性の懸念、システム負荷を考慮
2. ~~**`photo_session_reminder`**~~ - お気に入り登録で代替可能、定期実行タスクはシステム負荷を考慮
3. ~~**`photo_session_review_request`**~~ - お気に入り登録で代替可能、定期実行タスクはシステム負荷を考慮
4. ~~**`photo_session_document_signed`**~~ - オーバースペック
5. ~~**`photo_session_photos_available`**~~ - オーバースペック
6. ~~**`follow_new_follower`**~~ - オーバースペック
7. ~~**`follow_request_received`**~~ - オーバースペック
8. ~~**`follow_request_accepted`**~~ - オーバースペック
9. ~~**`follow_mutual_follow`**~~ - オーバースペック
10. ~~**`review_reminder`**~~ - オーバースペック、定期実行タスクはシステム負荷を考慮
11. ~~**`payment_failed`**~~ - オーバースペック

### 優先度：低（将来実装）

1. **`instant_photo_booking_started`** - 撮影開始通知
2. **`message_group_invite`** - グループ会話招待通知
3. **`message_group_message`** - グループ会話メッセージ通知
4. **`payment_success`** - 決済成功通知（即座撮影以外）
5. **`system_maintenance`** - システムメンテナンス通知
6. **`system_update`** - システムアップデート通知
7. **`system_security_alert`** - セキュリティアラート
8. **`general_announcement`** - 一般お知らせ

## 通知設定との連携

### 通知設定の種類

通知設定は`notification_settings`テーブルで管理され、以下の設定が可能です：

1. **グローバル設定**
   - `email_enabled_global`: メール通知の全体ON/OFF
   - `push_enabled_global`: プッシュ通知の全体ON/OFF
   - `toast_enabled`: トースト通知のON/OFF
   - `realtime_enabled`: リアルタイム通知（Supabase Realtime）のON/OFF

2. **種別ごとの設定**
   - `email_enabled`: 種別ごとのメール通知ON/OFF（JSON形式）
   - `push_enabled`: 種別ごとのプッシュ通知ON/OFF（JSON形式）

### 通知種別と設定キーのマッピング

`useNotifications`フック内で、通知種別から設定キーへのマッピングが実装されています：

```typescript
const getNotificationSettingKey = (type: NotificationType): string | null => {
  if (type.startsWith('instant_photo_')) {
    return 'instant_requests';
  }
  if (type.startsWith('photo_session_')) {
    return 'booking_reminders';
  }
  if (type.startsWith('message_')) {
    return 'messages';
  }
  if (type.startsWith('system_')) {
    return 'system_updates';
  }
  return null; // その他の通知種別はデフォルトで有効
};
```

### フィルタリングロジック

`isNotificationEnabled`関数により、以下の条件で通知がフィルタリングされます：

1. `push_enabled_global`が`false`の場合、すべての通知が無効
2. 通知種別に対応する設定キーが存在する場合、`push_enabled[settingKey]`をチェック
3. 設定キーが存在しない場合、デフォルトで有効

### 設定変更時の動作

- 通知設定が変更されると、`useNotifications`フックが自動的に再初期化
- リアルタイム接続が再確立され、新しい設定が反映される
- 設定変更後、既存の通知一覧は再取得される

## 今後の実装計画

### Phase 1: 高優先度通知の実装（即座実装）

1. **撮影会予約関連**
   - `photo_session_booking_confirmed`
   - `photo_session_booking_cancelled`
   - `photo_session_slot_available`

2. **即座撮影関連**
   - `instant_photo_match_found`
   - `instant_photo_payment_received`
   - `instant_photo_photos_delivered`

3. **メッセージ関連**
   - `message_new_message`（必要性を検討）

### Phase 2: 中優先度通知の実装（次期実装）

1. **即座撮影関連**
   - `instant_photo_booking_completed`

2. **レビュー関連**
   - `review_received`

### 実装見送り（システム負荷・オーバースペックを考慮）

以下の通知は、システム負荷やオーバースペックの観点から実装を見送りました：

1. **定期実行タスクが必要な通知**（システム負荷を考慮）
   - `photo_session_reminder` - お気に入り登録で代替可能
   - `photo_session_review_request` - お気に入り登録で代替可能
   - `review_reminder` - オーバースペック

2. **オーバースペックと判断した通知**
   - `instant_photo_new_request` - 不公平性の懸念、システム負荷を考慮
   - `photo_session_document_signed` - 将来機能
   - `photo_session_photos_available` - 将来機能
   - フォロー関連（4種類全て） - ソーシャル機能は現状不要
   - `payment_failed` - エラーハンドリングで代替可能

### Phase 3: 低優先度通知の実装（将来実装）

1. **オプション機能**
   - `instant_photo_booking_started`

2. **管理機能**
   - `system_maintenance`
   - `system_update`
   - `system_security_alert`
   - `general_announcement`

3. **将来機能**
   - `message_group_invite`
   - `message_group_message`
   - `payment_success`（即座撮影以外）

### 実装時の注意点

1. **通知の重複を避ける**
   - 既にリアルタイム更新がある機能（メッセージングなど）では、通知の必要性を検討
   - トースト通知とリアルタイム通知の使い分け

2. **パフォーマンスへの配慮**
   - 大量の通知を一度に送信する場合は、バッチ処理を検討
   - 通知設定のチェックを効率的に実装
   - **システム負荷を考慮**: cron jobや定期実行タスクは現時点では実装を見送り

3. **ユーザー体験の最適化**
   - 通知の頻度が高すぎないように調整
   - 重要な通知とそうでない通知の優先度を適切に設定
   - 代替手段（お気に入り登録など）で十分な場合は通知を実装しない

4. **エラーハンドリング**
   - 通知作成失敗時も、メイン処理は継続できるように実装
   - 通知作成のエラーはログに記録し、メイン処理には影響させない

5. **公平性の確保**
   - 通知による不公平性が生まれないように注意（例: `instant_photo_new_request`は実装見送り）

## 参考ファイル

- `src/types/notification.ts`: 通知型定義
- `src/app/actions/notifications.ts`: 通知作成Server Action
- `src/hooks/useNotifications.ts`: 通知取得・管理フック
- `src/components/notifications/NotificationCenter.tsx`: 通知表示UI
- `src/app/actions/organizer-model.ts`: 実装済み通知例（運営者招待）
- `src/components/photo-sessions/ParticipantManagement.tsx`: 実装済み通知例（参加者メッセージ、改善が必要）
- `src/app/actions/settings.ts`: 通知設定管理

## 更新履歴

- **2025-01-13**: 初版作成
- **2025-01-13**: 実装不要と判断した通知を明確化、定期実行タスク（cron job）はシステム負荷を考慮して実装見送りと判断

