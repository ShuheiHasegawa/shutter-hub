# 設定ページとデータベースの照合結果

## 設定ページで表示されている項目（UserSettings）

### 1. 通知設定
- `emailNotifications` (boolean)
- `pushNotifications` (boolean)
- `smsNotifications` (boolean)

### 2. 通知種別
- `bookingReminders` (boolean)
- `instantRequests` (boolean)
- `messageNotifications` (boolean)
- `marketingEmails` (boolean)
- `systemUpdates` (boolean)

### 3. プライバシー設定
- `profileVisibility` ('public' | 'private' | 'verified_only')
- `showLocation` (boolean)
- `showOnlineStatus` (boolean)
- `allowDirectMessages` (boolean)

### 4. 撮影関連設定
- `instantPhotoAvailable` (boolean) - フォトグラファーのみ
- `maxTravelDistance` (number) - フォトグラファーのみ
- `autoAcceptBookings` (boolean) - 運営者のみ
- `requirePhotoConsent` (boolean)

### 5. 表示設定
- `language` (string)
- `timezone` (string)
- `currency` (string)

### 6. セキュリティ設定
- `twoFactorEnabled` (boolean)

---

## データベーステーブル構造

### profiles テーブル
- `id` (uuid)
- `email` (text)
- `display_name` (text)
- `avatar_url` (text)
- `user_type` (user_type enum)
- `bio` (text)
- `location` (text)
- `website` (text)
- `instagram_handle` (text)
- `twitter_handle` (text)
- `phone` (text)
- `is_verified` (boolean)
- `role` (user_role enum)
- `username` (text)
- `username_updated_at` (timestamp)

**設定ページの項目との対応:**
- ❌ 通知設定 → なし
- ❌ 通知種別 → なし
- ✅ `profileVisibility` → なし（user_preferencesに存在）
- ✅ `showLocation` → `location`フィールドは存在するが、表示/非表示の設定はなし
- ✅ `showOnlineStatus` → user_preferencesに存在
- ✅ `allowDirectMessages` → user_preferencesに存在
- ❌ 撮影関連設定 → なし
- ❌ 表示設定 → なし
- ❌ セキュリティ設定 → なし

### notification_settings テーブル
- `id` (uuid)
- `user_id` (uuid)
- `email_enabled` (jsonb) - 通知種別ごとの設定
- `push_enabled` (jsonb) - 通知種別ごとの設定
- `in_app_enabled` (jsonb) - 通知種別ごとの設定
- `email_enabled_global` (boolean) - メール通知全体のON/OFF
- `push_enabled_global` (boolean) - プッシュ通知全体のON/OFF
- `in_app_enabled_global` (boolean) - アプリ内通知全体のON/OFF
- `quiet_hours_enabled` (boolean)
- `quiet_hours_start` (time)
- `quiet_hours_end` (time)
- `quiet_hours_timezone` (text)
- `digest_enabled` (boolean)
- `digest_frequency` (text)

**設定ページの項目との対応:**
- ✅ `emailNotifications` → `email_enabled_global`
- ✅ `pushNotifications` → `push_enabled_global`
- ❌ `smsNotifications` → なし（SMS通知用のテーブルがない）
- ✅ `bookingReminders` → `email_enabled.booking_reminders`, `push_enabled.booking_reminders` など
- ✅ `instantRequests` → `email_enabled.instant_requests`, `push_enabled.instant_requests` など
- ✅ `messageNotifications` → `email_enabled.messages`, `push_enabled.messages` など
- ✅ `marketingEmails` → `email_enabled.marketing` など
- ✅ `systemUpdates` → `email_enabled.system_updates`, `push_enabled.system_updates` など

### user_preferences テーブル
- `user_id` (uuid)
- `follow_approval_required` (boolean)
- `allow_messages_from_followers` (boolean)
- `allow_messages_from_following` (boolean)
- `allow_messages_from_strangers` (boolean)
- `show_read_status` (boolean)
- `show_online_status` (boolean)
- `notify_new_follower` (boolean)
- `notify_follow_request` (boolean)
- `notify_new_message` (boolean)
- `notify_group_message` (boolean)
- `notify_system_message` (boolean)
- `profile_visibility` (text) - 'public' | 'private' | 'verified_only'
- `activity_visibility` (text)

**設定ページの項目との対応:**
- ✅ `profileVisibility` → `profile_visibility`
- ❌ `showLocation` → なし（profiles.locationの表示/非表示設定がない）
- ✅ `showOnlineStatus` → `show_online_status`
- ✅ `allowDirectMessages` → `allow_messages_from_strangers`（近似）

---

## 未対応の項目（データベースに保存先がない）

### 通知設定
- ❌ `smsNotifications` - SMS通知用のテーブルがない

### プライバシー設定
- ❌ `showLocation` - locationの表示/非表示設定がない

### 撮影関連設定
- ❌ `instantPhotoAvailable` - フォトグラファーの即座撮影受け付け設定がない
- ❌ `maxTravelDistance` - フォトグラファーの最大移動距離設定がない
- ❌ `autoAcceptBookings` - 運営者の自動承認設定がない
- ❌ `requirePhotoConsent` - 写真公開前の同意必須設定がない

### 表示設定
- ❌ `language` - ユーザーの言語設定がない
- ❌ `timezone` - ユーザーのタイムゾーン設定がない（notification_settingsにはquiet_hours_timezoneがある）
- ❌ `currency` - ユーザーの通貨設定がない

### セキュリティ設定
- ❌ `twoFactorEnabled` - 二段階認証の有効/無効設定がない

---

## 実装が必要な対応

### 1. 新規テーブル作成が必要な項目

#### user_settings テーブル（新規作成推奨）
以下の項目を保存するためのテーブルが必要：

```sql
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  
  -- 表示設定
  language text DEFAULT 'ja',
  timezone text DEFAULT 'Asia/Tokyo',
  currency text DEFAULT 'JPY',
  
  -- セキュリティ設定
  two_factor_enabled boolean DEFAULT false,
  
  -- 撮影関連設定（ユーザータイプ別）
  instant_photo_available boolean DEFAULT false, -- フォトグラファー
  max_travel_distance integer DEFAULT 10, -- フォトグラファー（km）
  auto_accept_bookings boolean DEFAULT false, -- 運営者
  require_photo_consent boolean DEFAULT true,
  
  -- プライバシー設定（追加）
  show_location boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### sms_notification_settings テーブル（新規作成推奨）
SMS通知用のテーブル：

```sql
CREATE TABLE sms_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  sms_enabled_global boolean DEFAULT false,
  sms_enabled jsonb DEFAULT '{}',
  phone_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. 既存テーブルへの追加が必要な項目

#### profiles テーブル
- なし（既存のフィールドで対応可能）

#### notification_settings テーブル
- なし（既存のフィールドで対応可能）

#### user_preferences テーブル
- `show_location` (boolean) - locationの表示/非表示設定を追加

---

## 保存処理の実装方針

### handleSave関数の実装が必要

現在の`handleSave`は実装されていないため、以下の処理を実装する必要があります：

1. **notification_settingsテーブルへの保存**
   - `email_enabled_global`, `push_enabled_global`の更新
   - `email_enabled`, `push_enabled`のJSONB更新（通知種別ごと）

2. **user_preferencesテーブルへの保存**
   - `profile_visibility`, `show_online_status`, `allow_messages_from_strangers`の更新

3. **user_settingsテーブルへの保存**（新規作成後）
   - `language`, `timezone`, `currency`の更新
   - `two_factor_enabled`の更新
   - ユーザータイプ別の撮影関連設定の更新

4. **sms_notification_settingsテーブルへの保存**（新規作成後）
   - `sms_enabled_global`の更新

---

## まとめ

### 現在保存可能な項目
- ✅ 通知方法（メール、プッシュ）のON/OFF → `notification_settings`
- ✅ 通知種別のON/OFF → `notification_settings`のJSONBフィールド
- ✅ プロフィール表示 → `user_preferences.profile_visibility`
- ✅ オンライン状態表示 → `user_preferences.show_online_status`
- ✅ ダイレクトメッセージ許可 → `user_preferences.allow_messages_from_strangers`

### 保存先がない項目（新規テーブルまたはカラム追加が必要）
- ❌ SMS通知
- ❌ 位置情報表示
- ❌ 撮影関連設定（即座撮影、移動距離、自動承認、写真同意）
- ❌ 表示設定（言語、タイムゾーン、通貨）
- ❌ セキュリティ設定（二段階認証）


