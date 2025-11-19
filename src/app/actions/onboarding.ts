'use server';

import { requireAuthForAction } from '@/lib/auth/server-actions';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';

type UserType = 'model' | 'photographer' | 'organizer';

export async function updateUserType(
  userType: UserType
): Promise<{ success: boolean; error?: string }> {
  try {
    const authResult = await requireAuthForAction();

    if (!authResult.success) {
      return {
        success: false,
        error: '認証が必要です',
      };
    }

    const { user, supabase } = authResult.data;

    // プロフィールを更新
    const { error } = await supabase
      .from('profiles')
      .update({
        user_type: userType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      logger.error('ユーザータイプ更新エラー:', error);
      return {
        success: false,
        error: 'ユーザータイプの更新に失敗しました',
      };
    }

    logger.info('ユーザータイプ更新成功', {
      userId: user.id,
      userType,
    });

    // キャッシュを再検証
    revalidatePath('/dashboard');
    revalidatePath('/profile');

    return {
      success: true,
    };
  } catch (error) {
    logger.error('ユーザータイプ更新中に予期しないエラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}
