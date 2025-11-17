'use server';

import { logger } from '@/lib/utils/logger';
import { stripe, calculateTotalFees } from '@/lib/stripe/config';
import { revalidatePath } from 'next/cache';
import { requireAuthForAction } from '@/lib/auth/server-actions';
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
    if (!stripe) {
      return { success: false, error: 'Stripe not initialized on server' };
    }

    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
      logger.error('決済レコード作成エラー:', paymentError);
      return { success: false, error: 'Failed to create payment record' };
    }

    return {
      success: true,
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret!,
    };
  } catch (error) {
    logger.error('決済インテント作成エラー:', error);
    return { success: false, error: 'Failed to create payment intent' };
  }
}

// 決済ステータスを確認・更新
export async function confirmPayment(
  paymentIntentId: string
): Promise<PaymentResult> {
  try {
    if (!stripe) {
      return { success: false, error: 'Stripe not initialized on server' };
    }

    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { supabase } = authResult.data;

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
      logger.error('決済ステータス更新エラー:', updateError);
      return { success: false, error: 'Failed to update payment status' };
    }

    // 決済成功時は予約ステータスも更新
    if (paymentIntent.status === 'succeeded') {
      // 予約を取得してスロット情報を確認
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('slot_id, photo_session_id')
        .eq('id', payment.booking_id)
        .single();

      if (!bookingError && booking) {
        // 予約ステータスを更新
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.booking_id);

        // スロットがある場合、スロットと撮影会の参加者数を更新
        if (booking.slot_id) {
          // スロットの現在の参加者数を取得して更新
          const { data: slot } = await supabase
            .from('photo_session_slots')
            .select('current_participants')
            .eq('id', booking.slot_id)
            .single();

          if (slot) {
            await supabase
              .from('photo_session_slots')
              .update({
                current_participants: slot.current_participants + 1,
              })
              .eq('id', booking.slot_id);
          }

          // 撮影会の現在の参加者数を取得して更新
          if (booking.photo_session_id) {
            const { data: session } = await supabase
              .from('photo_sessions')
              .select('current_participants')
              .eq('id', booking.photo_session_id)
              .single();

            if (session) {
              await supabase
                .from('photo_sessions')
                .update({
                  current_participants: session.current_participants + 1,
                })
                .eq('id', booking.photo_session_id);
            }
          }
        } else {
          // スロットがない場合（通常の撮影会）、撮影会の参加者数のみ更新
          if (booking.photo_session_id) {
            const { data: session } = await supabase
              .from('photo_sessions')
              .select('current_participants')
              .eq('id', booking.photo_session_id)
              .single();

            if (session) {
              await supabase
                .from('photo_sessions')
                .update({
                  current_participants: session.current_participants + 1,
                })
                .eq('id', booking.photo_session_id);
            }
          }
        }
      }
    }

    // 予約が存在する場合は、撮影会詳細ページも再検証
    if (payment?.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('photo_session_id')
        .eq('id', payment.booking_id)
        .single();

      if (booking?.photo_session_id) {
        revalidatePath(`/photo-sessions/${booking.photo_session_id}`);
      }
    }

    revalidatePath('/bookings');
    revalidatePath('/dashboard');
    revalidatePath('/photo-sessions');

    return {
      success: true,
      payment_intent_id: paymentIntentId,
    };
  } catch (error) {
    logger.error('決済確認エラー:', error);
    return { success: false, error: 'Failed to confirm payment' };
  }
}

// 返金処理
export async function processRefund(data: RefundData): Promise<PaymentResult> {
  try {
    if (!stripe) {
      return { success: false, error: 'Stripe not initialized on server' };
    }

    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { supabase } = authResult.data;

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
    logger.error('返金処理エラー:', error);
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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
      logger.error('決済履歴取得エラー:', error);
      return { success: false, error: 'Failed to fetch payments' };
    }

    return { success: true, data: payments as PaymentInfo[] };
  } catch (error) {
    logger.error('予期しないエラー:', error);
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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // 主催者の決済統計を取得
    const { data: stats, error } = await supabase.rpc(
      'get_organizer_payment_stats',
      { organizer_id: user.id }
    );

    if (error) {
      logger.error('売上統計取得エラー:', error);
      return { success: false, error: 'Failed to fetch revenue stats' };
    }

    return { success: true, data: stats };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
