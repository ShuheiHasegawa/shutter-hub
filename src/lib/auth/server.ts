import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

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
    throw new Error('Authentication required');
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
