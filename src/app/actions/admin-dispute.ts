'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 争議データの型定義
export interface AdminDispute {
  id: string;
  booking_id: string;
  created_at: string;
  status: 'pending' | 'investigating' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  guest_name: string;
  guest_phone: string;
  photographer_name: string;
  photographer_phone: string;
  amount: number;
  issues: string[];
  description: string;
  evidence_urls?: string[];
  resolution?:
    | 'full_refund'
    | 'partial_refund'
    | 'photographer_favor'
    | 'mediation';
  resolution_amount?: number;
  admin_notes?: string;
  resolved_at?: string;

  // 関連情報
  booking?: {
    request_type: string;
    location_address: string;
    duration: number;
    photo_count?: number;
    shooting_date: string;
  };
  payment?: {
    total_amount: number;
    platform_fee: number;
    photographer_earnings: number;
  };
  delivery?: {
    external_url?: string;
    photo_count: number;
    delivered_at: string;
  };
}

export interface ResolveDisputeData {
  dispute_id: string;
  resolution:
    | 'full_refund'
    | 'partial_refund'
    | 'photographer_favor'
    | 'mediation';
  refund_amount?: number;
  admin_notes: string;
  notify_guest: boolean;
  notify_photographer: boolean;
}

/**
 * 管理者向け争議一覧を取得
 */
export async function getAdminDisputes(): Promise<
  ActionResult<AdminDispute[]>
> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: '管理者権限が必要です' };
    }

    // 争議一覧を取得（関連データも含む）
    const { data: disputes, error: disputeError } = await supabase
      .from('instant_photo_disputes')
      .select(
        `
        *,
        instant_bookings!inner (
          id,
          guest_phone,
          photographer_id,
          total_amount,
          platform_fee,
          created_at
        ),
        instant_photo_requests!inner (
          guest_name,
          request_type,
          location_address,
          duration
        ),
        escrow_payments (
          stripe_payment_intent_id,
          photographer_earnings
        ),
        photo_deliveries (
          external_url,
          photo_count,
          delivered_at
        )
      `
      )
      .order('created_at', { ascending: false });

    if (disputeError) {
      console.error('争議取得エラー:', disputeError);
      return { success: false, error: '争議データの取得に失敗しました' };
    }

    // カメラマン情報を取得
    const photographerIds =
      disputes?.map(d => d.instant_bookings?.photographer_id).filter(Boolean) ||
      [];
    const { data: photographers } = await supabase
      .from('profiles')
      .select('id, display_name, phone')
      .in('id', photographerIds);

    // データを整形
    const formattedDisputes: AdminDispute[] =
      disputes?.map(dispute => {
        const booking = dispute.instant_bookings;
        const request = dispute.instant_photo_requests;
        const payment = dispute.escrow_payments?.[0];
        const delivery = dispute.photo_deliveries?.[0];
        const photographer = photographers?.find(
          p => p.id === booking?.photographer_id
        );

        return {
          id: dispute.id,
          booking_id: dispute.booking_id,
          created_at: dispute.created_at,
          status: dispute.status || 'pending',
          priority: calculatePriority(
            dispute.created_at,
            booking?.total_amount || 0
          ),
          guest_name: request?.guest_name || '不明',
          guest_phone: booking?.guest_phone || '',
          photographer_name: photographer?.display_name || '不明',
          photographer_phone: photographer?.phone || '',
          amount: booking?.total_amount || 0,
          issues: dispute.issues || [],
          description: dispute.description || '',
          evidence_urls: dispute.evidence_urls || [],
          resolution: dispute.resolution,
          resolution_amount: dispute.resolution_amount,
          admin_notes: dispute.admin_notes,
          resolved_at: dispute.resolved_at,
          booking: request
            ? {
                request_type: request.request_type,
                location_address: request.location_address,
                duration: request.duration,
                shooting_date: booking?.created_at || '',
              }
            : undefined,
          payment: booking
            ? {
                total_amount: booking.total_amount,
                platform_fee: booking.platform_fee,
                photographer_earnings: payment?.photographer_earnings || 0,
              }
            : undefined,
          delivery: delivery
            ? {
                external_url: delivery.external_url,
                photo_count: delivery.photo_count,
                delivered_at: delivery.delivered_at,
              }
            : undefined,
        };
      }) || [];

    return { success: true, data: formattedDisputes };
  } catch (error) {
    console.error('争議一覧取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 争議を解決する
 */
export async function resolveDispute(
  data: ResolveDisputeData
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: '管理者権限が必要です' };
    }

    // 争議情報を取得
    const { data: dispute, error: disputeError } = await supabase
      .from('instant_photo_disputes')
      .select(
        `
        *,
        instant_bookings!inner (
          id,
          guest_phone,
          photographer_id
        ),
        escrow_payments (
          stripe_payment_intent_id,
          escrow_status
        )
      `
      )
      .eq('id', data.dispute_id)
      .single();

    if (disputeError || !dispute) {
      return { success: false, error: '争議が見つかりません' };
    }

    const escrowPayment = dispute.escrow_payments?.[0];
    if (!escrowPayment) {
      return { success: false, error: 'エスクロー決済が見つかりません' };
    }

    // Stripe処理
    if (data.resolution === 'full_refund') {
      // 全額返金
      await stripe.refunds.create({
        payment_intent: escrowPayment.stripe_payment_intent_id,
        amount: data.refund_amount ? data.refund_amount * 100 : undefined, // 全額の場合はamount省略
      });
    } else if (data.resolution === 'partial_refund' && data.refund_amount) {
      // 部分返金
      await stripe.refunds.create({
        payment_intent: escrowPayment.stripe_payment_intent_id,
        amount: data.refund_amount * 100, // cent単位
      });
    } else if (data.resolution === 'photographer_favor') {
      // カメラマン有利 - PaymentIntentをキャプチャ
      await stripe.paymentIntents.capture(
        escrowPayment.stripe_payment_intent_id
      );
    }

    // データベース更新
    const updateData = {
      status: 'resolved' as const,
      resolution: data.resolution,
      resolution_amount: data.refund_amount,
      admin_notes: data.admin_notes,
      admin_id: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('instant_photo_disputes')
      .update(updateData)
      .eq('id', data.dispute_id);

    // エスクロー決済ステータス更新
    let escrowStatus = 'completed';
    if (
      data.resolution === 'full_refund' ||
      data.resolution === 'partial_refund'
    ) {
      escrowStatus = 'refunded';
    }

    await supabase
      .from('escrow_payments')
      .update({
        escrow_status: escrowStatus,
        dispute_resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', dispute.booking_id);

    // 通知処理（今後実装）
    if (data.notify_guest) {
      // TODO: ゲストに通知
    }

    if (data.notify_photographer) {
      // TODO: カメラマンに通知
    }

    revalidatePath('/admin/disputes');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('争議解決エラー:', error);
    return { success: false, error: '争議解決に失敗しました' };
  }
}

/**
 * 争議のステータスを更新
 */
export async function updateDisputeStatus(
  disputeId: string,
  status: 'pending' | 'investigating' | 'escalated'
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: '管理者権限が必要です' };
    }

    await supabase
      .from('instant_photo_disputes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    revalidatePath('/admin/disputes');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    return { success: false, error: 'ステータス更新に失敗しました' };
  }
}

/**
 * 争議統計を取得
 */
export async function getDisputeStats(): Promise<
  ActionResult<{
    total: number;
    pending: number;
    resolved: number;
    avgResolutionTimeHours: number;
    refundRate: number;
  }>
> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: '管理者権限が必要です' };
    }

    const { data: disputes } = await supabase
      .from('instant_photo_disputes')
      .select('*');

    if (!disputes) {
      return {
        success: true,
        data: {
          total: 0,
          pending: 0,
          resolved: 0,
          avgResolutionTimeHours: 0,
          refundRate: 0,
        },
      };
    }

    const total = disputes.length;
    const pending = disputes.filter(d => d.status === 'pending').length;
    const resolved = disputes.filter(d => d.status === 'resolved').length;

    // 平均解決時間を計算
    const resolvedDisputes = disputes.filter(
      d => d.status === 'resolved' && d.resolved_at
    );
    const avgResolutionTimeHours =
      resolvedDisputes.length > 0
        ? resolvedDisputes.reduce((acc, dispute) => {
            const created = new Date(dispute.created_at);
            const resolved = new Date(dispute.resolved_at!);
            return (
              acc + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60)
            );
          }, 0) / resolvedDisputes.length
        : 0;

    // 返金率を計算
    const refundDisputes = disputes.filter(
      d => d.resolution === 'full_refund' || d.resolution === 'partial_refund'
    ).length;
    const refundRate = resolved > 0 ? (refundDisputes / resolved) * 100 : 0;

    return {
      success: true,
      data: {
        total,
        pending,
        resolved,
        avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 10) / 10,
        refundRate: Math.round(refundRate * 10) / 10,
      },
    };
  } catch (error) {
    console.error('争議統計取得エラー:', error);
    return { success: false, error: '統計データの取得に失敗しました' };
  }
}

// ヘルパー関数
function calculatePriority(
  createdAt: string,
  amount: number
): 'low' | 'medium' | 'high' | 'urgent' {
  const hoursAgo =
    (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 48 || amount > 50000) return 'urgent';
  if (hoursAgo > 24 || amount > 20000) return 'high';
  if (hoursAgo > 12 || amount > 10000) return 'medium';
  return 'low';
}
