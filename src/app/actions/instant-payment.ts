'use server';

import { logger } from '@/lib/utils/logger';
import { stripe } from '@/lib/stripe/config';
import { revalidatePath } from 'next/cache';
import { requireAuthForAction } from '@/lib/auth/server-actions';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type {
  EscrowPayment,
  ConfirmDeliveryData,
  DeliverPhotosData,
  DisputeData,
  ActionResult,
  PhotoDelivery,
  ExternalDeliveryService,
} from '@/types/instant-photo';

/**
 * エスクロー決済を作成（マッチング成功時）
 */
export async function createEscrowPayment(
  bookingId: string,
  guestPhone: string
): Promise<
  ActionResult<{ clientSecret: string; escrowPayment: EscrowPayment }>
> {
  try {
    logger.info('createEscrowPayment サーバー側開始:', {
      bookingId,
      guestPhone,
    });

    if (!stripe) {
      logger.error('Stripe が初期化されていません');
      return { success: false, error: 'Stripe not initialized on server' };
    }

    // ゲストユーザーの決済処理のため、Service Role クライアントを使用してRLSをバイパス
    const supabase = createServiceRoleClient();

    // 予約情報を取得
    logger.info('予約情報取得中...', { bookingId });
    const { data: booking, error: bookingError } = await supabase
      .from('instant_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      logger.error('予約が見つかりません:', { bookingError, bookingId });
      return { success: false, error: '予約が見つかりません' };
    }
    logger.info('予約情報取得成功:', { total_amount: booking.total_amount });

    // 既存のエスクロー決済確認
    const { data: existingPayment } = await supabase
      .from('escrow_payments')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (existingPayment && existingPayment.escrow_status !== 'pending') {
      logger.warn('既に決済が処理されています:', { existingPayment });
      return { success: false, error: '既に決済が処理されています' };
    }

    // Stripe PaymentIntentを作成（エスクロー用）
    logger.info('Stripe PaymentIntent作成開始...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.total_amount,
      currency: 'jpy',
      capture_method: 'manual', // エスクロー用：手動キャプチャ
      payment_method_types: ['card'],
      metadata: {
        booking_id: bookingId,
        type: 'instant_photo_escrow',
        guest_phone: guestPhone,
      },
    });
    logger.info('Stripe PaymentIntent作成成功:', {
      paymentIntentId: paymentIntent.id,
    });

    // エスクロー決済レコードを作成
    const autoConfirmAt = new Date();
    autoConfirmAt.setHours(autoConfirmAt.getHours() + 72); // 72時間後

    logger.info('エスクロー決済レコード作成開始...');
    const { data: escrowPayment, error: escrowError } = await supabase
      .from('escrow_payments')
      .upsert({
        id: existingPayment?.id,
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntent.id,
        total_amount: booking.total_amount,
        platform_fee: booking.platform_fee,
        photographer_earnings: booking.photographer_earnings,
        escrow_status: 'pending',
        delivery_status: 'waiting',
        auto_confirm_enabled: true,
        auto_confirm_hours: 72,
        auto_confirm_at: autoConfirmAt.toISOString(),
      })
      .select()
      .single();

    if (escrowError) {
      logger.error('エスクロー決済作成エラー（詳細）:', {
        error: escrowError,
        code: escrowError.code,
        message: escrowError.message,
        details: escrowError.details,
        hint: escrowError.hint,
      });
      return { success: false, error: 'エスクロー決済の作成に失敗しました' };
    }

    logger.info('エスクロー決済作成成功:', {
      escrowPaymentId: escrowPayment.id,
    });

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret!,
        escrowPayment,
      },
    };
  } catch (error) {
    logger.error('エスクロー決済作成エラー（例外）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * エスクロー決済を確認（決済成功時）
 */
export async function confirmEscrowPayment(
  paymentIntentId: string
): Promise<ActionResult<EscrowPayment>> {
  try {
    // ゲストユーザーの決済処理のため、Service Role クライアントを使用してRLSをバイパス
    const supabase = createServiceRoleClient();

    // エスクロー決済を更新
    const { data: escrowPayment, error } = await supabase
      .from('escrow_payments')
      .update({
        escrow_status: 'escrowed',
        escrowed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select()
      .single();

    if (error) {
      logger.error('エスクロー決済確認エラー:', error);
      return { success: false, error: 'エスクロー決済の確認に失敗しました' };
    }

    // 予約ステータスを更新
    await supabase
      .from('instant_bookings')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowPayment.booking_id);

    // 対応するリクエストIDを取得してステータスを撮影中に更新
    const { data: bookingForStatus, error: bookingForStatusError } =
      await supabase
        .from('instant_bookings')
        .select('request_id')
        .eq('id', escrowPayment.booking_id)
        .single();

    if (bookingForStatusError) {
      logger.error('instant_bookings取得エラー (confirmEscrowPayment):', {
        booking_id: escrowPayment.booking_id,
        error: bookingForStatusError,
      });
    } else if (bookingForStatus?.request_id) {
      const { error: requestStatusError } = await supabase
        .from('instant_photo_requests')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingForStatus.request_id);

      if (requestStatusError) {
        logger.error(
          'instant_photo_requestsステータス更新エラー (in_progress):',
          {
            request_id: bookingForStatus.request_id,
            error: requestStatusError,
          }
        );
      }
    }

    // 決済完了通知を送信（カメラマンに通知）
    try {
      const { createNotification } = await import(
        '@/app/actions/notifications'
      );

      // 予約情報とゲスト情報を取得
      const { data: booking, error: bookingError } = await supabase
        .from('instant_bookings')
        .select(
          `
          *,
          request:instant_photo_requests(
            *,
            guest:profiles!guest_id(
              id,
              display_name,
              avatar_url
            )
          )
        `
        )
        .eq('id', escrowPayment.booking_id)
        .single();

      if (!bookingError && booking) {
        const request = Array.isArray(booking.request)
          ? booking.request[0]
          : booking.request;
        const guest = Array.isArray(request?.guest)
          ? request.guest[0]
          : request?.guest;

        if (request && guest && booking.photographer_id) {
          const { getNotificationMessage } = await import(
            '@/lib/utils/notification-i18n'
          );
          const notification = await getNotificationMessage(
            booking.photographer_id,
            'notificationMessages.instantPhoto.paymentReceived',
            { guestName: guest.display_name }
          );

          await createNotification({
            userId: booking.photographer_id,
            type: 'instant_photo_payment_received',
            category: 'instant_photo',
            priority: 'high',
            title: notification.title,
            message: notification.message,
            data: {
              booking_id: escrowPayment.booking_id,
              request_id: request.id,
              guest_id: guest.id,
              guest_name: guest.display_name,
              total_amount: booking.total_amount,
            },
            relatedEntityType: 'instant_booking',
            relatedEntityId: escrowPayment.booking_id,
            actionUrl: `/instant/${request.id}`,
            actionLabel: '予約詳細を見る',
          });
        }
      }
    } catch (notificationError) {
      // 通知作成失敗はログに記録するが、メイン処理は継続
      logger.error('決済完了通知送信エラー:', notificationError);
    }

    revalidatePath('/instant');
    return { success: true, data: escrowPayment };
  } catch (error) {
    logger.error('エスクロー決済確認エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 写真を配信（カメラマン側）
 */
export async function deliverPhotos(
  data: DeliverPhotosData
): Promise<ActionResult<PhotoDelivery>> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // 予約情報確認（カメラマン本人のみ）
    const { data: booking, error: bookingError } = await supabase
      .from('instant_bookings')
      .select('*')
      .eq('id', data.booking_id)
      .eq('photographer_id', user.id)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: '予約が見つかりません' };
    }

    // 写真配信情報を作成
    const downloadExpiresAt = new Date();
    downloadExpiresAt.setDate(downloadExpiresAt.getDate() + 30); // 30日間有効

    const deliveryData = {
      booking_id: data.booking_id,
      delivery_method: data.delivery_method,
      photo_count: data.photo_count,
      delivery_url: data.delivery_url,
      total_size_mb: data.total_size_mb || 0,
      thumbnail_url: data.thumbnail_url,
      external_url: data.external_url,
      external_service: data.external_service,
      external_password: data.external_password,
      external_expires_at: data.external_expires_at,
      resolution: data.resolution,
      formats: data.formats,
      photographer_message: data.photographer_message,
      download_expires_at: downloadExpiresAt.toISOString(),
      download_count: 0,
      max_downloads: 10,
      delivered_at: new Date().toISOString(),
    };

    // 上書き配信対応（upsert使用）
    const { data: photoDelivery, error: deliveryError } = await supabase
      .from('photo_deliveries')
      .upsert(deliveryData, {
        onConflict: 'booking_id', // booking_idで重複時は上書き
      })
      .select()
      .single();

    if (deliveryError) {
      logger.error('写真配信記録エラー:', deliveryError);
      return { success: false, error: '写真配信の記録に失敗しました' };
    }

    // エスクロー決済ステータスを更新
    await supabase
      .from('escrow_payments')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', data.booking_id);

    // 予約情報を更新
    await supabase
      .from('instant_bookings')
      .update({
        photos_delivered: data.photo_count,
        delivery_url: data.external_url || data.delivery_url,
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.booking_id);

    // リクエストのステータスを 'delivered' に更新
    const { data: bookingData, error: bookingSelectError } = await supabase
      .from('instant_bookings')
      .select(
        `
        request_id,
        request:instant_photo_requests(
          *,
          guest:profiles!guest_id(
            id,
            display_name,
            avatar_url
          )
        ),
        photographer:profiles!photographer_id(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('id', data.booking_id)
      .single();

    logger.debug('Booking data for status update:', {
      bookingData,
      bookingSelectError,
      booking_id: data.booking_id,
    });

    if (bookingSelectError) {
      logger.error('booking取得エラー:', bookingSelectError);
    }

    if (bookingData?.request_id) {
      const { error: statusUpdateError } = await supabase
        .from('instant_photo_requests')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingData.request_id);

      logger.debug('Status update result:', {
        request_id: bookingData.request_id,
        statusUpdateError,
      });

      if (statusUpdateError) {
        logger.error('ステータス更新エラー:', statusUpdateError);
      }

      // 写真配信通知を送信（ゲストに通知）
      try {
        const { createNotification } = await import(
          '@/app/actions/notifications'
        );

        const request = Array.isArray(bookingData.request)
          ? bookingData.request[0]
          : bookingData.request;
        const guest = Array.isArray(request?.guest)
          ? request.guest[0]
          : request?.guest;
        const photographer = Array.isArray(bookingData.photographer)
          ? bookingData.photographer[0]
          : bookingData.photographer;

        if (request && guest && photographer && request.guest_id) {
          const { getNotificationMessage } = await import(
            '@/lib/utils/notification-i18n'
          );
          const notification = await getNotificationMessage(
            request.guest_id,
            'notificationMessages.instantPhoto.photosDelivered',
            { photographerName: photographer.display_name }
          );

          await createNotification({
            userId: request.guest_id,
            type: 'instant_photo_photos_delivered',
            category: 'instant_photo',
            priority: 'high',
            title: notification.title,
            message: notification.message,
            data: {
              booking_id: data.booking_id,
              request_id: request.id,
              photographer_id: photographer.id,
              photographer_name: photographer.display_name,
              photo_count: data.photo_count,
              delivery_url: data.delivery_url || data.external_url,
            },
            relatedEntityType: 'instant_booking',
            relatedEntityId: data.booking_id,
            actionUrl: `/instant/${request.id}`,
            actionLabel: '写真を確認する',
          });
        }
      } catch (notificationError) {
        // 通知作成失敗はログに記録するが、メイン処理は継続
        logger.error('写真配信通知送信エラー:', notificationError);
      }
    } else {
      logger.error('request_idが見つかりません:', { bookingData });
    }

    revalidatePath('/instant');
    return { success: true, data: photoDelivery };
  } catch (error) {
    logger.error('写真配信エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 写真受取を確認（ゲスト側・レビュー機能付き）
 */
export async function confirmDeliveryWithReview(
  data: ConfirmDeliveryData
): Promise<ActionResult<void>> {
  try {
    if (!stripe) {
      return { success: false, error: 'Stripe not initialized on server' };
    }

    const supabase = await createClient();

    // エスクロー決済情報を取得
    const { data: escrowPayment, error: escrowError } = await supabase
      .from('escrow_payments')
      .select('*')
      .eq('booking_id', data.booking_id)
      .single();

    if (escrowError || !escrowPayment) {
      return { success: false, error: 'エスクロー決済が見つかりません' };
    }

    if (escrowPayment.escrow_status !== 'escrowed') {
      return { success: false, error: '決済がエスクロー状態ではありません' };
    }

    // 満足していない場合は争議状態に
    if (!data.is_satisfied) {
      await supabase
        .from('escrow_payments')
        .update({
          escrow_status: 'disputed',
          dispute_reason: data.issues?.join(', ') || 'ゲストが満足していません',
          dispute_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', data.booking_id);

      return {
        success: false,
        error: '争議が申請されました。サポートチームが対応いたします。',
      };
    }

    // Stripe PaymentIntentをキャプチャ（実際の決済実行）
    await stripe.paymentIntents.capture(escrowPayment.stripe_payment_intent_id);

    // エスクロー決済を完了状態に更新
    await supabase
      .from('escrow_payments')
      .update({
        escrow_status: 'completed',
        delivery_status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', data.booking_id);

    // 予約情報にレビューを記録
    await supabase
      .from('instant_bookings')
      .update({
        guest_rating: data.photographer_rating,
        guest_review: data.photographer_review,
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.booking_id);

    // 詳細レビューを記録
    await supabase.from('instant_photo_reviews').insert({
      booking_id: data.booking_id,
      photographer_rating: data.photographer_rating,
      photographer_review: data.photographer_review,
      photo_quality_rating: data.photo_quality_rating,
      photo_quality_comment: data.photo_quality_comment,
      service_rating: data.service_rating,
      service_comment: data.service_comment,
      would_recommend: data.would_recommend,
      recommend_reason: data.recommend_reason,
    });

    // 写真配信情報を更新
    await supabase
      .from('photo_deliveries')
      .update({
        confirmed_at: new Date().toISOString(),
      })
      .eq('booking_id', data.booking_id);

    // 対応するリクエストIDを取得してリクエストを完了状態に
    const { data: bookingForCompletion, error: bookingForCompletionError } =
      await supabase
        .from('instant_bookings')
        .select('request_id')
        .eq('id', data.booking_id)
        .single();

    if (bookingForCompletionError) {
      logger.error('instant_bookings取得エラー (confirmDeliveryWithReview):', {
        booking_id: data.booking_id,
        error: bookingForCompletionError,
      });
    } else if (bookingForCompletion?.request_id) {
      const { error: requestCompleteError } = await supabase
        .from('instant_photo_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingForCompletion.request_id);

      if (requestCompleteError) {
        logger.error(
          'instant_photo_requestsステータス更新エラー (completed):',
          {
            request_id: bookingForCompletion.request_id,
            error: requestCompleteError,
          }
        );
      }
    }

    revalidatePath('/instant');
    return { success: true, data: undefined };
  } catch (error) {
    logger.error('配信確認エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 争議を申請
 */
export async function createDispute(
  data: DisputeData
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // エスクロー決済を争議状態に更新
    await supabase
      .from('escrow_payments')
      .update({
        escrow_status: 'disputed',
        dispute_reason: data.description,
        dispute_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', data.booking_id);

    // 争議の詳細を記録
    await supabase.from('instant_photo_disputes').insert({
      booking_id: data.booking_id,
      reason: data.reason,
      description: data.description,
      evidence_urls: data.evidence_urls,
      requested_resolution: data.requested_resolution,
      resolution_detail: data.resolution_detail,
      status: 'pending',
    });

    revalidatePath('/instant');
    return { success: true, data: undefined };
  } catch (error) {
    logger.error('争議申請エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 外部配信サービス一覧を取得
 */
export async function getExternalDeliveryServices(): Promise<
  ActionResult<ExternalDeliveryService[]>
> {
  try {
    const services: ExternalDeliveryService[] = [
      {
        id: 'gigafile',
        name: 'ギガファイル便',
        url_pattern: 'https://gigafile.nu/',
        supports_password: true,
        supports_expiry: true,
        max_file_size_gb: 200,
        icon_url: '/icons/gigafile.png',
      },
      {
        id: 'firestorage',
        name: 'firestorage',
        url_pattern: 'https://firestorage.jp/',
        supports_password: true,
        supports_expiry: true,
        max_file_size_gb: 250,
        icon_url: '/icons/firestorage.png',
      },
      {
        id: 'wetransfer',
        name: 'WeTransfer',
        url_pattern: 'https://wetransfer.com/',
        supports_password: false,
        supports_expiry: true,
        max_file_size_gb: 2,
        icon_url: '/icons/wetransfer.png',
      },
      {
        id: 'googledrive',
        name: 'Google Drive',
        url_pattern: 'https://drive.google.com/',
        supports_password: false,
        supports_expiry: false,
        max_file_size_gb: 15,
        icon_url: '/icons/googledrive.png',
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        url_pattern: 'https://dropbox.com/',
        supports_password: true,
        supports_expiry: true,
        max_file_size_gb: 2,
        icon_url: '/icons/dropbox.png',
      },
    ];

    return { success: true, data: services };
  } catch (error) {
    logger.error('外部配信サービス取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 自動確認の実行（cron job用）
 */
export async function processAutoConfirmations(): Promise<
  ActionResult<number>
> {
  try {
    if (!stripe) {
      return { success: false, error: 'Stripe not initialized on server' };
    }

    const supabase = await createClient();

    // 自動確認対象のエスクロー決済を取得
    const { data: autoConfirmPayments, error } = await supabase
      .from('escrow_payments')
      .select('*')
      .eq('escrow_status', 'escrowed')
      .eq('delivery_status', 'delivered')
      .eq('auto_confirm_enabled', true)
      .lte('auto_confirm_at', new Date().toISOString());

    if (error || !autoConfirmPayments) {
      return { success: false, error: '自動確認対象の取得に失敗しました' };
    }

    let processedCount = 0;

    for (const payment of autoConfirmPayments) {
      try {
        // Stripe PaymentIntentをキャプチャ
        await stripe.paymentIntents.capture(payment.stripe_payment_intent_id);

        // エスクロー決済を完了状態に更新
        await supabase
          .from('escrow_payments')
          .update({
            escrow_status: 'completed',
            delivery_status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // 関連する予約を更新
        const { data: bookingForAuto, error: bookingForAutoError } =
          await supabase
            .from('instant_bookings')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.booking_id)
            .select('request_id')
            .single();

        if (bookingForAutoError) {
          logger.error(
            'instant_bookings更新エラー (processAutoConfirmations):',
            {
              booking_id: payment.booking_id,
              error: bookingForAutoError,
            }
          );
        } else if (bookingForAuto?.request_id) {
          const { error: autoRequestStatusError } = await supabase
            .from('instant_photo_requests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingForAuto.request_id);

          if (autoRequestStatusError) {
            logger.error(
              'instant_photo_requestsステータス更新エラー (auto completed):',
              {
                request_id: bookingForAuto.request_id,
                error: autoRequestStatusError,
              }
            );
          }
        }

        processedCount++;
      } catch (error) {
        logger.error(`自動確認処理エラー (payment_id: ${payment.id}):`, error);
        // 個別のエラーはログに記録して続行
      }
    }

    return { success: true, data: processedCount };
  } catch (error) {
    logger.error('自動確認処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * エスクロー決済状況を取得
 */
export async function getEscrowPaymentStatus(
  bookingId: string
): Promise<ActionResult<EscrowPayment & { photoDelivery?: PhotoDelivery }>> {
  try {
    const supabase = await createClient();

    // エスクロー決済情報を取得
    const { data: escrowPayment, error: escrowError } = await supabase
      .from('escrow_payments')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (escrowError || !escrowPayment) {
      return { success: false, error: 'エスクロー決済が見つかりません' };
    }

    // 写真配信情報も取得
    const { data: photoDelivery } = await supabase
      .from('photo_deliveries')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    return {
      success: true,
      data: {
        ...escrowPayment,
        photoDelivery: photoDelivery || undefined,
      },
    };
  } catch (error) {
    logger.error('エスクロー決済状況取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
