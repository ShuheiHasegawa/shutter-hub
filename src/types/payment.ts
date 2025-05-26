import type Stripe from 'stripe';

// 決済ステータス
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded';

// 決済方法
export type PaymentMethod =
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'cash_on_site';

// 決済タイミング
export type PaymentTiming =
  | 'prepaid' // 事前決済
  | 'cash_on_site' // 現地払い
  | 'split_payment'; // 分割払い

// 決済情報
export interface PaymentInfo {
  id: string;
  booking_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  platform_fee: number;
  stripe_fee: number;
  organizer_payout: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_timing: PaymentTiming;
  status: PaymentStatus;
  paid_at?: string;
  refunded_at?: string;
  refund_amount?: number;
  refund_reason?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// 決済作成データ
export interface CreatePaymentData {
  booking_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_timing: PaymentTiming;
  metadata?: Record<string, unknown>;
}

// 決済インテント作成データ
export interface CreatePaymentIntentData {
  amount: number;
  currency: string;
  payment_method_types: string[];
  metadata: {
    booking_id: string;
    photo_session_id: string;
    user_id: string;
    payment_timing: PaymentTiming;
  };
  capture_method?: 'automatic' | 'manual';
}

// 返金データ
export interface RefundData {
  payment_id: string;
  amount?: number; // 部分返金の場合
  reason: string;
  metadata?: Record<string, unknown>;
}

// 決済統計
export interface PaymentStats {
  total_revenue: number;
  platform_fees: number;
  stripe_fees: number;
  organizer_payouts: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  refunded_transactions: number;
  average_transaction_amount: number;
}

// Stripe Webhook イベント
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Stripe.PaymentIntent | Stripe.Charge | Stripe.Refund;
  };
  created: number;
}

// 決済フォームデータ
export interface PaymentFormData {
  payment_method: PaymentMethod;
  payment_timing: PaymentTiming;
  save_payment_method?: boolean;
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}

// 決済結果
export interface PaymentResult {
  success: boolean;
  payment_intent_id?: string;
  client_secret?: string;
  error?: string;
  requires_action?: boolean;
  redirect_url?: string;
}

// 売上管理
export interface Revenue {
  id: string;
  organizer_id: string;
  payment_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'pending' | 'paid' | 'failed';
  payout_date?: string;
  stripe_transfer_id?: string;
  created_at: string;
  updated_at: string;
}

// 売上統計（主催者向け）
export interface OrganizerRevenue {
  total_revenue: number;
  platform_fees: number;
  net_revenue: number;
  pending_amount: number;
  paid_amount: number;
  total_bookings: number;
  successful_bookings: number;
  average_booking_amount: number;
  monthly_revenue: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
}
