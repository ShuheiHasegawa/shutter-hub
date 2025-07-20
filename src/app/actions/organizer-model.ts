'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import type {
  CreateInvitationData,
  InvitationResponse,
  OrganizerModelResponse,
} from '@/types/organizer-model';

/**
 * モデルに招待を送信する
 */
export async function createModelInvitationAction(
  data: CreateInvitationData
): Promise<InvitationResponse> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 運営権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profile?.user_type !== 'organizer') {
      return { success: false, error: '運営者のみが招待を送信できます' };
    }

    // 招待作成
    const { data: invitation, error } = await supabase
      .from('organizer_model_invitations')
      .insert({
        organizer_id: user.id,
        model_id: data.model_id,
        invitation_message: data.invitation_message,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('招待作成エラー:', error);
      return { success: false, error: '招待の送信に失敗しました' };
    }

    revalidatePath('/profile/edit');
    return { success: true, data: invitation };
  } catch (error) {
    logger.error('招待送信処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 運営の所属モデル一覧を取得
 */
export async function getOrganizerModelsAction(): Promise<OrganizerModelResponse> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 運営権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profile?.user_type !== 'organizer') {
      return { success: false, error: '運営者のみがアクセスできます' };
    }

    const { data: models, error } = await supabase
      .from('organizer_models')
      .select(
        `
        *,
        model_profile:model_id(id, display_name, avatar_url, user_type, is_public, bio, location)
      `
      )
      .eq('organizer_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) {
      logger.error('所属モデル一覧取得エラー:', error);
      return { success: false, error: '所属モデル一覧の取得に失敗しました' };
    }

    return { success: true, data: models };
  } catch (error) {
    logger.error('所属モデル一覧取得処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 運営の送信済み招待一覧を取得
 */
export async function getOrganizerInvitationsAction(): Promise<InvitationResponse> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 運営権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profile?.user_type !== 'organizer') {
      return { success: false, error: '運営者のみがアクセスできます' };
    }

    const { data: invitations, error } = await supabase
      .from('organizer_model_invitations')
      .select(
        `
        *,
        model_profile:model_id(id, display_name, avatar_url, user_type, is_public)
      `
      )
      .eq('organizer_id', user.id)
      .order('invited_at', { ascending: false });

    if (error) {
      logger.error('招待一覧取得エラー:', error);
      return { success: false, error: '招待一覧の取得に失敗しました' };
    }

    return { success: true, data: invitations };
  } catch (error) {
    logger.error('招待一覧取得処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 所属関係を削除する（運営が実行）
 */
export async function removeOrganizerModelAction(
  modelRelationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 運営権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profile?.user_type !== 'organizer') {
      return { success: false, error: '運営者のみが削除できます' };
    }

    // 削除実行
    const { error } = await supabase
      .from('organizer_models')
      .delete()
      .eq('id', modelRelationId)
      .eq('organizer_id', user.id); // 追加の安全性チェック

    if (error) {
      logger.error('所属関係削除エラー:', error);
      return { success: false, error: '削除に失敗しました' };
    }

    revalidatePath('/profile/edit');
    return { success: true };
  } catch (error) {
    logger.error('所属関係削除処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
