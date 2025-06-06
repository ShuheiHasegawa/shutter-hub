'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  invited_by: string | null;
  invitation_token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  invited_by_profile?: {
    display_name: string | null;
    email: string;
  };
}

export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin: {
    display_name: string | null;
    email: string;
  };
}

/**
 * 初期管理者を作成（システム初回セットアップ用）
 */
export async function createInitialAdmin(
  email: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // ユーザーのメールアドレスが一致するかチェック
    if (user.email !== email) {
      return { success: false, error: 'メールアドレスが一致しません' };
    }

    // ストアドプロシージャを呼び出し
    const { data, error } = await supabase.rpc('create_initial_admin', {
      admin_email: email,
      admin_user_id: user.id,
    });

    if (error) {
      console.error('初期管理者作成エラー:', error);
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    if (!result?.success) {
      return {
        success: false,
        error: result?.message || '初期管理者の作成に失敗しました',
      };
    }

    revalidatePath('/admin');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('初期管理者作成エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 管理者を招待
 */
export async function inviteAdmin(
  email: string,
  role: 'admin' | 'super_admin'
): Promise<ActionResult<{ invitationToken: string }>> {
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
      return { success: false, error: '管理者権限が必要です' };
    }

    // super_admin権限でない場合、super_adminは招待できない
    if (role === 'super_admin' && profile.role !== 'super_admin') {
      return { success: false, error: 'スーパー管理者権限が必要です' };
    }

    // ストアドプロシージャを呼び出し
    const { data, error } = await supabase.rpc('invite_admin', {
      invite_email: email,
      invite_role: role,
      invited_by_id: user.id,
    });

    if (error) {
      console.error('管理者招待エラー:', error);
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    if (!result?.success) {
      return {
        success: false,
        error: result?.message || '管理者の招待に失敗しました',
      };
    }

    revalidatePath('/admin/users');
    return {
      success: true,
      data: { invitationToken: result.invitation_token },
    };
  } catch (error) {
    console.error('管理者招待エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 管理者招待を受諾
 */
export async function acceptAdminInvitation(
  invitationToken: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // ストアドプロシージャを呼び出し
    const { data, error } = await supabase.rpc('accept_admin_invitation', {
      invitation_token_param: invitationToken,
      user_id: user.id,
    });

    if (error) {
      console.error('招待受諾エラー:', error);
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    if (!result?.success) {
      return {
        success: false,
        error: result?.message || '招待の受諾に失敗しました',
      };
    }

    revalidatePath('/admin');
    revalidatePath('/profile');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('招待受諾エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 管理者招待一覧を取得
 */
export async function getAdminInvitations(): Promise<
  ActionResult<AdminInvitation[]>
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
      return { success: false, error: '管理者権限が必要です' };
    }

    // 招待一覧を取得
    const { data: invitations, error } = await supabase
      .from('admin_invitations')
      .select(
        `
        *,
        invited_by_profile:invited_by(display_name, email)
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('招待一覧取得エラー:', error);
      return { success: false, error: '招待一覧の取得に失敗しました' };
    }

    return { success: true, data: invitations || [] };
  } catch (error) {
    console.error('招待一覧取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 管理者招待を削除（期限切れや不要な招待）
 */
export async function deleteAdminInvitation(
  invitationId: string
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
      return { success: false, error: '管理者権限が必要です' };
    }

    // 招待を削除
    const { error } = await supabase
      .from('admin_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('招待削除エラー:', error);
      return { success: false, error: '招待の削除に失敗しました' };
    }

    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('招待削除エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 管理者アクティビティログを取得
 */
export async function getAdminActivityLogs(
  limit: number = 50
): Promise<ActionResult<AdminActivityLog[]>> {
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
      return { success: false, error: '管理者権限が必要です' };
    }

    // アクティビティログを取得
    const { data: logs, error } = await supabase
      .from('admin_activity_logs')
      .select(
        `
        *,
        admin:admin_id(display_name, email)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('アクティビティログ取得エラー:', error);
      return {
        success: false,
        error: 'アクティビティログの取得に失敗しました',
      };
    }

    return { success: true, data: logs || [] };
  } catch (error) {
    console.error('アクティビティログ取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * ユーザーの管理者権限を変更
 */
export async function updateUserRole(
  userId: string,
  newRole: 'user' | 'admin' | 'super_admin'
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
      return { success: false, error: '管理者権限が必要です' };
    }

    // super_admin権限でない場合、super_adminは設定できない
    if (newRole === 'super_admin' && profile.role !== 'super_admin') {
      return { success: false, error: 'スーパー管理者権限が必要です' };
    }

    // 自分自身の権限を下げることはできない
    if (userId === user.id && newRole !== profile.role) {
      return {
        success: false,
        error: '自分自身の権限を変更することはできません',
      };
    }

    // 対象ユーザーの現在の権限を取得
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, email, display_name')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }

    // 権限を更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) {
      console.error('権限更新エラー:', updateError);
      return { success: false, error: '権限の更新に失敗しました' };
    }

    // アクティビティログを記録
    await supabase.from('admin_activity_logs').insert({
      admin_id: user.id,
      action: 'user_role_updated',
      target_type: 'profile',
      target_id: userId,
      details: {
        old_role: targetProfile.role,
        new_role: newRole,
        target_email: targetProfile.email,
        target_display_name: targetProfile.display_name,
      },
    });

    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('権限更新エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * 管理者の一覧を取得
 */
export async function getAdminUsers(): Promise<
  ActionResult<
    {
      id: string;
      email: string;
      display_name: string | null;
      role: 'user' | 'admin' | 'super_admin';
      created_at: string;
      is_verified: boolean;
    }[]
  >
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

    if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
      return { success: false, error: '管理者権限が必要です' };
    }

    // 管理者一覧を取得
    const { data: adminUsers, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at, is_verified')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('管理者一覧取得エラー:', error);
      return { success: false, error: '管理者一覧の取得に失敗しました' };
    }

    return { success: true, data: adminUsers || [] };
  } catch (error) {
    console.error('管理者一覧取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
