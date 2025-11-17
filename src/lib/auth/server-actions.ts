'use server';

import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import type { Profile, UserType } from '@/types/database';

/**
 * Server Actions用の統一的なエラーレスポンス型
 */
export type AuthActionResult<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code: string;
      metadata?: Record<string, unknown>;
    };

/**
 * 認証チェック結果型
 */
export type AuthCheckResult = {
  user: User;
  supabase: SupabaseClient;
};

/**
 * ユーザータイプチェック結果型
 */
export type UserTypeCheckResult = {
  user: User;
  profile: Profile & { role?: 'user' | 'admin' | 'super_admin' | null };
  supabase: SupabaseClient;
};

/**
 * 管理者権限チェック結果型
 */
export type AdminCheckResult = {
  user: User;
  profile: Profile & { role: 'admin' | 'super_admin' };
  supabase: SupabaseClient;
};

/**
 * Server Actions用の認証チェック関数
 * 認証が必要なServer Actionで使用する
 *
 * @returns 認証成功時: { success: true, data: { user, supabase } }
 *          認証失敗時: { success: false, error: string, code: string }
 */
export async function requireAuthForAction(): Promise<
  AuthActionResult<AuthCheckResult>
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Authentication failed in Server Action', {
        error: authError?.message,
      });

      return {
        success: false,
        error: 'Authentication required', // エラーコード: AUTH_REQUIRED
        code: 'AUTH_REQUIRED',
      };
    }

    return {
      success: true,
      data: { user, supabase },
    };
  } catch (error) {
    logger.error('Unexpected error in requireAuthForAction:', error);
    return {
      success: false,
      error: 'Authentication check error', // エラーコード: AUTH_CHECK_ERROR
      code: 'AUTH_CHECK_ERROR',
    };
  }
}

/**
 * Server Actions用のプロフィール取得ヘルパー関数
 * 認証済みユーザーのプロフィールを取得する（最適化版：1回のクエリで取得）
 *
 * @param user - 認証済みユーザー
 * @param supabase - Supabaseクライアント
 * @returns プロフィール取得成功時: Profile、失敗時: null
 */
async function fetchUserProfile(
  user: User,
  supabase: SupabaseClient
): Promise<
  (Profile & { role?: 'user' | 'admin' | 'super_admin' | null }) | null
> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    logger.error('Profile fetch error:', profileError);
    return null;
  }

  return profile as Profile & {
    role?: 'user' | 'admin' | 'super_admin' | null;
  };
}

/**
 * Server Actions用のユーザータイプチェック関数
 * 特定のユーザータイプ（model/photographer/organizer）が必要なServer Actionで使用する
 *
 * @param userType - 必要なユーザータイプ
 * @returns チェック成功時: { success: true, data: { user, profile } }
 *          チェック失敗時: { success: false, error: string, code: string }
 */
export async function requireUserType(
  userType: UserType
): Promise<AuthActionResult<UserTypeCheckResult>> {
  try {
    const authResult = await requireAuthForAction();

    if (!authResult.success) {
      return authResult;
    }

    const { user, supabase } = authResult.data;

    // プロフィールを取得（最適化版）
    const profile = await fetchUserProfile(user, supabase);

    if (!profile) {
      return {
        success: false,
        error: 'Profile fetch error', // エラーコード: PROFILE_FETCH_ERROR
        code: 'PROFILE_FETCH_ERROR',
      };
    }

    // ユーザータイプをチェック
    if (profile.user_type !== userType) {
      logger.warn('User type mismatch in requireUserType', {
        userId: user.id,
        required: userType,
        actual: profile.user_type,
      });

      return {
        success: false,
        error: `Invalid user type: ${userType} required`, // エラーコード: INVALID_USER_TYPE
        code: 'INVALID_USER_TYPE',
        metadata: { userType }, // クライアント側で多言語化に使用
      };
    }

    return {
      success: true,
      data: {
        user,
        profile,
        supabase,
      },
    };
  } catch (error) {
    logger.error('Unexpected error in requireUserType:', error);
    return {
      success: false,
      error: 'User type check error', // エラーコード: USER_TYPE_CHECK_ERROR
      code: 'USER_TYPE_CHECK_ERROR',
    };
  }
}

/**
 * Server Actions用の管理者権限チェック関数
 * 管理者権限が必要なServer Actionで使用する
 *
 * @returns チェック成功時: { success: true, data: { user, profile } }
 *          チェック失敗時: { success: false, error: string, code: string }
 */
export async function requireAdminRole(): Promise<
  AuthActionResult<AdminCheckResult>
> {
  try {
    const authResult = await requireAuthForAction();

    if (!authResult.success) {
      return authResult;
    }

    const { user, supabase } = authResult.data;

    // プロフィールを取得（最適化版：共通ヘルパー関数を使用）
    const profile = await fetchUserProfile(user, supabase);

    if (!profile) {
      return {
        success: false,
        error: 'Profile fetch error', // エラーコード: PROFILE_FETCH_ERROR
        code: 'PROFILE_FETCH_ERROR',
      };
    }

    // 管理者権限をチェック
    const role = profile.role as 'user' | 'admin' | 'super_admin' | null;
    if (!role || !['admin', 'super_admin'].includes(role)) {
      logger.warn('Admin role check failed', {
        userId: user.id,
        role: role || 'null',
      });

      return {
        success: false,
        error: 'Admin role required', // エラーコード: ADMIN_REQUIRED
        code: 'ADMIN_REQUIRED',
      };
    }

    return {
      success: true,
      data: {
        user,
        profile: profile as Profile & { role: 'admin' | 'super_admin' },
        supabase,
      },
    };
  } catch (error) {
    logger.error('Unexpected error in requireAdminRole:', error);
    return {
      success: false,
      error: 'Admin role check error', // エラーコード: ADMIN_CHECK_ERROR
      code: 'ADMIN_CHECK_ERROR',
    };
  }
}
