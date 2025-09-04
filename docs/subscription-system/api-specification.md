# サブスクリプションシステム API仕様書

> **ShutterHub サブスクリプション機能のAPI詳細仕様**

## 📋 API概要

### 設計原則
- **RESTful設計**: 標準的なHTTPメソッドとステータスコード
- **型安全性**: TypeScriptによる厳密な型定義
- **エラーハンドリング**: 統一されたエラーレスポンス形式
- **認証・認可**: Supabase Auth + RLSによる安全なアクセス制御

### ベースURL
```
Development: http://localhost:8888/api
Production: https://shutterhub.app/api
```

### 認証
```typescript
// Authorization Header
Authorization: Bearer <supabase_jwt_token>

// または Supabase Client経由
const { data, error } = await supabase.auth.getSession();
```

## 🗂️ データ型定義

### 基本型
```typescript
// ユーザータイプ
type UserType = 'model' | 'photographer' | 'organizer';

// サブスクリプション状態
type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete';

// プラン階層
type PlanTier = 'free' | 'basic' | 'premium' | 'pro' | 'business' | 'professional';

// 通貨
type Currency = 'jpy' | 'usd' | 'eur';
```

### レスポンス型
```typescript
// 成功レスポンス
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// エラーレスポンス
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// ページネーション
interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

### サブスクリプション関連型
```typescript
// サブスクリプションプラン
interface SubscriptionPlan {
  id: string;
  name: string;
  user_type: UserType;
  tier: PlanTier;
  price: number;
  currency: Currency;
  stripe_price_id: string | null;
  base_features: Record<string, any>;
  type_specific_features: Record<string, any>;
  is_active: boolean;
  display_order: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ユーザーサブスクリプション
interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  
  // リレーション
  plan?: SubscriptionPlan;
}

// 機能制限チェック結果
interface FeatureLimitCheck {
  allowed: boolean;
  current_usage: number;
  limit: number; // -1 = unlimited
  remaining: number; // Infinity for unlimited
  reset_date?: string;
}

// 機能アクセス権
interface FeatureAccess {
  [featureName: string]: boolean;
}
```

## 🔍 プラン管理API

### GET /api/subscription/plans

#### 概要
利用可能なサブスクリプションプランを取得

#### パラメータ
```typescript
interface GetPlansParams {
  user_type?: UserType;     // 特定ユーザータイプのプランのみ
  active_only?: boolean;    // アクティブなプランのみ（デフォルト: true）
  include_free?: boolean;   // フリープランを含める（デフォルト: true）
}
```

#### リクエスト例
```http
GET /api/subscription/plans?user_type=model&active_only=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### レスポンス例
```typescript
// 成功時
{
  "success": true,
  "data": [
    {
      "id": "model_free",
      "name": "モデル フリープラン",
      "user_type": "model",
      "tier": "free",
      "price": 0,
      "currency": "jpy",
      "stripe_price_id": null,
      "base_features": {
        "photobookLimit": 2,
        "premiumTemplates": false,
        "exportQuality": "standard"
      },
      "type_specific_features": {
        "portfolioLimit": 10,
        "priorityBookingTickets": 0,
        "reviewAnalytics": false
      },
      "is_active": true,
      "display_order": 0,
      "description": "基本機能を無料でご利用いただけます",
      "created_at": "2025-01-18T00:00:00Z",
      "updated_at": "2025-01-18T00:00:00Z"
    }
  ],
  "timestamp": "2025-01-18T10:30:00Z"
}
```

### GET /api/subscription/plans/{planId}

#### 概要
特定プランの詳細情報を取得

#### パラメータ
```typescript
interface GetPlanParams {
  planId: string; // パスパラメータ
}
```

#### レスポンス
```typescript
SuccessResponse<SubscriptionPlan> | ErrorResponse
```

## 👤 ユーザーサブスクリプション管理API

### GET /api/subscription/current

#### 概要
現在ログイン中ユーザーのサブスクリプション情報を取得

#### レスポンス例
```typescript
// アクティブなサブスクリプションがある場合
{
  "success": true,
  "data": {
    "id": "sub_123456",
    "user_id": "user_789",
    "plan_id": "model_basic",
    "stripe_subscription_id": "sub_1234567890",
    "status": "active",
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "cancel_at_period_end": false,
    "plan": {
      "id": "model_basic",
      "name": "モデル ベーシックプラン",
      "price": 680,
      "currency": "jpy"
    }
  },
  "timestamp": "2025-01-18T10:30:00Z"
}

// サブスクリプションがない場合（フリーユーザー）
{
  "success": true,
  "data": null,
  "message": "No active subscription found",
  "timestamp": "2025-01-18T10:30:00Z"
}
```

### POST /api/subscription/create

#### 概要
新しいサブスクリプションを作成

#### リクエストボディ
```typescript
interface CreateSubscriptionRequest {
  plan_id: string;
  payment_method_id?: string; // Stripe Payment Method ID
  trial_period_days?: number;  // トライアル期間（日数）
}
```

#### リクエスト例
```json
{
  "plan_id": "model_basic",
  "payment_method_id": "pm_1234567890",
  "trial_period_days": 30
}
```

#### レスポンス例
```typescript
// 成功時
{
  "success": true,
  "data": {
    "subscription_id": "sub_1234567890",
    "client_secret": "pi_1234567890_secret_abc123",
    "status": "incomplete",
    "requires_action": true
  },
  "timestamp": "2025-01-18T10:30:00Z"
}

// エラー時
{
  "success": false,
  "error": {
    "code": "INVALID_PLAN",
    "message": "指定されたプランが存在しないか、あなたのユーザータイプに対応していません",
    "details": {
      "plan_id": "invalid_plan",
      "user_type": "model"
    }
  },
  "timestamp": "2025-01-18T10:30:00Z"
}
```

### PUT /api/subscription/update

#### 概要
既存サブスクリプションのプラン変更

#### リクエストボディ
```typescript
interface UpdateSubscriptionRequest {
  new_plan_id: string;
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
}
```

#### レスポンス
```typescript
SuccessResponse<{
  subscription_id: string;
  old_plan_id: string;
  new_plan_id: string;
  effective_date: string;
  proration_amount?: number;
}> | ErrorResponse
```

### DELETE /api/subscription/cancel

#### 概要
サブスクリプションのキャンセル

#### リクエストボディ
```typescript
interface CancelSubscriptionRequest {
  cancel_at_period_end?: boolean; // デフォルト: true
  cancellation_reason?: string;
}
```

#### レスポンス例
```typescript
{
  "success": true,
  "data": {
    "subscription_id": "sub_1234567890",
    "cancelled_at": "2025-01-18T10:30:00Z",
    "cancel_at_period_end": true,
    "final_billing_date": "2025-02-01T00:00:00Z"
  },
  "timestamp": "2025-01-18T10:30:00Z"
}
```

## 🔐 機能アクセス制御API

### GET /api/subscription/features

#### 概要
現在のプランで利用可能な機能一覧を取得

#### レスポンス例
```typescript
{
  "success": true,
  "data": {
    "plan_info": {
      "plan_id": "model_basic",
      "plan_name": "モデル ベーシックプラン",
      "tier": "basic"
    },
    "features": {
      "photobookLimit": 10,
      "premiumTemplates": true,
      "exportQuality": "high",
      "portfolioLimit": 50,
      "priorityBookingTickets": 2,
      "reviewAnalytics": true,
      "profileBoost": true
    }
  },
  "timestamp": "2025-01-18T10:30:00Z"
}
```

### GET /api/subscription/features/check

#### 概要
特定機能のアクセス権限をチェック

#### パラメータ
```typescript
interface CheckFeatureParams {
  feature: string;      // チェックしたい機能名
  usage_count?: number; // 現在の使用量（制限チェック用）
}
```

#### リクエスト例
```http
GET /api/subscription/features/check?feature=photobookLimit&usage_count=8
```

#### レスポンス例
```typescript
{
  "success": true,
  "data": {
    "feature": "photobookLimit",
    "allowed": true,
    "current_usage": 8,
    "limit": 10,
    "remaining": 2,
    "reset_date": "2025-02-01T00:00:00Z"
  },
  "timestamp": "2025-01-18T10:30:00Z"
}
```

### POST /api/subscription/features/usage

#### 概要
機能使用量を記録・更新

#### リクエストボディ
```typescript
interface RecordUsageRequest {
  feature: string;
  increment?: number; // デフォルト: 1
  metadata?: Record<string, any>;
}
```

#### レスポンス
```typescript
SuccessResponse<{
  feature: string;
  new_usage_count: number;
  remaining: number;
}> | ErrorResponse
```

## 💳 請求・支払い管理API

### GET /api/subscription/invoices

#### 概要
ユーザーの請求履歴を取得

#### パラメータ
```typescript
interface GetInvoicesParams {
  page?: number;        // デフォルト: 1
  limit?: number;       // デフォルト: 20
  status?: 'paid' | 'open' | 'void' | 'uncollectible';
  start_date?: string;  // ISO 8601形式
  end_date?: string;    // ISO 8601形式
}
```

#### レスポンス
```typescript
PaginatedResponse<{
  id: string;
  stripe_invoice_id: string;
  amount_total: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_date: string;
  due_date: string | null;
  paid_at: string | null;
  period_start: string;
  period_end: string;
  download_url?: string;
}>
```

### GET /api/subscription/payment-methods

#### 概要
ユーザーの登録済み支払い方法を取得

#### レスポンス例
```typescript
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025
      },
      "is_default": true,
      "created": "2025-01-01T00:00:00Z"
    }
  ],
  "timestamp": "2025-01-18T10:30:00Z"
}
```

### POST /api/subscription/payment-methods

#### 概要
新しい支払い方法を追加

#### リクエストボディ
```typescript
interface AddPaymentMethodRequest {
  payment_method_id: string; // Stripe Payment Method ID
  set_as_default?: boolean;   // デフォルト: false
}
```

### DELETE /api/subscription/payment-methods/{paymentMethodId}

#### 概要
支払い方法を削除

#### レスポンス
```typescript
SuccessResponse<{ deleted: boolean }> | ErrorResponse
```

## 📊 分析・統計API

### GET /api/subscription/stats

#### 概要
サブスクリプション統計情報を取得（管理者のみ）

#### レスポンス例
```typescript
{
  "success": true,
  "data": {
    "total_subscribers": 1250,
    "active_subscribers": 1100,
    "mrr": 980000, // Monthly Recurring Revenue (円)
    "churn_rate": 0.05, // 5%
    "by_user_type": {
      "model": {
        "total": 650,
        "active": 580,
        "conversion_rate": 0.08
      },
      "photographer": {
        "total": 350,
        "active": 320,
        "conversion_rate": 0.25
      },
      "organizer": {
        "total": 250,
        "active": 200,
        "conversion_rate": 0.45
      }
    },
    "by_plan": {
      "model_basic": { "subscribers": 52, "mrr": 35360 },
      "photographer_pro": { "subscribers": 88, "mrr": 86240 },
      "organizer_standard": { "subscribers": 74, "mrr": 109520 }
    }
  },
  "timestamp": "2025-01-18T10:30:00Z"
}
```

## 🔧 管理者API

### GET /api/admin/subscriptions

#### 概要
全ユーザーのサブスクリプション情報を取得（管理者のみ）

#### パラメータ
```typescript
interface AdminGetSubscriptionsParams {
  page?: number;
  limit?: number;
  user_type?: UserType;
  status?: SubscriptionStatus;
  plan_id?: string;
  search?: string; // ユーザー名・メールアドレス検索
}
```

### PUT /api/admin/subscriptions/{subscriptionId}

#### 概要
管理者による強制的なサブスクリプション変更

#### リクエストボディ
```typescript
interface AdminUpdateSubscriptionRequest {
  action: 'change_plan' | 'cancel' | 'reactivate' | 'extend_trial';
  new_plan_id?: string;
  reason: string;
  notify_user?: boolean; // デフォルト: true
}
```

### POST /api/admin/plans

#### 概要
新しいサブスクリプションプランを作成（管理者のみ）

#### リクエストボディ
```typescript
interface CreatePlanRequest {
  id: string;
  name: string;
  user_type: UserType;
  tier: PlanTier;
  price: number;
  currency: Currency;
  base_features: Record<string, any>;
  type_specific_features: Record<string, any>;
  description?: string;
  is_active?: boolean;
}
```

## 🎣 Webhook API

### POST /api/webhooks/stripe

#### 概要
Stripe Webhookイベントを受信・処理

#### ヘッダー
```
Stripe-Signature: t=1234567890,v1=abc123...
```

#### 処理対象イベント
```typescript
const HANDLED_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated', 
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed'
];
```

#### レスポンス
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true,
  "processed": true,
  "event_id": "evt_1234567890"
}
```

## 🚨 エラーコード一覧

### 認証・認可エラー
```typescript
const AUTH_ERRORS = {
  UNAUTHORIZED: 'ユーザー認証が必要です',
  FORBIDDEN: 'この操作を実行する権限がありません',
  INVALID_TOKEN: '認証トークンが無効です',
  TOKEN_EXPIRED: '認証トークンが期限切れです'
};
```

### サブスクリプションエラー
```typescript
const SUBSCRIPTION_ERRORS = {
  PLAN_NOT_FOUND: '指定されたプランが見つかりません',
  PLAN_INCOMPATIBLE: 'このプランはあなたのユーザータイプに対応していません',
  ALREADY_SUBSCRIBED: '既にサブスクリプションに加入済みです',
  NO_SUBSCRIPTION: 'アクティブなサブスクリプションがありません',
  PAYMENT_FAILED: '決済処理に失敗しました',
  CARD_DECLINED: 'カードが拒否されました',
  INSUFFICIENT_FUNDS: '残高不足です'
};
```

### 機能制限エラー
```typescript
const FEATURE_ERRORS = {
  FEATURE_NOT_AVAILABLE: 'この機能は現在のプランでは利用できません',
  USAGE_LIMIT_EXCEEDED: '使用上限を超過しています',
  FEATURE_DISABLED: 'この機能は一時的に無効になっています'
};
```

## 🧪 テスト用エンドポイント

### POST /api/test/subscription/simulate

#### 概要
テスト環境でのサブスクリプション状態シミュレーション

#### リクエストボディ
```typescript
interface SimulateSubscriptionRequest {
  user_id: string;
  scenario: 'payment_success' | 'payment_failure' | 'cancellation' | 'plan_change';
  plan_id?: string;
}
```

---

**文書バージョン**: 1.0  
**最終更新**: 2025-09-04  
**API バージョン**: v1  
**次回レビュー**: 実装開始前
