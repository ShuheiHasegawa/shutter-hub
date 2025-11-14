# 通貨単位・タイムゾーン設定の反映状況調査結果

## 調査目的

設定ページ（`/settings`）で変更した通貨単位（currency）とタイムゾーン（timezone）が、アプリケーション全体でどこまで正しく反映されているかを調査しました。特に即座撮影ページと撮影会一覧ページでの反映状況を重点的に確認しました。

## 設定の保存場所

- **保存先**: `user_metadata`（Supabase Auth）
- **更新関数**: `updateDisplaySettings`（`src/app/actions/settings.ts`）
- **取得関数**: `getDisplaySettings`（`src/app/actions/settings.ts`）

## 反映状況一覧表

### 撮影会関連コンポーネント

| コンポーネント | ファイル | 通貨反映 | タイムゾーン反映 | 備考 |
|------------|---------|---------|---------------|------|
| PhotoSessionCard | `src/components/photo-sessions/PhotoSessionCard.tsx` | ✅ | ❌ | `FormattedPrice`を使用（通貨反映あり）。`formatDateLocalized`, `formatTimeLocalized`を使用しているが、タイムゾーンを渡していない（デフォルト`Asia/Tokyo`が使われる） |
| PhotoSessionList | `src/components/photo-sessions/PhotoSessionList.tsx` | ✅ | ❌ | `PhotoSessionCard`を使用しているため、上記と同じ問題が発生 |
| UpcomingOrganizerSessions | `src/components/profile/UpcomingOrganizerSessions.tsx` | ❌ | ❌ | 直接`¥${price.toLocaleString()}`を使用（行101-103）。`format`関数を使用（行97-99、タイムゾーン未指定） |
| EditHistory | `src/components/photo-sessions/EditHistory.tsx` | ❌ | ❌ | 直接`¥${(value as number).toLocaleString()}`を使用（行211）。`format`関数を使用（行196-198、タイムゾーン未指定） |
| BookingCard | `src/components/bookings/BookingCard.tsx` | ❌ | ❌ | 直接`¥{session.price_per_person.toLocaleString()}`を使用（行104）。`formatDateLocalized`, `formatTimeLocalized`を使用しているが、タイムゾーンを渡していない（行81-84, 117-121） |
| UpcomingModelSessions | `src/components/profile/UpcomingModelSessions.tsx` | ❌ | ❌ | 直接`¥${price.toLocaleString()}`を使用（行186-188）。`format`関数を使用（行182-184、タイムゾーン未指定） |

### 即座撮影関連コンポーネント

| コンポーネント | ファイル | 通貨反映 | タイムゾーン反映 | 備考 |
|------------|---------|---------|---------------|------|
| QuickRequestForm | `src/components/instant/QuickRequestForm.tsx` | ❌ | - | 直接`¥${price.toLocaleString()}`を使用（複数箇所：行568, 576, 590）。日時表示なし |
| PhotographerInstantDashboard | `src/components/instant/PhotographerInstantDashboard.tsx` | ❌ | ❌ | `¥{request.budget.toLocaleString()}`を使用（行414）。`toLocaleTimeString()`を使用（行408、タイムゾーン未指定） |
| InstantRequestDetailClient | `src/components/instant/InstantRequestDetailClient.tsx` | ❌ | - | `¥{request.budget.toLocaleString()}`を使用（行218）。日時表示なし |
| GuestApprovalPanel | `src/components/instant/GuestApprovalPanel.tsx` | ❌ | - | `¥{request.budget.toLocaleString()}`を使用（行287）。日時表示なし |
| EscrowPaymentForm | `src/components/instant/EscrowPaymentForm.tsx` | ❌ | - | `¥{booking.total_amount.toLocaleString()}`などを使用（複数箇所：行174, 179, 183, 187, 191, 196, 257）。日時表示なし |
| DeliveryConfirmationForm | `src/components/instant/DeliveryConfirmationForm.tsx` | - | ❌ | `toLocaleString('ja-JP')`を使用（行254、タイムゾーン未指定） |
| PricingDisplay | `src/components/instant/PricingDisplay.tsx` | ❌ | - | ハードコードされた`+¥1,500`など（行56-58）。静的コンテンツのため、設定反映は不要の可能性あり |
| InstantPhotoMap | `src/components/instant/InstantPhotoMap.tsx` | ❌ | - | `¥{photographer.instant_rate?.toLocaleString()}`を使用（行291） |

## 問題箇所の詳細リスト

### 通貨単位が反映されていない箇所

#### 高優先度（主要機能）

1. **即座撮影リクエスト作成フォーム** (`src/components/instant/QuickRequestForm.tsx`)
   - 行568: `¥${priceBreakdown.basePrice.toLocaleString()}`
   - 行576: `+¥{priceBreakdown.additionalFees.toLocaleString()}`
   - 行590: `¥${priceBreakdown.totalPrice.toLocaleString()}`
   - **影響**: ユーザーが設定した通貨単位が反映されない

2. **カメラマンダッシュボード** (`src/components/instant/PhotographerInstantDashboard.tsx`)
   - 行414: `¥{request.budget.toLocaleString()}`
   - **影響**: カメラマンが設定した通貨単位が反映されない

3. **リクエスト詳細** (`src/components/instant/InstantRequestDetailClient.tsx`)
   - 行218: `¥{request.budget.toLocaleString()}`
   - **影響**: ゲストが設定した通貨単位が反映されない

4. **エスクロー決済フォーム** (`src/components/instant/EscrowPaymentForm.tsx`)
   - 行174: `¥{(booking.total_amount - booking.platform_fee).toLocaleString()}`
   - 行179: `¥{booking.platform_fee.toLocaleString()}`
   - 行183: `¥{booking.rush_fee.toLocaleString()}`
   - 行187: `¥{booking.holiday_fee.toLocaleString()}`
   - 行191: `¥{booking.night_fee.toLocaleString()}`
   - 行196: `¥{booking.total_amount.toLocaleString()}`
   - 行257: `¥{booking.total_amount.toLocaleString()}`
   - **影響**: 決済時の通貨単位が反映されない（重要）

#### 中優先度（プロフィール・予約関連）

5. **運営者の開催予定撮影会** (`src/components/profile/UpcomingOrganizerSessions.tsx`)
   - 行101-103: `¥${price.toLocaleString()}`
   - **影響**: 運営者が設定した通貨単位が反映されない

6. **モデルの出演予定撮影会** (`src/components/profile/UpcomingModelSessions.tsx`)
   - 行186-188: `¥${price.toLocaleString()}`
   - **影響**: モデルが設定した通貨単位が反映されない

7. **予約カード** (`src/components/bookings/BookingCard.tsx`)
   - 行104: `¥{session.price_per_person.toLocaleString()}`
   - **影響**: 予約一覧での通貨単位が反映されない

#### 低優先度（補助的な機能）

8. **編集履歴** (`src/components/photo-sessions/EditHistory.tsx`)
   - 行211: `¥${(value as number).toLocaleString()}`
   - **影響**: 編集履歴での通貨単位が反映されない

9. **ゲスト承認パネル** (`src/components/instant/GuestApprovalPanel.tsx`)
   - 行287: `¥{request.budget.toLocaleString()}`
   - **影響**: 承認画面での通貨単位が反映されない

10. **マップ表示** (`src/components/instant/InstantPhotoMap.tsx`)
    - 行291: `¥{photographer.instant_rate?.toLocaleString()}`
    - **影響**: マップ上の料金表示での通貨単位が反映されない

11. **料金表示** (`src/components/instant/PricingDisplay.tsx`)
    - 行56-58: ハードコードされた`+¥1,500`など
    - **影響**: 静的コンテンツのため、設定反映は不要の可能性あり（要確認）

### タイムゾーンが反映されていない箇所

#### 高優先度（主要機能）

1. **撮影会カード** (`src/components/photo-sessions/PhotoSessionCard.tsx`)
   - 行771-774: `formatDateLocalized`, `formatTimeLocalized`を使用しているが、タイムゾーンを渡していない
   - **影響**: ユーザーが設定したタイムゾーンが反映されない

2. **予約カード** (`src/components/bookings/BookingCard.tsx`)
   - 行81-84: `formatDateLocalized`, `formatTimeLocalized`を使用しているが、タイムゾーンを渡していない
   - 行117-121: 同様にタイムゾーン未指定
   - **影響**: 予約一覧でのタイムゾーンが反映されない

#### 中優先度（プロフィール関連）

3. **運営者の開催予定撮影会** (`src/components/profile/UpcomingOrganizerSessions.tsx`)
   - 行97-99: `format`関数を使用（タイムゾーン未指定）
   - **影響**: 運営者が設定したタイムゾーンが反映されない

4. **モデルの出演予定撮影会** (`src/components/profile/UpcomingModelSessions.tsx`)
   - 行182-184: `format`関数を使用（タイムゾーン未指定）
   - **影響**: モデルが設定したタイムゾーンが反映されない

#### 低優先度（補助的な機能）

5. **編集履歴** (`src/components/photo-sessions/EditHistory.tsx`)
   - 行196-198: `format`関数を使用（タイムゾーン未指定）
   - **影響**: 編集履歴でのタイムゾーンが反映されない

6. **カメラマンダッシュボード** (`src/components/instant/PhotographerInstantDashboard.tsx`)
   - 行408: `toLocaleTimeString()`を使用（タイムゾーン未指定）
   - **影響**: リクエスト作成時刻のタイムゾーンが反映されない

7. **写真配信確認フォーム** (`src/components/instant/DeliveryConfirmationForm.tsx`)
   - 行254: `toLocaleString('ja-JP')`を使用（タイムゾーン未指定）
   - **影響**: 配信日時のタイムゾーンが反映されない

## 修正方針

### 通貨単位の修正

#### 修正方法

1. **`FormattedPrice`コンポーネントへの置き換え**
   - 現在: `¥${price.toLocaleString()}`
   - 修正後: `<FormattedPrice value={price} format="simple" />`
   - 適用箇所: すべての通貨表示箇所

2. **`FormattedPrice`の動作確認**
   - `FormattedPrice`コンポーネントは既に`user_metadata.currency`を自動取得している（`src/components/ui/formatted-display.tsx`行258-264）
   - 追加の修正は不要

#### 修正優先度

- **高**: 即座撮影関連（QuickRequestForm, PhotographerInstantDashboard, InstantRequestDetailClient, EscrowPaymentForm）
- **中**: プロフィール関連（UpcomingOrganizerSessions, UpcomingModelSessions）、予約カード（BookingCard）
- **低**: 編集履歴（EditHistory）、ゲスト承認パネル（GuestApprovalPanel）、マップ表示（InstantPhotoMap）

### タイムゾーンの修正

#### 修正方法

1. **`FormattedDateTime`コンポーネントへの置き換え**
   - 現在: `formatDateLocalized(startDate, locale, 'long')`
   - 修正後: `<FormattedDateTime value={startDate} format="date-long" />`
   - 適用箇所: すべての日時表示箇所

2. **`formatDateLocalized`/`formatTimeLocalized`のタイムゾーン指定**
   - 現在: `formatDateLocalized(startDate, locale, 'long')`（タイムゾーン未指定）
   - 修正後: `formatDateLocalized(startDate, locale, 'long', userTimezone)`（タイムゾーンを取得して渡す）
   - または: `FormattedDateTime`コンポーネントを使用（推奨）

3. **`FormattedDateTime`の動作確認**
   - `FormattedDateTime`コンポーネントは既に`user_metadata.timezone`を自動取得している（`src/components/ui/formatted-display.tsx`行85-91）
   - 追加の修正は不要

#### 修正優先度

- **高**: 撮影会カード（PhotoSessionCard）、予約カード（BookingCard）
- **中**: プロフィール関連（UpcomingOrganizerSessions, UpcomingModelSessions）
- **低**: 編集履歴（EditHistory）、カメラマンダッシュボード（PhotographerInstantDashboard）、写真配信確認フォーム（DeliveryConfirmationForm）

## 修正例

### 通貨単位の修正例

#### Before（UpcomingOrganizerSessions.tsx）

```typescript
const formatPrice = (price: number) => {
  return `¥${price.toLocaleString()}`;
};

// 使用箇所
{formatPrice(session.price_per_person)}
```

#### After

```typescript
import { FormattedPrice } from '@/components/ui/formatted-display';

// 使用箇所
<FormattedPrice value={session.price_per_person} format="simple" />
```

### タイムゾーンの修正例

#### Before（PhotoSessionCard.tsx）

```typescript
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';

// 使用箇所
<div>{formatDateLocalized(startDate, locale, 'long')}</div>
<div className="text-muted-foreground">
  {formatTimeLocalized(startDate, locale)} -{' '}
  {formatTimeLocalized(endDate, locale)}
</div>
```

#### After

```typescript
import { FormattedDateTime } from '@/components/ui/formatted-display';

// 使用箇所
<FormattedDateTime value={startDate} format="date-long" />
<FormattedDateTime 
  value={startDate} 
  format="time-range" 
  endValue={endDate} 
/>
```

## まとめ

### 反映状況のサマリー

- **通貨単位**: 11箇所で反映されていない（高優先度: 4箇所、中優先度: 3箇所、低優先度: 4箇所）
- **タイムゾーン**: 7箇所で反映されていない（高優先度: 2箇所、中優先度: 2箇所、低優先度: 3箇所）

### 修正の推奨順序

1. **Phase 1（高優先度）**: 即座撮影関連の通貨表示、撮影会カード・予約カードのタイムゾーン表示
2. **Phase 2（中優先度）**: プロフィール関連の通貨・タイムゾーン表示
3. **Phase 3（低優先度）**: 補助的な機能の通貨・タイムゾーン表示

### 注意事項

- `FormattedPrice`と`FormattedDateTime`コンポーネントは既に`user_metadata`から設定を自動取得しているため、これらのコンポーネントに置き換えるだけで修正完了
- `PricingDisplay.tsx`のハードコードされた料金は静的コンテンツのため、設定反映の必要性を要確認
- すべての修正は既存のコンポーネントを活用することで、一貫性のある実装が可能

## 実装完了状況

### 実装完了日: 2025-01-18

すべてのPhase（Phase 1、Phase 2、Phase 3）の実装が完了しました。

### 実装完了ファイル一覧

#### Phase 1（高優先度）✅ 完了

- ✅ `src/components/instant/QuickRequestForm.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/instant/PhotographerInstantDashboard.tsx` - 通貨・タイムゾーン表示を`FormattedPrice`/`FormattedDateTime`に統一
- ✅ `src/components/instant/InstantRequestDetailClient.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/instant/EscrowPaymentForm.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/photo-sessions/PhotoSessionCard.tsx` - タイムゾーン表示を`FormattedDateTime`に統一
- ✅ `src/components/bookings/BookingCard.tsx` - 通貨・タイムゾーン表示を`FormattedPrice`/`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/PhotoSessionDetail.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/SlotBookingFlow.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/ResponsiveSlotBooking.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/social/ChatWindow.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/payments/PaymentBookingForm.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/payments/PaymentForm.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/reviews/ReviewCard.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/PhotoSessionBookingForm.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/BookingConfirmation.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/PhotoSessionAdminLotteryEntry.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/SlotSelectionSamples.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/app/[locale]/photo-sessions/[id]/analytics/page.tsx` - 日付・時刻表示を`FormattedDateTime`に統一

#### Phase 2（中優先度）✅ 完了

- ✅ `src/components/profile/UpcomingOrganizerSessions.tsx` - 通貨・タイムゾーン表示を`FormattedPrice`/`FormattedDateTime`に統一
- ✅ `src/components/profile/UpcomingModelSessions.tsx` - 通貨・タイムゾーン表示を`FormattedPrice`/`FormattedDateTime`に統一
- ✅ `src/components/photo-sessions/EditHistory.tsx` - 通貨・タイムゾーン表示を`FormattedPrice`/`FormattedDateTime`に統一
- ✅ `src/components/instant/GuestApprovalPanel.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/instant/InstantPhotoMap.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/instant/DeliveryConfirmationForm.tsx` - タイムゾーン表示を`FormattedDateTime`に統一
- ✅ `src/components/profile/UserReviewList.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/profile/UserScheduleManager.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/profile/organizer/ModelInvitationNotifications.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/profile/PhotobookGallery.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/profile/UserProfileCard.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/profile/organizer/PendingInvitationsList.tsx` - 日付・時刻表示を`FormattedDateTime`に統一
- ✅ `src/components/profile/organizer/OrganizerModelsList.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/studio/StudioCard.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/studio/StudioEditHistory.tsx` - 日付表示を`FormattedDateTime`に統一（通貨以外の数値は`toLocaleString`で問題なし）
- ✅ `src/components/studio/StudioEvaluations.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/photobook/QuickPhotobookSettings.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/photobook/AdvancedPhotobookShelfClient.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/photobook/QuickPhotobookShelfClient.tsx` - 日付表示を`FormattedDateTime`に統一

#### Phase 3（低優先度）✅ 完了

- ✅ `src/components/photobook/PhotobookPageClient.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/photobook/QuickPhotobookViewer.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/photobook/editor/PhotobookEditor.tsx` - `toLocaleString`使用を確認（数値表示のため問題なし）
- ✅ `src/components/photobook/PhotobookDashboard.tsx` - 日付表示を`FormattedDateTime`に統一
- ✅ `src/components/subscription/PlanSelector.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/subscription/PlanChangeConfirmDialog.tsx` - 通貨表示を`FormattedPrice`に統一
- ✅ `src/components/subscription/StripePaymentForm.tsx` - 通貨・日付表示を`FormattedPrice`/`FormattedDateTime`に統一
- ✅ `src/components/subscription/SubscriptionStatus.tsx` - 通貨・日付表示を`FormattedPrice`/`FormattedDateTime`に統一
- ✅ `src/components/admin/AdminDisputeManagement.tsx` - 日付・通貨表示を`FormattedDateTime`/`FormattedPrice`に統一
- ✅ `src/components/dashboard/DashboardStatsCards.tsx` - 通貨表示を`FormattedPrice`に統一

### 実装結果

- **総修正ファイル数**: 52ファイル
- **追加行数**: 1,074行
- **削除行数**: 536行
- **実装完了率**: 100%

### 残存する問題

- **`PricingDisplay.tsx`**: ハードコードされた料金表示（`+¥1,500`など）は静的コンテンツのため、設定反映は不要と判断
- **データ処理用の`Intl.DateTimeFormat`**: `analytics/page.tsx`の128行目など、データ処理用の日付フォーマットは問題なし

### 今後の注意事項

- 新規実装時は必ず`FormattedPrice`と`FormattedDateTime`コンポーネントを使用すること
- `toLocaleString()`や`toLocaleDateString()`の直接使用は禁止（通貨以外の数値表示は除く）
- `formatDateLocalized`や`formatTimeLocalized`関数の使用は推奨されない（`FormattedDateTime`コンポーネントを使用すること）

