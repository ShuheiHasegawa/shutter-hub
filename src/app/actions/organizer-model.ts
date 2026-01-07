'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import { requireUserType } from '@/lib/auth/server-actions';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/app/actions/notifications';
import { canInviteModel } from '@/lib/subscription-limits';
import type {
  CreateInvitationData,
  InvitationResponse,
  OrganizerModelResponse,
  OrganizerModelWithProfile,
  OrganizerModelInvitationWithProfiles,
} from '@/types/organizer-model';

/**
 * モデルに招待を送信する
 */
export async function createModelInvitationAction(
  data: CreateInvitationData
): Promise<InvitationResponse> {
  try {
    const typeResult = await requireUserType('organizer');
    if (!typeResult.success) {
      return { success: false, error: typeResult.error };
    }
    const { user, supabase } = typeResult.data;

    // 所属モデル上限チェック
    const inviteCheck = await canInviteModel(user.id);
    if (!inviteCheck.canInvite) {
      return {
        success: false,
        error: inviteCheck.reason || '招待できません',
        limitInfo: {
          currentCount: inviteCheck.currentCount,
          limit: inviteCheck.limit,
          isUnlimited: inviteCheck.isUnlimited,
        },
      };
    }

    // 招待対象のモデル情報を取得（emailを含む）
    const { data: modelProfile } = await supabase
      .from('profiles')
      .select('id, email, display_name, user_type')
      .eq('id', data.model_id)
      .single();

    if (!modelProfile) {
      return { success: false, error: '指定されたモデルが見つかりません' };
    }

    if (modelProfile.user_type !== 'model') {
      return {
        success: false,
        error: '招待対象はモデルアカウントである必要があります',
      };
    }

    // 運営者のプロフィール情報を取得
    const { data: organizerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    if (!organizerProfile) {
      return { success: false, error: '運営者情報が見つかりません' };
    }

    // 既存の招待をチェック
    const { data: existingInvitation } = await supabase
      .from('organizer_model_invitations')
      .select('id, status')
      .eq('organizer_id', user.id)
      .eq('model_id', data.model_id)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return { success: false, error: 'このモデルには既に招待を送信済みです' };
    }

    // 招待トークン生成
    const invitationToken = crypto.randomUUID();

    // 招待作成（現在のテーブル構造に合わせてemailも保存）
    const { data: invitation, error } = await supabase
      .from('organizer_model_invitations')
      .insert({
        organizer_id: user.id,
        model_id: data.model_id,
        email: modelProfile.email,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      logger.error('招待作成エラー:', error);
      // テーブルが存在しない場合はわかりやすいエラーメッセージ
      if (
        error.code === 'PGRST106' ||
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        return { success: false, error: '所属モデル管理機能はまだ準備中です' };
      }
      return { success: false, error: '招待の送信に失敗しました' };
    }

    // モデルに招待通知を送信
    try {
      logger.info('招待通知送信開始:', {
        modelId: data.model_id,
        organizerId: user.id,
        organizerName: organizerProfile.display_name,
        invitationId: invitation.id,
      });

      await createNotification({
        userId: data.model_id,
        type: 'organizer_invitation_received',
        category: 'organizer',
        priority: 'high',
        title: '運営者からの招待が届きました',
        message: `${organizerProfile.display_name}さんから所属モデルの招待が届きました。`,
        data: {
          organizer_id: user.id,
          organizer_name: organizerProfile.display_name,
          invitation_id: invitation.id,
          invitation_message: data.invitation_message,
          expiresAt: invitation.expires_at,
        },
        relatedEntityType: 'organizer_invitation',
        relatedEntityId: invitation.id,
        actionUrl: '/dashboard',
        actionLabel: '招待を確認',
        expiresAt: invitation.expires_at,
      });

      logger.info('招待通知送信成功:', {
        modelId: data.model_id,
        invitationId: invitation.id,
      });
    } catch (notificationError) {
      logger.error('招待通知送信エラー:', {
        error: notificationError,
        modelId: data.model_id,
        organizerId: user.id,
        invitationId: invitation.id,
      });
      // 通知エラーは招待作成を阻害しない
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
    const typeResult = await requireUserType('organizer');
    if (!typeResult.success) {
      return { success: false, error: typeResult.error };
    }
    const { user, supabase } = typeResult.data;

    // 所属モデル基本情報を取得
    const { data: models, error } = await supabase
      .from('organizer_models')
      .select('*')
      .eq('organizer_id', user.id)
      .order('invited_at', { ascending: false });

    if (error) {
      logger.error('所属モデル一覧取得エラー:', error);
      // テーブルやカラムが存在しない場合は空配列を返す
      if (
        error.code === 'PGRST106' ||
        error.code === '42P01' ||
        error.code === '42703' || // カラムが存在しない
        error.message?.includes('does not exist')
      ) {
        return { success: true, data: [] };
      }
      return { success: false, error: '所属モデル一覧の取得に失敗しました' };
    }

    if (!models || models.length === 0) {
      return { success: true, data: [] };
    }

    // モデルのプロフィール情報を別途取得
    const modelIds = models.map(m => m.model_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, user_type')
      .in('id', modelIds);

    if (profilesError) {
      logger.error('モデルプロフィール取得エラー:', profilesError);
      return { success: false, error: 'モデル情報の取得に失敗しました' };
    }

    // データを結合
    const modelsWithProfiles = models.map(model => ({
      ...model,
      model_profile: profiles?.find(p => p.id === model.model_id) || null,
    }));

    return { success: true, data: modelsWithProfiles };
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
    const typeResult = await requireUserType('organizer');
    if (!typeResult.success) {
      return { success: false, error: typeResult.error };
    }
    const { user, supabase } = typeResult.data;

    // 期限切れ招待を自動更新
    const { error: expiryError } = await supabase.rpc('expire_old_invitations');
    if (expiryError) {
      logger.warn('期限切れ招待の自動更新エラー:', expiryError);
      // エラーが発生しても処理は続行（関数が存在しない場合など）
    }

    // 招待基本情報を取得
    const { data: invitations, error } = await supabase
      .from('organizer_model_invitations')
      .select('*')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('招待一覧取得エラー:', error);
      // テーブルやカラムが存在しない場合は空配列を返す
      if (
        error.code === 'PGRST106' ||
        error.code === '42P01' ||
        error.code === '42703' || // カラムが存在しない
        error.message?.includes('does not exist')
      ) {
        return { success: true, data: [] };
      }
      return { success: false, error: '招待一覧の取得に失敗しました' };
    }

    if (!invitations || invitations.length === 0) {
      return { success: true, data: [] };
    }

    // プロフィール情報を取得（model_idとemailの両方に対応）
    const profiles: Array<{
      id: string;
      display_name: string;
      avatar_url: string;
      user_type: string;
      email: string;
    }> = [];

    // model_idが存在する招待のプロフィールを取得
    const modelIds = invitations
      .filter((inv: { model_id?: string | null }) => inv.model_id)
      .map((inv: { model_id: string }) => inv.model_id);

    if (modelIds.length > 0) {
      const { data: modelProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, user_type, email')
        .in('id', modelIds);

      if (modelProfiles) {
        profiles.push(...modelProfiles);
      }
    }

    // emailのみの招待に対してもプロフィールを取得
    const emailOnlyInvitations = invitations.filter(
      (inv: { model_id?: string | null; email?: string | null }) =>
        !inv.model_id && inv.email
    );

    for (const invitation of emailOnlyInvitations) {
      const { data: emailProfile } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, user_type, email')
        .eq('email', invitation.email)
        .single();

      if (emailProfile) {
        profiles.push(emailProfile);
        // model_idが空の場合は補完
        invitation.model_id = emailProfile.id;
      }
    }

    // データを結合
    const invitationsWithProfiles = invitations.map(
      (invitation: { model_id?: string | null; email?: string | null }) => ({
        ...invitation,
        model_profile:
          profiles.find(
            (p: { id: string; email?: string | null }) =>
              p.id === invitation.model_id || p.email === invitation.email
          ) || null,
      })
    ) as unknown as OrganizerModelInvitationWithProfiles[];

    return { success: true, data: invitationsWithProfiles };
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
    const typeResult = await requireUserType('organizer');
    if (!typeResult.success) {
      return { success: false, error: typeResult.error };
    }
    const { user, supabase } = typeResult.data;

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

/**
 * 招待をキャンセルする
 */
export async function cancelModelInvitationAction(
  invitationId: string
): Promise<InvitationResponse> {
  try {
    const typeResult = await requireUserType('organizer');
    if (!typeResult.success) {
      return { success: false, error: typeResult.error };
    }
    const { user, supabase } = typeResult.data;

    // 招待の存在確認と権限チェック
    const { data: invitation } = await supabase
      .from('organizer_model_invitations')
      .select('id, organizer_id, status, expires_at')
      .eq('id', invitationId)
      .eq('organizer_id', user.id)
      .single();

    if (!invitation) {
      return {
        success: false,
        error: '招待が見つからないか、キャンセル権限がありません',
      };
    }

    // 期限チェック
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: 'この招待は既に期限切れです' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: '保留中の招待のみキャンセルできます' };
    }

    // 招待をキャンセル（削除）
    const { error: deleteError } = await supabase
      .from('organizer_model_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      logger.error('招待キャンセルエラー:', deleteError);
      return { success: false, error: '招待のキャンセルに失敗しました' };
    }

    logger.info('招待キャンセル成功:', { invitationId, organizerId: user.id });

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    logger.error('招待キャンセル処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * モデルが自分宛の招待一覧を取得
 */
export async function getModelInvitationsAction(): Promise<InvitationResponse> {
  try {
    const { requireAuthForAction } = await import('@/lib/auth/server-actions');
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      logger.error('getModelInvitationsAction: 認証されていません');
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    logger.info('getModelInvitationsAction: 招待検索開始', {
      userId: user.id,
    });

    // 自分宛の招待を取得（RLS修正により単一クエリで動作）
    const { data: invitations, error } = await supabase
      .from('organizer_model_invitations')
      .select(
        `
        *,
        organizer:organizer_id!inner(
          id,
          display_name,
          email,
          avatar_url
        )
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    logger.info('getModelInvitationsAction: 招待検索完了', {
      count: invitations?.length || 0,
      hasError: !!error,
    });

    if (error) {
      logger.error('招待一覧取得エラー:', error);
      if (
        error.code === 'PGRST106' ||
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        return { success: true, data: [] };
      }
      return { success: false, error: '招待一覧の取得に失敗しました' };
    }

    if (!invitations || invitations.length === 0) {
      logger.info('getModelInvitationsAction: 招待なし');
      return { success: true, data: [] };
    }

    return { success: true, data: invitations };
  } catch (error) {
    logger.error('招待一覧取得処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * モデルが招待を受諾する
 */
export async function acceptModelInvitationAction(
  invitationId: string
): Promise<InvitationResponse> {
  try {
    const typeResult = await requireUserType('model');
    if (!typeResult.success) {
      return { success: false, error: typeResult.error };
    }
    const { user, profile, supabase } = typeResult.data;

    // 招待の存在確認と権限チェック（emailベース検索に簡略化）
    const { data: invitation } = await supabase
      .from('organizer_model_invitations')
      .select('id, model_id, organizer_id, status, expires_at, email')
      .eq('id', invitationId)
      .eq('email', profile.email)
      .single();

    if (!invitation) {
      return {
        success: false,
        error: '招待が見つからないか、受諾権限がありません',
      };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: '保留中の招待のみ受諾できます' };
    }

    // 期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: '招待の期限が切れています' };
    }

    // 既存の所属関係をチェック
    const { data: existingRelation } = await supabase
      .from('organizer_models')
      .select('id')
      .eq('organizer_id', invitation.organizer_id)
      .eq('model_id', user.id)
      .single();

    if (existingRelation) {
      return { success: false, error: 'この運営者とは既に所属関係があります' };
    }

    // 招待を受諾に更新（model_idが空の場合は補完）
    const updateData: {
      status: string;
      responded_at: string;
      updated_at: string;
      model_id?: string;
    } = {
      status: 'accepted',
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // model_idが空の場合は現在のユーザーIDを設定
    if (!invitation.model_id) {
      updateData.model_id = user.id;
    }

    const { error: updateError } = await supabase
      .from('organizer_model_invitations')
      .update(updateData)
      .eq('id', invitationId);

    if (updateError) {
      logger.error('招待受諾エラー:', updateError);
      return { success: false, error: '招待の受諾に失敗しました' };
    }

    logger.info('招待受諾成功:', { invitationId, modelId: user.id });

    // 運営者に受諾通知を送信
    try {
      await createNotification({
        userId: invitation.organizer_id,
        type: 'organizer_invitation_accepted',
        category: 'organizer',
        priority: 'normal',
        title: 'モデル招待が受諾されました',
        message: `${profile?.display_name || 'モデル'}さんが所属モデルの招待を受諾しました。`,
        data: {
          model_id: user.id,
          model_name: profile?.display_name,
          invitation_id: invitationId,
        },
        relatedEntityType: 'organizer_invitation',
        relatedEntityId: invitationId,
        actionUrl: '/models',
        actionLabel: '所属モデルを確認',
      });

      logger.info('受諾通知送信成功:', {
        organizerId: invitation.organizer_id,
        invitationId,
      });
    } catch (notificationError) {
      logger.error('受諾通知送信エラー:', notificationError);
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    logger.error('招待受諾処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * モデルが招待を拒否する
 */
export async function rejectModelInvitationAction(
  invitationId: string,
  rejectionReason?: string
): Promise<InvitationResponse> {
  try {
    const typeResult = await requireUserType('model');
    if (!typeResult.success) {
      return { success: false, error: typeResult.error };
    }
    const { user, profile, supabase } = typeResult.data;

    // 招待の存在確認と権限チェック（emailベース検索に簡略化）
    const { data: invitation } = await supabase
      .from('organizer_model_invitations')
      .select('id, model_id, status, email, organizer_id')
      .eq('id', invitationId)
      .eq('email', profile.email)
      .single();

    if (!invitation) {
      return {
        success: false,
        error: '招待が見つからないか、拒否権限がありません',
      };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: '保留中の招待のみ拒否できます' };
    }

    // 招待を拒否に更新（model_idが空の場合は補完）
    const updateData: {
      status: string;
      rejection_reason: string | null;
      responded_at: string;
      updated_at: string;
      model_id?: string;
    } = {
      status: 'rejected',
      rejection_reason: rejectionReason || null,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // model_idが空の場合は現在のユーザーIDを設定
    if (!invitation.model_id) {
      updateData.model_id = user.id;
    }

    const { error: updateError } = await supabase
      .from('organizer_model_invitations')
      .update(updateData)
      .eq('id', invitationId);

    if (updateError) {
      logger.error('招待拒否エラー:', updateError);
      return { success: false, error: '招待の拒否に失敗しました' };
    }

    logger.info('招待拒否成功:', {
      invitationId,
      modelId: user.id,
      rejectionReason,
    });

    // 運営者に拒否通知を送信
    try {
      await createNotification({
        userId: invitation.organizer_id,
        type: 'organizer_invitation_rejected',
        category: 'organizer',
        priority: 'normal',
        title: 'モデル招待が拒否されました',
        message: `${profile?.display_name || 'モデル'}さんが所属モデルの招待を拒否しました。`,
        data: {
          model_id: user.id,
          model_name: profile?.display_name,
          invitation_id: invitationId,
          rejection_reason: rejectionReason,
        },
        relatedEntityType: 'organizer_invitation',
        relatedEntityId: invitationId,
        actionUrl: '/models',
        actionLabel: '招待履歴を確認',
      });

      logger.info('拒否通知送信成功:', {
        organizerId: invitation.organizer_id,
        invitationId,
      });
    } catch (notificationError) {
      logger.error('拒否通知送信エラー:', notificationError);
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    logger.error('招待拒否処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 指定されたユーザーの所属モデル一覧を取得（プロフィール表示用）
 */
export async function getOrganizerModelsByUserIdAction(
  userId: string
): Promise<OrganizerModelResponse> {
  try {
    logger.warn('🚨 [ServerAction] getOrganizerModelsByUserIdAction CALLED', {
      userId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n'),
    });

    const supabase = await createClient();

    // 対象ユーザーが運営者かチェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (profile?.user_type !== 'organizer') {
      return { success: true, data: [] }; // 運営者でない場合は空配列
    }

    // 所属モデル基本情報を取得
    const { data: models, error } = await supabase
      .from('organizer_models')
      .select('*')
      .eq('organizer_id', userId)
      .order('invited_at', { ascending: false });

    if (error) {
      logger.error('所属モデル一覧取得エラー:', error);
      // テーブルやカラムが存在しない場合は空配列を返す
      if (
        error.code === 'PGRST106' ||
        error.code === '42P01' ||
        error.code === '42703' || // カラムが存在しない
        error.message?.includes('does not exist')
      ) {
        return { success: true, data: [] };
      }
      return { success: false, error: '所属モデル一覧の取得に失敗しました' };
    }

    if (!models || models.length === 0) {
      return { success: true, data: [] };
    }

    // モデルのプロフィール情報を別途取得
    const modelIds = models.map((m: { model_id: string }) => m.model_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, user_type')
      .in('id', modelIds);

    if (profilesError) {
      logger.error('モデルプロフィール取得エラー:', profilesError);
      return { success: false, error: 'モデル情報の取得に失敗しました' };
    }

    // データを結合
    const modelsWithProfiles = models.map((model: { model_id: string }) => ({
      ...model,
      model_profile:
        profiles?.find((p: { id: string }) => p.id === model.model_id) || null,
    })) as OrganizerModelWithProfile[];

    return { success: true, data: modelsWithProfiles };
  } catch (error) {
    logger.error('所属モデル一覧取得処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 再送信機能は削除（取り消し→新規招待で対応）

/**
 * 指定されたモデルに紐づく所属運営一覧を取得（プロフィール表示用）
 */
export async function getOrganizersOfModelAction(modelUserId: string): Promise<{
  success: boolean;
  data?: { organizer_id: string; organizer_name: string | null }[];
  error?: string;
}> {
  try {
    logger.warn('🚨 [ServerAction] getOrganizersOfModelAction CALLED', {
      modelUserId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n'),
    });

    const supabase = await createClient();

    // モデルの所属運営一覧（activeのみ）を取得
    const { data, error } = await supabase
      .from('organizer_models')
      .select('organizer_id, status')
      .eq('model_id', modelUserId)
      .eq('status', 'active');

    if (error) {
      logger.error('モデル所属運営一覧取得エラー:', error);
      return { success: false, error: '所属運営の取得に失敗しました' };
    }

    if (!data || data.length === 0) return { success: true, data: [] };

    // 重複する所属レコード対策でorganizer_idをユニーク化
    const organizerIds = Array.from(
      new Set((data || []).map((d: { organizer_id: string }) => d.organizer_id))
    );

    const { data: organizers, error: orgErr } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', organizerIds);

    if (orgErr) {
      logger.error('運営プロフィール取得エラー:', orgErr);
      return { success: false, error: '運営情報の取得に失敗しました' };
    }

    const result = (organizers || [])
      .map((o: { id: string; display_name?: string | null }) => ({
        organizer_id: o.id,
        organizer_name: o.display_name ?? null,
      }))
      // 表示の安定化（名称でソート）
      .sort(
        (
          a: { organizer_name: string | null },
          b: { organizer_name: string | null }
        ) => (a.organizer_name || '').localeCompare(b.organizer_name || '')
      );

    return { success: true, data: result };
  } catch (error) {
    logger.error('モデル所属運営一覧取得処理エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
