'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe, calculateTotalFees } from '@/lib/stripe/config';
import { revalidatePath } from 'next/cache';
import type {
  CreatePaymentIntentData,
  PaymentResult,
  RefundData,
  PaymentInfo,
  PaymentStats,
  PaymentStatus,
} from '@/types/payment';

// 決済インテントを作成
export async function createPaymentIntent(
  data: CreatePaymentIntentData
): Promise<PaymentResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // 予約の確認
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', data.metadata.booking_id)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    // 既存の決済確認
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', data.metadata.booking_id)
      .eq('status', 'succeeded')
      .single();

    if (existingPayment) {
      return { success: false, error: 'Payment already completed' };
    }

    // Stripe PaymentIntentを作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      payment_method_types: data.payment_method_types,
      metadata: data.metadata,
      capture_method: data.capture_method || 'automatic',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // データベースに決済レコードを作成
    const fees = calculateTotalFees(data.amount);
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: data.metadata.booking_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: data.amount,
        platform_fee: fees.platformFee,
        stripe_fee: fees.stripeFee,
        organizer_payout: fees.organizerPayout,
        currency: data.currency,
        payment_method: 'card', // デフォルト
        payment_timing: data.metadata.payment_timing,
        status: 'pending',
        metadata: data.metadata,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('決済レコード作成エラー:', paymentError);
      return { success: false, error: 'Failed to create payment record' };
    }

    return {
      success: true,
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret!,
    };
  } catch (error) {
    console.error('決済インテント作成エラー:', error);
    return { success: false, error: 'Failed to create payment intent' };
  }
}

// 決済ステータスを確認・更新
export async function confirmPayment(
  paymentIntentId: string
): Promise<PaymentResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Stripeから決済状況を取得
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // データベースの決済レコードを更新
    const updateData: Partial<PaymentInfo> = {
      status: paymentIntent.status as PaymentStatus,
      updated_at: new Date().toISOString(),
    };

    if (paymentIntent.status === 'succeeded') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select()
      .single();

    if (updateError) {
      console.error('決済ステータス更新エラー:', updateError);
      return { success: false, error: 'Failed to update payment status' };
    }

    // 決済成功時は予約ステータスも更新
    if (paymentIntent.status === 'succeeded') {
      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.booking_id);
    }

    revalidatePath('/bookings');
    revalidatePath('/dashboard');

    return {
      success: true,
      payment_intent_id: paymentIntentId,
    };
  } catch (error) {
    console.error('決済確認エラー:', error);
    return { success: false, error: 'Failed to confirm payment' };
  }
}

// 返金処理
export async function processRefund(data: RefundData): Promise<PaymentResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // 決済レコードを取得
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', data.payment_id)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    // TODO: 権限チェック実装が必要（型エラー修正後）
    // 権限チェック（主催者または管理者のみ）

    if (!payment.stripe_payment_intent_id) {
      return { success: false, error: 'No Stripe payment intent found' };
    }

    // Stripeで返金処理
    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: data.amount, // 部分返金の場合
      reason: 'requested_by_customer',
      metadata: {
        payment_id: data.payment_id,
        reason: data.reason,
        ...data.metadata,
      },
    });

    // データベースを更新
    const refundAmount = data.amount || payment.amount;
    const isPartialRefund = refundAmount < payment.amount;

    await supabase
      .from('payments')
      .update({
        status: isPartialRefund ? 'partially_refunded' : 'refunded',
        refunded_at: new Date().toISOString(),
        refund_amount: refundAmount,
        refund_reason: data.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.payment_id);

    // 予約ステータスも更新
    if (!isPartialRefund) {
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.booking_id);
    }

    revalidatePath('/bookings');
    revalidatePath('/dashboard');

    return {
      success: true,
      payment_intent_id: payment.stripe_payment_intent_id,
    };
  } catch (error) {
    console.error('返金処理エラー:', error);
    return { success: false, error: 'Failed to process refund' };
  }
}

// ユーザーの決済履歴を取得
export async function getUserPayments(): Promise<{
  success: boolean;
  data?: PaymentInfo[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        booking:bookings(
          id,
          photo_session:photo_sessions(
            id,
            title,
            start_time
          )
        )
      `
      )
      .eq('booking.user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('決済履歴取得エラー:', error);
      return { success: false, error: 'Failed to fetch payments' };
    }

    return { success: true, data: payments as PaymentInfo[] };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// 主催者の売上統計を取得
export async function getOrganizerRevenue(): Promise<{
  success: boolean;
  data?: PaymentStats;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // 主催者の決済統計を取得
    const { data: stats, error } = await supabase.rpc(
      'get_organizer_payment_stats',
      { organizer_id: user.id }
    );

    if (error) {
      console.error('売上統計取得エラー:', error);
      return { success: false, error: 'Failed to fetch revenue stats' };
    }

    return { success: true, data: stats };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
