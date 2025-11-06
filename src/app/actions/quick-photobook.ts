'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  Photobook,
  PhotobookImage,
  PhotobookFormData,
  PhotobookListItem,
  PhotobookPlanLimits,
  PlanLimitCheck,
  PhotobookError,
  PhotobookType,
} from '@/types/quick-photobook';
import { logger } from '@/lib/utils/logger';
import {
  getCurrentSubscription,
  type SubscriptionPlan,
} from '@/app/actions/subscription-management';

/**
 * サブスクリプションプランからフォトブック制限を取得する
 */
export async function getPhotobookPlanLimits(
  userId: string
): Promise<PhotobookPlanLimits> {
  try {
    const supabase = await createClient();

    // プロフィールからユーザータイプを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logger.warn('Profile not found, using free plan limits:', profileError);
      return getDefaultFreePlanLimits();
    }

    // 現在のサブスクリプションを取得
    const subscription = await getCurrentSubscription(userId);

    // サブスクリプションがない場合はフリープラン
    if (!subscription || !subscription.plan) {
      logger.info('No active subscription, using free plan limits', {
        userId,
        userType: profile.user_type,
      });
      return getDefaultFreePlanLimits(profile.user_type);
    }

    const plan = subscription.plan as SubscriptionPlan;

    // プランの機能設定を取得
    const baseFeatures = plan.base_features || {};
    const typeSpecificFeatures = plan.type_specific_features || {};
    const allFeatures = { ...baseFeatures, ...typeSpecificFeatures };

    // photobookLimitを取得（-1は無制限）
    const photobookLimit =
      typeof allFeatures.photobookLimit === 'number'
        ? allFeatures.photobookLimit
        : 0;

    // premiumTemplatesがtrueの場合はadvancedタイプも利用可能
    const hasPremiumTemplates =
      allFeatures.premiumTemplates === true ||
      allFeatures.premiumTemplates === 'true';

    // ページ数制限（プランに応じて設定）
    // Phase 1: 基本的な制限のみ（将来的にプラン別に拡張可能）
    const maxPagesQuick = hasPremiumTemplates ? 15 : 5;
    const maxPagesAdvanced = hasPremiumTemplates ? 30 : 10;

    // 無制限の場合は大きな値を設定
    const maxPhotobooks = photobookLimit === -1 ? 999999 : photobookLimit;

    logger.info('Photobook plan limits retrieved', {
      userId,
      planId: plan.id,
      planName: plan.name,
      photobookLimit,
      hasPremiumTemplates,
      maxPhotobooks,
    });

    return {
      quick: {
        maxPages: maxPagesQuick,
        maxPhotobooks: maxPhotobooks,
      },
      advanced: {
        maxPages: maxPagesAdvanced,
        maxPhotobooks: hasPremiumTemplates ? maxPhotobooks : 0, // advancedはpremiumTemplatesが必要
      },
      allowedTypes: hasPremiumTemplates
        ? (['quick', 'advanced'] as PhotobookType[])
        : (['quick'] as PhotobookType[]),
    };
  } catch (error) {
    logger.error('Error getting photobook plan limits:', error);
    // エラー時はフリープラン制限
    return getDefaultFreePlanLimits();
  }
}

/**
 * フリープランのデフォルト制限を取得する
 */
function getDefaultFreePlanLimits(
  userType?: 'model' | 'photographer' | 'organizer'
): PhotobookPlanLimits {
  // ユーザータイプ別のフリープラン制限
  const freePlanLimits: Record<
    'model' | 'photographer' | 'organizer',
    { maxPhotobooks: number }
  > = {
    model: { maxPhotobooks: 2 },
    photographer: { maxPhotobooks: 3 },
    organizer: { maxPhotobooks: 3 },
  };

  const userLimit = userType ? freePlanLimits[userType] : { maxPhotobooks: 3 }; // デフォルト

  return {
    quick: {
      maxPages: 5,
      maxPhotobooks: userLimit.maxPhotobooks,
    },
    advanced: {
      maxPages: 10,
      maxPhotobooks: 0, // フリープランではadvanced不可
    },
    allowedTypes: ['quick'],
  };
}

/**
 * フォトブック作成制限をチェックする（タイプ別・サブスクリプションプランベース）
 */
export async function checkPhotobookCreationLimit(
  userId: string,
  type: PhotobookType = 'quick'
): Promise<PlanLimitCheck> {
  try {
    const supabase = await createClient();

    // 現在のフォトブック数を取得（タイプ別）
    const { count, error: countError } = await supabase
      .from('photobooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('photobook_type', type);

    if (countError) {
      logger.error('Error counting photobooks:', countError);
      // エラー時は安全な制限を適用
      return {
        allowed: false,
        current_usage: 0,
        limit: 3,
        remaining: 3,
        plan_name: 'フリープラン（エラー時）',
      };
    }

    const currentCount = count || 0;

    // サブスクリプションプランベースの制限チェック
    const { checkFeatureLimit } = await import(
      '@/app/actions/subscription-management'
    );
    const limitCheck = await checkFeatureLimit(
      userId,
      'photobookLimit',
      currentCount
    );

    // プラン制限を取得（タイプ別の詳細制限確認用）
    const planLimits = await getPhotobookPlanLimits(userId);

    // advancedタイプの場合は、premiumTemplatesが必要
    if (type === 'advanced' && !planLimits.allowedTypes.includes('advanced')) {
      return {
        allowed: false,
        current_usage: currentCount,
        limit: 0,
        remaining: 0,
        plan_name: limitCheck.plan_name,
        upgrade_required: true,
      };
    }

    // タイプ別の制限も考慮（quick/advancedで異なる制限がある場合）
    // 現在はphotobookLimitが共通なので、limitCheckの結果を使用
    // 将来的にタイプ別制限が必要な場合は、planLimits.quick/advanced.maxPhotobooksを使用

    logger.info('Photobook creation limit checked', {
      userId,
      type,
      currentCount,
      limit: limitCheck.limit,
      allowed: limitCheck.allowed,
      planName: limitCheck.plan_name,
    });

    return {
      allowed: limitCheck.allowed,
      current_usage: limitCheck.current_usage,
      limit: limitCheck.limit,
      remaining: limitCheck.remaining,
      plan_name: limitCheck.plan_name,
      upgrade_required: !limitCheck.allowed && limitCheck.limit > 0,
    };
  } catch (error) {
    logger.error('Error checking photobook creation limit:', error);
    return {
      allowed: false,
      current_usage: 0,
      limit: 3,
      remaining: 3,
      plan_name: 'エラー',
    };
  }
}

/**
 * フォトブック一覧を取得する
 */
export async function getPhotobookList(
  userId: string,
  type?: PhotobookType
): Promise<PhotobookListItem[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('photobooks')
      .select(
        `
        id,
        title,
        photobook_type,
        current_pages,
        max_pages,
        cover_image_url,
        is_published,
        created_at,
        updated_at
      `
      )
      .eq('user_id', userId);

    // タイプフィルターを適用
    if (type) {
      query = query.eq('photobook_type', type);
    }

    const { data, error } = await query.order('updated_at', {
      ascending: false,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Error fetching photobook list:', error);
    return [];
  }
}

/**
 * フォトブックを作成する
 */
export async function createPhotobook(
  userId: string,
  data: PhotobookFormData
): Promise<{ success: boolean; photobookId?: string; error?: PhotobookError }> {
  try {
    // プラン制限チェック
    const limitCheck = await checkPhotobookCreationLimit(userId);
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: {
          type: 'plan_limit',
          message: `フォトブック作成上限に達しています。現在のプラン: ${limitCheck.limit}冊`,
          details: { limitCheck },
        },
      };
    }

    // プラン制限に基づく設定
    const limits = await getPhotobookPlanLimits(userId);

    // タイプ制限チェック
    if (!limits.allowedTypes.includes(data.photobook_type)) {
      return {
        success: false,
        error: {
          type: 'plan_limit',
          message: `現在のプランでは${data.photobook_type}タイプは利用できません`,
          details: { allowedTypes: limits.allowedTypes },
        },
      };
    }

    const supabase = await createClient();

    // 現在のサブスクリプションプランIDを取得
    const subscription = await getCurrentSubscription(userId);
    const planId = subscription?.plan_id || 'free';

    // subscription_planフィールドを実際のプランIDに設定
    const { data: photobook, error } = await supabase
      .from('photobooks')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        photobook_type: data.photobook_type,
        max_pages: Math.min(
          data.max_pages,
          data.photobook_type === 'quick'
            ? limits.quick.maxPages
            : limits.advanced.maxPages
        ),
        is_published: data.is_published || false,
        subscription_plan: planId, // 実際のプランIDを設定
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Photobook created successfully', {
      photobookId: photobook.id,
      userId,
      type: data.photobook_type,
    });

    revalidatePath('/photobooks');

    return {
      success: true,
      photobookId: photobook.id,
    };
  } catch (error) {
    logger.error('Error creating photobook:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'フォトブックの作成に失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * フォトブック詳細を取得する
 */
export async function getPhotobook(
  photobookId: string,
  userId: string
): Promise<Photobook | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('photobooks')
      .select('*')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Error fetching photobook:', error);
    return null;
  }
}

/**
 * フォトブック画像一覧を取得する
 */
export async function getPhotobookImages(
  photobookId: string,
  userId: string
): Promise<PhotobookImage[]> {
  try {
    const supabase = await createClient();

    // まず所有権確認
    const { data: photobook } = await supabase
      .from('photobooks')
      .select('id')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (!photobook) {
      throw new Error('Photobook not found or access denied');
    }

    const { data, error } = await supabase
      .from('photobook_images')
      .select('*')
      .eq('photobook_id', photobookId)
      .order('page_number', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Error fetching photobook images:', error);
    return [];
  }
}

/**
 * フォトブックを更新する
 */
export async function updatePhotobook(
  photobookId: string,
  userId: string,
  updates: Partial<PhotobookFormData>
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('photobooks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photobookId)
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/photobooks');
    revalidatePath(`/photobooks/quick/${photobookId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error updating photobook:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'フォトブックの更新に失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * 画像順番を入れ替える
 */
export async function reorderPhotobookImages(
  photobookId: string,
  userId: string,
  reorderedImages: { id: string; page_number: number }[]
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // 所有権確認
    const { data: photobook } = await supabase
      .from('photobooks')
      .select('id')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (!photobook) {
      throw new Error('Photobook not found or access denied');
    }

    // 一括更新
    const updates = reorderedImages.map(img => ({
      id: img.id,
      page_number: img.page_number,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('photobook_images')
        .update({ page_number: update.page_number })
        .eq('id', update.id)
        .eq('photobook_id', photobookId);

      if (error) throw error;
    }

    revalidatePath(`/photobooks/quick/${photobookId}/edit`);

    return { success: true };
  } catch (error) {
    logger.error('Error reordering photobook images:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: '画像の順番変更に失敗しました',
        details: { error },
      },
    };
  }
}

/**
 * フォトブック削除
 */
export async function deletePhotobook(photobookId: string, userId: string) {
  try {
    const supabase = await createClient();

    // 削除権限チェック
    const { data: photobook, error: fetchError } = await supabase
      .from('photobooks')
      .select('id, user_id, title')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !photobook) {
      throw new Error('フォトブックが見つからないか、削除権限がありません');
    }

    // 関連画像をストレージから削除
    const { data: images } = await supabase
      .from('photobook_images')
      .select('image_url')
      .eq('photobook_id', photobookId);

    if (images && images.length > 0) {
      for (const image of images) {
        if (image.image_url) {
          // ストレージから画像削除（URLからファイルパスを抽出）
          const urlParts = image.image_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `photobooks/${userId}/${fileName}`;

          await supabase.storage.from('user-uploads').remove([filePath]);
        }
      }
    }

    // データベースからフォトブック削除（CASCADE により関連画像も自動削除）
    const { error: deleteError } = await supabase
      .from('photobooks')
      .delete()
      .eq('id', photobookId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // キャッシュ更新
    revalidatePath('/photobooks/quick');
    revalidatePath('/photobooks');

    logger.info('Photobook deleted successfully', {
      photobookId,
      userId,
      title: photobook.title,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error deleting photobook:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'フォトブックの削除に失敗しました',
        details: { error },
      },
    };
  }
}
