import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  logger.debug('🔔 Webhook received at:', new Date().toISOString());

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  logger.debug('📝 Request details:', {
    bodyLength: body.length,
    hasSignature: !!signature,
    headers: Object.fromEntries(headersList.entries()),
  });

  if (!signature) {
    logger.error('❌ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  if (!stripe) {
    logger.error('❌ Stripe not initialized on server');
    return NextResponse.json(
      { error: 'Stripe not initialized' },
      { status: 500 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    logger.debug('✅ Webhook signature verified, event type:', event.type);
  } catch (error) {
    logger.error('❌ Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // データベースの決済ステータスを更新
        await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // 予約ステータスも更新
        const { data: payment } = await supabase
          .from('payments')
          .select('booking_id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (payment) {
          await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.booking_id);
        }

        logger.debug('✅ Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // データベースの決済ステータスを更新
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        logger.debug('Payment failed:', paymentIntent.id);
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // データベースの決済ステータスを更新
        await supabase
          .from('payments')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        logger.debug('Payment canceled:', paymentIntent.id);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;

        // チャージバック処理
        logger.debug('Dispute created:', dispute.id);
        // TODO: 管理者に通知、調査開始
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        // サブスクリプション決済成功
        logger.debug('Invoice payment succeeded:', invoice.id);
        break;
      }

      default:
        logger.debug(`Unhandled event type: ${event.type}`);
    }

    logger.debug('🎉 Webhook processed successfully');
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
