'use server';

import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import {
  CreatePhotoSessionSlotData,
  SelectedModel,
} from '@/types/photo-session';
import type {
  WeightCalculationMethod,
  ModelSelectionScope,
  ChekiSelectionScope,
} from '@/types/multi-slot-lottery';
import { getCurrentSubscription } from '@/app/actions/subscription-management';
import { requireAuthForAction } from '@/lib/auth/server-actions';

export interface PhotoSessionWithSlotsData {
  title: string;
  description?: string;
  location: string;
  address?: string;
  start_time: string;
  end_time: string;
  // max_participants と price_per_person はスロットから自動計算
  booking_type?: string;
  allow_multiple_bookings?: boolean;
  block_users_with_bad_ratings?: boolean;
  payment_timing?: 'prepaid' | 'cash_on_site';
  booking_settings?: Record<string, unknown>;
  is_published: boolean;
  image_urls?: string[];
  slots: CreatePhotoSessionSlotData[]; // 必須に変更
  studio_id?: string; // スタジオID（任意）
  selected_models?: SelectedModel[]; // 選択されたモデル（任意）
  session_type?: 'individual' | 'joint'; // 撮影会タイプ
  lottery_settings?: {
    enable_lottery_weight: boolean;
    weight_calculation_method: WeightCalculationMethod;
    weight_multiplier: number;
    enable_model_selection: boolean;
    model_selection_scope: ModelSelectionScope;
    enable_cheki_selection: boolean;
    cheki_selection_scope: ChekiSelectionScope;
  }; // 抽選設定（抽選方式選択時のみ）
}

export async function createPhotoSessionWithSlotsAction(
  data: PhotoSessionWithSlotsData
) {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // スロット必須のため、常にスロットから参加者数と料金を計算
    const maxParticipants = data.slots.reduce(
      (sum, slot) => sum + slot.max_participants,
      0
    );
    const avgPricePerPerson =
      data.slots.length > 0
        ? Math.round(
            data.slots.reduce((sum, slot) => sum + slot.price_per_person, 0) /
              data.slots.length
          )
        : 0;

    // 撮影会を作成
    const { data: session, error: sessionError } = await supabase
      .from('photo_sessions')
      .insert({
        title: data.title,
        description: data.description,
        location: data.location,
        address: data.address,
        start_time: data.start_time,
        end_time: data.end_time,
        max_participants: maxParticipants,
        price_per_person: avgPricePerPerson,
        booking_type: data.booking_type || 'first_come',
        allow_multiple_bookings: data.allow_multiple_bookings || false,
        block_users_with_bad_ratings:
          data.block_users_with_bad_ratings || false,
        payment_timing: data.payment_timing || 'prepaid',
        booking_settings: data.booking_settings || {},
        is_published: data.is_published,
        image_urls: data.image_urls || [],
        organizer_id: user.id,
        current_participants: 0,
        studio_id: data.studio_id || null,
        session_type: data.session_type || 'individual',
      })
      .select()
      .single();

    if (sessionError) {
      logger.error('撮影会作成エラー:', sessionError);
      return { success: false, error: '撮影会の作成に失敗しました' };
    }

    // スロット必須のため、常にスロットを作成
    if (data.slots.length > 0) {
      const slotsToInsert = data.slots.map(slot => ({
        ...slot,
        photo_session_id: session.id,
      }));

      const { error: slotsError } = await supabase
        .from('photo_session_slots')
        .insert(slotsToInsert);

      if (slotsError) {
        logger.error('スロット作成エラー:', slotsError);
        // 撮影会は作成されているので削除
        await supabase.from('photo_sessions').delete().eq('id', session.id);
        return { success: false, error: 'スロットの作成に失敗しました' };
      }
    }

    // スタジオ情報を保存（スタジオが選択されている場合）
    if (data.studio_id) {
      const { error: studioError } = await supabase
        .from('photo_session_studios')
        .insert({
          photo_session_id: session.id,
          studio_id: data.studio_id,
          usage_start_time: data.start_time,
          usage_end_time: data.end_time,
        });

      if (studioError) {
        logger.error('スタジオ関連付けエラー:', studioError);
        // エラーはログに記録するが、撮影会作成は成功とする（スタジオ情報は任意のため）
      }
    }

    // モデル情報を保存（モデルが選択されている場合）
    if (data.selected_models && data.selected_models.length > 0) {
      // 合同撮影会の場合はfee_amountを0に設定
      const isJointSession = data.session_type === 'joint';
      const modelsToInsert = data.selected_models.map(
        (model: SelectedModel, index: number) => ({
          photo_session_id: session.id,
          model_id: model.model_id,
          fee_amount: isJointSession ? 0 : model.fee_amount,
          display_order: index,
        })
      );

      const { error: modelsError } = await supabase
        .from('photo_session_models')
        .insert(modelsToInsert);

      if (modelsError) {
        logger.error('モデル情報保存エラー:', modelsError);
        // エラーはログに記録するが、撮影会作成は成功とする（モデル情報は任意のため）
      }
    }

    // 抽選方式・管理抽選の場合、lottery_sessions/admin_lottery_sessionsテーブルを作成
    if (
      (data.booking_type === 'lottery' ||
        data.booking_type === 'admin_lottery') &&
      data.booking_settings
    ) {
      const bookingSettings = data.booking_settings as {
        application_start_time?: string;
        application_end_time?: string;
        lottery_date_time?: string;
      };

      // スロットのmax_participantsの合計をmax_winnersとして使用
      const maxWinners = data.slots.reduce(
        (sum, slot) => sum + slot.max_participants,
        0
      );

      if (
        bookingSettings.application_start_time &&
        bookingSettings.application_end_time &&
        bookingSettings.lottery_date_time
      ) {
        const lotterySessionData: {
          photo_session_id: string;
          entry_start_time: string;
          entry_end_time: string;
          lottery_date: string;
          max_winners: number;
          status: string;
          enable_lottery_weight?: boolean;
          weight_calculation_method?: string;
          weight_multiplier?: number;
          enable_model_selection?: boolean;
          model_selection_scope?: string;
          enable_cheki_selection?: boolean;
          cheki_selection_scope?: string;
        } = {
          photo_session_id: session.id,
          entry_start_time: new Date(
            bookingSettings.application_start_time
          ).toISOString(),
          entry_end_time: new Date(
            bookingSettings.application_end_time
          ).toISOString(),
          lottery_date: new Date(
            bookingSettings.lottery_date_time
          ).toISOString(),
          max_winners: maxWinners,
          status: 'upcoming',
        };

        // 抽選設定がある場合は追加
        if (data.lottery_settings) {
          lotterySessionData.enable_lottery_weight =
            data.lottery_settings.enable_lottery_weight;
          lotterySessionData.weight_calculation_method =
            data.lottery_settings.weight_calculation_method;
          lotterySessionData.weight_multiplier =
            data.lottery_settings.weight_multiplier;
          lotterySessionData.enable_model_selection =
            data.lottery_settings.enable_model_selection;
          lotterySessionData.model_selection_scope =
            data.lottery_settings.model_selection_scope;
          lotterySessionData.enable_cheki_selection =
            data.lottery_settings.enable_cheki_selection;
          lotterySessionData.cheki_selection_scope =
            data.lottery_settings.cheki_selection_scope;
        }

        // 抽選方式と管理抽選で異なるテーブルに保存
        if (data.booking_type === 'lottery') {
          const { error: lotteryError } = await supabase
            .from('lottery_sessions')
            .insert(lotterySessionData);

          if (lotteryError) {
            logger.error('抽選セッション作成エラー:', lotteryError);
            // エラーはログに記録するが、撮影会作成は成功とする
            // （抽選セッションは後から作成可能なため）
          }
        } else if (data.booking_type === 'admin_lottery') {
          // 管理抽選の場合、admin_lottery_sessionsテーブルに保存
          const adminLotterySessionData: {
            photo_session_id: string;
            entry_start_time: string;
            entry_end_time: string;
            selection_deadline: string;
            max_selections: number;
            status: string;
            enable_lottery_weight?: boolean;
            weight_calculation_method?: string;
            weight_multiplier?: number;
            enable_model_selection?: boolean;
            model_selection_scope?: string;
            enable_cheki_selection?: boolean;
            cheki_selection_scope?: string;
          } = {
            photo_session_id: session.id,
            entry_start_time: new Date(
              bookingSettings.application_start_time
            ).toISOString(),
            entry_end_time: new Date(
              bookingSettings.application_end_time
            ).toISOString(),
            selection_deadline: new Date(
              bookingSettings.lottery_date_time
            ).toISOString(),
            max_selections: maxWinners,
            status: 'upcoming',
          };

          // 抽選設定がある場合は追加
          if (data.lottery_settings) {
            adminLotterySessionData.enable_lottery_weight =
              data.lottery_settings.enable_lottery_weight;
            adminLotterySessionData.weight_calculation_method =
              data.lottery_settings.weight_calculation_method;
            adminLotterySessionData.weight_multiplier =
              data.lottery_settings.weight_multiplier;
            adminLotterySessionData.enable_model_selection =
              data.lottery_settings.enable_model_selection;
            adminLotterySessionData.model_selection_scope =
              data.lottery_settings.model_selection_scope;
            adminLotterySessionData.enable_cheki_selection =
              data.lottery_settings.enable_cheki_selection;
            adminLotterySessionData.cheki_selection_scope =
              data.lottery_settings.cheki_selection_scope;
          }

          const { error: adminLotteryError } = await supabase
            .from('admin_lottery_sessions')
            .insert(adminLotterySessionData);

          if (adminLotteryError) {
            logger.error('管理抽選セッション作成エラー:', adminLotteryError);
            // エラーはログに記録するが、撮影会作成は成功とする
            // （管理抽選セッションは後から作成可能なため）
          }
        }
      }
    }

    revalidatePath('/photo-sessions');
    revalidatePath('/dashboard');

    return { success: true, data: session };
  } catch (error) {
    logger.error('撮影会作成エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

export async function updatePhotoSessionWithSlotsAction(
  sessionId: string,
  data: PhotoSessionWithSlotsData
) {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // 撮影会の所有者確認
    const { data: existingSession } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', sessionId)
      .single();

    if (!existingSession || existingSession.organizer_id !== user.id) {
      return { success: false, error: '権限がありません' };
    }

    // スロット必須のため、常にスロットから参加者数と料金を計算
    const maxParticipants = data.slots.reduce(
      (sum, slot) => sum + slot.max_participants,
      0
    );
    const avgPricePerPerson =
      data.slots.length > 0
        ? Math.round(
            data.slots.reduce((sum, slot) => sum + slot.price_per_person, 0) /
              data.slots.length
          )
        : 0;

    // 撮影会を更新
    const { data: session, error: sessionError } = await supabase
      .from('photo_sessions')
      .update({
        title: data.title,
        description: data.description,
        location: data.location,
        address: data.address,
        start_time: data.start_time,
        end_time: data.end_time,
        max_participants: maxParticipants,
        price_per_person: avgPricePerPerson,
        booking_type: data.booking_type || 'first_come',
        allow_multiple_bookings: data.allow_multiple_bookings || false,
        block_users_with_bad_ratings:
          data.block_users_with_bad_ratings || false,
        payment_timing: data.payment_timing || 'prepaid',
        booking_settings: data.booking_settings || {},
        is_published: data.is_published,
        image_urls: data.image_urls || [],
        studio_id: data.studio_id || null,
        session_type: data.session_type || 'individual',
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (sessionError) {
      logger.error('撮影会更新エラー:', sessionError);
      return { success: false, error: '撮影会の更新に失敗しました' };
    }

    // 既存のスロットを削除
    await supabase
      .from('photo_session_slots')
      .delete()
      .eq('photo_session_id', sessionId);

    // 新しいスロットを作成（スロット必須）
    if (data.slots.length > 0) {
      const slotsToInsert = data.slots.map(slot => ({
        ...slot,
        photo_session_id: sessionId,
      }));

      const { error: slotsError } = await supabase
        .from('photo_session_slots')
        .insert(slotsToInsert);

      if (slotsError) {
        logger.error('スロット更新エラー:', slotsError);
        return { success: false, error: 'スロットの更新に失敗しました' };
      }
    }

    // スタジオ情報を更新（スタジオが選択されている場合）
    if (data.studio_id) {
      // 既存のスタジオ関連付けを削除
      await supabase
        .from('photo_session_studios')
        .delete()
        .eq('photo_session_id', sessionId);

      const { error: studioError } = await supabase
        .from('photo_session_studios')
        .insert({
          photo_session_id: sessionId,
          studio_id: data.studio_id,
          usage_start_time: data.start_time,
          usage_end_time: data.end_time,
        });

      if (studioError) {
        logger.error('スタジオ関連付けエラー:', studioError);
        // エラーはログに記録するが、撮影会更新は成功とする（スタジオ情報は任意のため）
      }
    } else {
      // スタジオが選択されていない場合、既存のスタジオ関連付けを削除
      await supabase
        .from('photo_session_studios')
        .delete()
        .eq('photo_session_id', sessionId);
    }

    // モデル情報を更新（既存を削除して新規作成）
    await supabase
      .from('photo_session_models')
      .delete()
      .eq('photo_session_id', sessionId);

    if (data.selected_models && data.selected_models.length > 0) {
      // 合同撮影会の場合はfee_amountを0に設定
      const isJointSession = data.session_type === 'joint';
      const modelsToInsert = data.selected_models.map((model, index) => ({
        photo_session_id: sessionId,
        model_id: model.model_id,
        fee_amount: isJointSession ? 0 : model.fee_amount,
        display_order: index,
      }));

      const { error: modelsError } = await supabase
        .from('photo_session_models')
        .insert(modelsToInsert);

      if (modelsError) {
        logger.error('モデル情報更新エラー:', modelsError);
        // エラーはログに記録するが、撮影会更新は成功とする（モデル情報は任意のため）
      }
    }

    revalidatePath('/photo-sessions');
    revalidatePath(`/photo-sessions/${sessionId}`);
    revalidatePath('/dashboard');

    return { success: true, data: session };
  } catch (error) {
    logger.error('撮影会更新エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 現地払いを有効化できるかチェック
 * フリープラン以外のサブスクリプション契約済みの場合のみ有効
 */
export async function checkCanEnableCashOnSite(userId: string): Promise<{
  canEnable: boolean;
  currentPlan?: string;
}> {
  try {
    const subscription = await getCurrentSubscription(userId);

    if (!subscription || !subscription.plan) {
      return { canEnable: false };
    }

    // フリープランの場合は現地払い不可
    const isFreePlan =
      subscription.plan.tier === 'free' || subscription.plan.price === 0;

    if (isFreePlan) {
      return {
        canEnable: false,
        currentPlan: subscription.plan.name || 'フリープラン',
      };
    }

    return {
      canEnable: true,
      currentPlan: subscription.plan.name || '有料プラン',
    };
  } catch (error) {
    logger.error('現地払い有効化チェックエラー:', error);
    return { canEnable: false };
  }
}
