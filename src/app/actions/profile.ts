'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function getUserProfile(userId: string) {
  try {
    const supabase = await createClient();

    // ユーザープロフィール情報を取得する
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        display_name,
        email,
        avatar_url,
        bio,
        location,
        website,
        user_type,
        is_verified,
        created_at,
        updated_at
      `
      )
      .eq('id', userId)
      .single();

    if (error) {
      return {
        success: false,
        message: 'プロフィールが見つかりません',
        data: null,
      };
    }

    return {
      success: true,
      message: 'プロフィールを取得しました',
      data: profile,
    };
  } catch (error) {
    logger.error('getUserProfile error:', error);
    return {
      success: false,
      message: 'プロフィールの取得に失敗しました',
      data: null,
    };
  }
}
