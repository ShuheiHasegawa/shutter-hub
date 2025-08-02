# 即座撮影システム 仕様書

> 参照ルール: `.cursor/rules/dev-rules/instant-photo-request.mdc`

## 📋 システム概要

**即座撮影システム** は、旅行先や外出先でその場にいるカメラマンに即座撮影を依頼できる**リアルタイムマッチング機能**です。「撮影業界のUber」をコンセプトとしたサービスです。

### 🎯 ターゲットユーザー
- **一般観光客**: 旅行先での記念撮影
- **カップル・家族**: 特別な瞬間の撮影
- **インスタグラマー**: SNS映えする写真撮影
- **外国人観光客**: 日本での思い出作り

---

## 🚀 主要機能

### 1. ゲスト機能（認証不要）

#### 制限事項
- **撮影回数**: 月3回まで
- **検索範囲**: 半径1km以内
- **撮影時間**: 15分/30分/45分/60分選択可能
- **写真枚数**: 最大20枚
- **決済方法**: クレジットカードのみ（エスクロー決済）

#### 基本フロー
```
1. 位置情報許可 → 2. 撮影リクエスト作成 → 3. 近くのカメラマン検索 
→ 4. リクエスト送信 → 5. マッチング → 6. エスクロー決済 → 7. 撮影実行 → 8. 写真受け渡し
```

### 2. 撮影リクエスト機能

#### リクエスト項目
- **撮影タイプ**: portrait, couple, family, group, landscape, pet
- **緊急度**: normal（通常）, urgent（重要）
  - 重要リクエストはカメラマンに優先表示されます
- **撮影時間**: 15分/30分/45分/60分（選択式）
- **希望料金**: ¥0以上（自由入力）
- **参加人数**: 1〜10名
- **特別リクエスト**: 自由記述

#### ゲスト情報
- **お名前** (必須)
- **電話番号** (必須)
- **メールアドレス** (任意)

### 3. 位置ベースマッチング

#### 位置情報管理
- **精度レベル**: 高精度/中精度/低精度の表示
- **住所表示**: 逆ジオコーディングによる住所表示
- **ランドマーク**: 近くの観光地自動検出
- **検索半径**: 1km以内（固定）

#### カメラマン検索
- **リアルタイム位置情報**: オンライン状態のカメラマンのみ
- **評価・料金情報**: 過去の評価と即座撮影料金
- **応答時間**: 平均応答時間の表示
- **表示順序**: 重要リクエスト優先表示、その後距離順

### 4. 料金体系

#### 基本料金
- **ポートレート（15分）**
- **カップル・友人（30分）**
- **ファミリー（30分）**
- **グループ（30分）**
- **ペット撮影（30分）**

#### 追加料金
- **緊急料金**: 重要リクエスト +¥1,500
- **休日料金**: +¥1,500
- **夜間料金（18時以降）**: +¥2,000

#### プラットフォーム手数料
- **カメラマン報酬計算**: 総額 - プラットフォーム手数料（10%）

---

## 💳 エスクロー決済システム

### 決済フロー
1. **エスクロー預託**: 決済完了時に資金を一時預託
2. **撮影実行**: カメラマンが撮影を実行
3. **写真配信**: 編集済み写真の配信
4. **受取確認**: ゲストによる受取確認
5. **決済完了**: カメラマンへの支払い実行

### 自動確認機能
- **自動確認時間**: 72時間（メルカリ方式）
- **手動確認**: ゲストによる早期確認可能
- **争議機能**: 問題がある場合の争議申請

### 配信方法
- **直接アップロード**: システム内配信
- **外部URL**: ギガファイル便等の外部サービス
- **クラウドストレージ**: Google Drive, Dropbox等

---

## 🔄 システムフロー

### 1. リクエスト作成フロー
```typescript
// 位置情報取得
location: {
  latitude: number,
  longitude: number,
  address?: string,
  landmark?: string
}

// リクエストデータ
request: {
  guest_name: string,
  guest_phone: string,
  guest_email?: string,
  party_size: number,
  request_type: 'portrait' | 'couple' | 'family' | 'group' | 'landscape' | 'pet',
  urgency: 'normal' | 'urgent',
  duration: 15 | 30 | 45 | 60,
  budget: number, // 希望料金：¥0以上の自由入力
  special_requests?: string
}
```

### 2. マッチングフロー
```typescript
// 自動マッチング（最大3名に通知）
auto_match_request(request_id) → {
  success: boolean,
  message: string,
  matched_photographer_id?: string
}

// カメラマン応答
respond_to_request(request_id, photographer_id, response_type) → {
  success: boolean,
  message: string,
  is_matched: boolean
}
```

### 3. 決済・配信フロー
```typescript
// エスクロー決済
createEscrowPayment(booking_id, guest_phone) → {
  clientSecret: string,
  escrowPayment: EscrowPayment
}

// 写真配信
deliverPhotos(delivery_data) → PhotoDelivery

// 受取確認
confirmDeliveryWithReview(confirm_data) → void
```

---

## 📱 UI/UX設計

### メインページ
- **ランディングページ**: `/instant`
- **位置情報許可**: LocationPermissionCheck
- **リクエストフォーム**: QuickRequestForm（タブ切り替え式）
- **地図表示**: InstantPhotoMap（カメラマン位置表示）

### 進捗管理
- **リアルタイム通知**: Supabase Realtime使用
- **ステータス表示**: pending → matched → in_progress → delivered → completed
- **通知履歴**: 通知センター統合

### 決済ページ
- **決済フォーム**: `/instant/payment/[bookingId]`
- **ステップインジケーター**: 4段階表示
- **料金内訳**: 詳細な料金表示
- **エスクロー説明**: 安全性の説明

### 確認ページ
- **配信確認**: `/instant/confirm/[bookingId]`
- **レビューフォーム**: 詳細評価システム
- **争議申請**: 問題発生時の対応

---

## 🗄️ データベース設計

### 主要テーブル
1. **instant_photo_requests**: リクエスト情報
2. **photographer_locations**: カメラマン位置情報
3. **instant_bookings**: 予約情報
4. **escrow_payments**: エスクロー決済
5. **photo_deliveries**: 写真配信
6. **instant_photo_reviews**: レビュー
7. **instant_photo_disputes**: 争議

### ストアドプロシージャ
- **find_nearby_photographers**: 近くのカメラマン検索
- **auto_match_request**: 自動マッチング
- **respond_to_request**: カメラマン応答処理
- **check_guest_usage_limit**: ゲスト利用制限チェック
- **process_auto_confirmations**: 自動確認処理

---

## 🎛️ 管理・運用機能

### 利用制限管理
- **月次制限**: ゲスト利用回数の管理
- **利用履歴**: guest_usage_history テーブル
- **制限チェック**: リクエスト作成時の自動チェック

### 自動処理
- **期限切れリクエスト**: 2時間で自動無効化
- **自動確認**: 72時間後の自動受取確認
- **通知システム**: リアルタイム通知配信

### セキュリティ
- **RLS設定**: Row Level Security適用
- **認証不要アクセス**: ゲスト機能の安全な実装
- **データ保護**: 個人情報の適切な管理

---

## 📂 ファイル構成

### フロントエンド
```
src/
├── app/[locale]/instant/
│   ├── page.tsx                 # メインランディングページ
│   ├── payment/[bookingId]/     # 決済ページ
│   ├── confirm/[bookingId]/     # 受取確認ページ
│   └── deliver/[bookingId]/     # 配信ページ（カメラマン用）
├── components/instant/
│   ├── InstantPhotoLanding.tsx  # ランディングコンポーネント
│   ├── QuickRequestForm.tsx     # リクエストフォーム
│   ├── InstantPhotoMap.tsx      # 地図表示
│   ├── EscrowPaymentForm.tsx    # エスクロー決済フォーム
│   ├── DeliveryConfirmationForm.tsx # 受取確認フォーム
│   ├── PhotoDeliveryForm.tsx    # 写真配信フォーム
│   ├── HowItWorks.tsx           # 使い方説明
│   └── PricingDisplay.tsx       # 料金表示
├── app/actions/
│   ├── instant-photo.ts         # リクエスト関連アクション
│   └── instant-payment.ts       # 決済関連アクション
└── types/
    └── instant-photo.ts         # 型定義
```

### バックエンド
```
supabase/migrations/
├── 20241201000009_create_instant_photo_system.sql    # メインシステム
└── 20241201000011_create_escrow_payment_system.sql   # エスクロー決済
```

---

## 🔧 技術実装詳細

### リアルタイム通知
- **Supabase Realtime**: WebSocket接続によるリアルタイム更新
- **通知タイプ**: new_request, match_found, payment_received, booking_completed
- **統合通知システム**: useNotifications フック使用

### 位置情報処理
- **Geolocation API**: ブラウザ標準API使用
- **精度チェック**: 高精度/中精度/低精度の判定
- **PostGIS**: 地理的検索と距離計算

### エスクロー決済
- **Stripe Integration**: PaymentIntent with manual capture
- **セキュリティ**: PCI DSS準拠
- **自動処理**: 72時間後の自動確認

### 状態管理
- **Server Actions**: Next.js App Router使用
- **エラーハンドリング**: 統一されたApiResponse型
- **ログ**: 構造化ログシステム

---

## 🚀 今後の拡張予定

### フェーズ2
- **対応エリア拡大**: 大阪・京都・神戸
- **多言語対応**: 外国人観光客向け
- **ペット撮影の拡充**: 専門カメラマンの育成

### フェーズ3
- **全国展開**: 主要観光地対応
- **プレミアム機能**: 高品質撮影オプション
- **お気に入り機能**: カメラマンのリピート予約

### フェーズ4
- **海外展開**: アジア圏での展開
- **API公開**: 他サービスとの連携
- **企業向けサービス**: 法人利用対応

---

## 📝 修正内容（シンプル化）

### ✅ 残した機能
- **撮影タイプ**: `portrait, couple, family, group, landscape, pet`
  - ペット撮影は旅行でのペット同伴撮影需要に対応
- **撮影時間**: `15分/30分/45分/60分`（即座性を重視）
- **希望料金**: ¥0以上の自由入力
- **緊急度システム**: 重要リクエストの優先表示
- **基本料金体系**: 料金表示のないシンプルな設定
- **エスクロー決済**: 安全性の核となる機能

### ❌ 削除した機能
- **撮影タイプ**: `event, product`
  - イベント：60-90分の長時間で「即座」から外れる
  - 商品：ビジネス用途で個人向けサービスとミスマッチ
- **時間指定緊急度**: `now, within_30min, within_1hour`（時間指定より重要度での優先表示に変更）
- **複雑な割引システム**: 天候連動、グループ割引、リピーター割引
- **複雑な決済手段**: PayPay, LINE Pay（クレジットカードのみに集約）
- **プレミアム機能**: 3km検索範囲等（MVPでは不要）
- **新機能アイデア**: お気に入り、撮影スタイル指定等（将来機能に移行）

### 🎯 修正理由
1. **コンセプトの一貫性**: 「即座撮影」に不適合な機能を削除
2. **実装の簡素化**: 複雑な機能を削除してMVPに集中
3. **運用の容易さ**: 料金表示のないシンプルな料金体系
4. **ユーザビリティ**: 緊急度を時間指定から重要度に変更して理解しやすく

### ✨ 最新の修正内容（第2回）
- **料金表示削除**: 基本料金から`¥3,000〜`等の料金表示を削除
- **緊急度シンプル化**: `now/within_30min/within_1hour`を`normal/urgent`に変更
- **予算→希望料金**: より適切な表現に変更
- **優先表示機能**: 重要リクエストのカメラマン側優先表示機能を追加

---

この即座撮影システムは、「撮影業界のUber」のコンセプトに忠実で、シンプルかつ実用的な機能に絞り込んだ、認証不要で気軽に利用できる革新的な撮影マッチングサービスです。