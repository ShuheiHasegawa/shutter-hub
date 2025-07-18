'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function getUserSubscriptionPlan(userId: string) {
  try {
    const supabase = await createClient();

    // ユーザーのサブスクリプション情報を取得
    // TODO: 実際のサブスクリプションテーブルから取得
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user subscription:', error);
      return { subscription_plan: 'free' };
    }

    // user_role から subscription_plan への変換
    const roleToSubscription = {
      admin: 'admin',
      premium: 'premium',
      free: 'free',
    } as const;

    const subscriptionPlan =
      roleToSubscription[
        userProfile?.user_role as keyof typeof roleToSubscription
      ] || 'free';

    return {
      subscription_plan: subscriptionPlan,
      user_role: userProfile?.user_role,
    };
  } catch (error) {
    logger.error('Error in getUserSubscriptionPlan:', error);
    return { subscription_plan: 'free' };
  }
}
