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

        // サブスクリプション関連のPayment Intentの場合
        if (paymentIntent.metadata.subscription_id) {
          const subscriptionId = paymentIntent.metadata.subscription_id;
          const userId = paymentIntent.metadata.user_id;
          const planId = paymentIntent.metadata.plan_id;

          logger.info('Payment Intent succeeded for subscription', {
            paymentIntentId: paymentIntent.id,
            subscriptionId,
            userId,
            planId,
          });

          // サブスクリプションを有効化
          if (subscriptionId) {
            try {
              const updatedSubscription = await stripe.subscriptions.update(
                subscriptionId,
                {
                  default_payment_method:
                    paymentIntent.payment_method as string,
                }
              );

              // データベースのサブスクリプション状態を更新
              await supabase.from('user_subscriptions').upsert({
                user_id: userId,
                plan_id: planId,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: paymentIntent.customer as string,
                status: updatedSubscription.status,
                current_period_start: (
                  updatedSubscription as unknown as {
                    current_period_start?: number;
                  }
                ).current_period_start
                  ? new Date(
                      (
                        updatedSubscription as unknown as {
                          current_period_start: number;
                        }
                      ).current_period_start * 1000
                    ).toISOString()
                  : null,
                current_period_end: (
                  updatedSubscription as unknown as {
                    current_period_end?: number;
                  }
                ).current_period_end
                  ? new Date(
                      (
                        updatedSubscription as unknown as {
                          current_period_end: number;
                        }
                      ).current_period_end * 1000
                    ).toISOString()
                  : null,
                updated_at: new Date().toISOString(),
              });

              logger.info(
                '✅ Subscription activated via payment_intent.succeeded',
                {
                  subscriptionId,
                  userId,
                  planId,
                }
              );
            } catch (error) {
              logger.error('Failed to activate subscription', error);
            }
          }
        } else {
          // 通常の予約決済の場合（既存処理）
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

          logger.debug('✅ Booking payment succeeded:', paymentIntent.id);
        }
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

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;
        const planId = subscription.metadata.plan_id;

        if (userId && planId) {
          // サブスクリプション情報をデータベースに保存
          await supabase.from('user_subscriptions').upsert({
            user_id: userId,
            plan_id: planId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            current_period_start: (
              subscription as unknown as { current_period_start?: number }
            ).current_period_start
              ? new Date(
                  (subscription as unknown as { current_period_start: number })
                    .current_period_start * 1000
                ).toISOString()
              : null,
            current_period_end: (
              subscription as unknown as { current_period_end?: number }
            ).current_period_end
              ? new Date(
                  (subscription as unknown as { current_period_end: number })
                    .current_period_end * 1000
                ).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          });

          logger.info('✅ Subscription created via webhook', {
            subscriptionId: subscription.id,
            userId,
            planId,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // 更新データの準備
        const updateData: {
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          updated_at: string;
          plan_id?: string;
        } = {
          status: subscription.status,
          current_period_start: (
            subscription as unknown as { current_period_start?: number }
          ).current_period_start
            ? new Date(
                (subscription as unknown as { current_period_start: number })
                  .current_period_start * 1000
              ).toISOString()
            : null,
          current_period_end: (
            subscription as unknown as { current_period_end?: number }
          ).current_period_end
            ? new Date(
                (subscription as unknown as { current_period_end: number })
                  .current_period_end * 1000
              ).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        };

        // metadataからplan_idを取得して更新（プラン変更の場合）
        if (subscription.metadata?.plan_id) {
          updateData.plan_id = subscription.metadata.plan_id;
        }

        // サブスクリプション状態を更新
        await supabase
          .from('user_subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id);

        logger.info('✅ Subscription updated via webhook', {
          subscriptionId: subscription.id,
          status: subscription.status,
          planId: subscription.metadata?.plan_id,
          previousPlanId: subscription.metadata?.previous_plan_id,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // サブスクリプションをキャンセル状態に更新
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        logger.info('✅ Subscription deleted via webhook', {
          subscriptionId: subscription.id,
        });
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
