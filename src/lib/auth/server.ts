import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import type { Profile, UserType } from '@/types/database';

/**
 * Server Components用の現在のユーザーを取得する
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.error('Error getting current user:', error);
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Unexpected error getting current user:', error);
    return null;
  }
}

/**
 * Server Components用の認証必須チェック
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('AUTH_REQUIRED: Authentication required');
  }

  return user;
}

/**
 * Server Components用のユーザープロフィール取得
 */
export async function getCurrentUserProfile(): Promise<{
  user: User;
  profile: Record<string, unknown> | null;
} | null> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error getting user profile:', error);
      return { user, profile: null };
    }

    return { user, profile };
  } catch (error) {
    logger.error('Unexpected error getting user profile:', error);
    return null;
  }
}

/**
 * Server Components用のユーザーとプロフィールを取得する（最適化版）
 * プロフィール取得を1回のクエリで実行し、型安全性を確保
 */
export async function getUserWithProfile(): Promise<{
  user: User;
  profile: Profile & { role?: 'user' | 'admin' | 'super_admin' | null };
} | null> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, role')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }

    return {
      user,
      profile: profile as Profile & {
        role?: 'user' | 'admin' | 'super_admin' | null;
      },
    };
  } catch (error) {
    logger.error('Unexpected error getting user with profile:', error);
    return null;
  }
}

/**
 * Server Components用のユーザータイプチェック
 * 特定のユーザータイプ（model/photographer/organizer）が必要な場合に使用
 *
 * @param userType - 必要なユーザータイプ
 * @returns チェック成功時: { user, profile }
 *          チェック失敗時: Errorをthrow
 */
export async function requireUserType(userType: UserType): Promise<{
  user: User;
  profile: Profile & { role?: 'user' | 'admin' | 'super_admin' | null };
}> {
  const userWithProfile = await getUserWithProfile();

  if (!userWithProfile) {
    throw new Error('Authentication required');
  }

  const { user, profile } = userWithProfile;

  if (profile.user_type !== userType) {
    logger.warn('User type mismatch in requireUserType', {
      userId: user.id,
      required: userType,
      actual: profile.user_type,
    });

    throw new Error(
      `INVALID_USER_TYPE: This feature is only available for ${userType}`
    );
  }

  return { user, profile };
}

/**
 * Server Components用の管理者権限チェック
 * 管理者権限が必要な場合に使用
 *
 * @returns チェック成功時: { user, profile }
 *          チェック失敗時: Errorをthrow
 */
export async function requireAdminRole(): Promise<{
  user: User;
  profile: Profile & { role: 'admin' | 'super_admin' };
}> {
  const userWithProfile = await getUserWithProfile();

  if (!userWithProfile) {
    throw new Error('AUTH_REQUIRED: Authentication required');
  }

  const { user, profile } = userWithProfile;

  const role = profile.role as 'user' | 'admin' | 'super_admin' | null;
  if (!role || !['admin', 'super_admin'].includes(role)) {
    logger.warn('Admin role check failed', {
      userId: user.id,
      role: role || 'null',
    });

    throw new Error('ADMIN_REQUIRED: Admin role required');
  }

  return {
    user,
    profile: profile as Profile & { role: 'admin' | 'super_admin' },
  };
}
