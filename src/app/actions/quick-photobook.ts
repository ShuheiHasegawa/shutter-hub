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

/**
 * シンプルなプラン制限設定を取得する
 */
export async function getPhotobookPlanLimits(
  userId: string
): Promise<PhotobookPlanLimits> {
  try {
    const supabase = await createClient();

    // プロフィールから直接ユーザータイプとロールを取得
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_type, role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logger.warn('Profile not found, using free plan limits:', error);
      return {
        quick: {
          maxPages: 5,
          maxPhotobooks: 3,
        },
        advanced: {
          maxPages: 10,
          maxPhotobooks: 1,
        },
        allowedTypes: ['quick'],
      };
    }

    // シンプルな制限判定（管理者は高制限、一般ユーザーは基本制限）
    if (profile.role === 'admin' || profile.role === 'super_admin') {
      return {
        quick: {
          maxPages: 15,
          maxPhotobooks: 10,
        },
        advanced: {
          maxPages: 30,
          maxPhotobooks: 5,
        },
        allowedTypes: ['quick', 'advanced'],
      };
    } else {
      // 一般ユーザーは統一制限
      return {
        quick: {
          maxPages: 5,
          maxPhotobooks: 3,
        },
        advanced: {
          maxPages: 10,
          maxPhotobooks: 1,
        },
        allowedTypes: ['quick'],
      };
    }
  } catch (error) {
    logger.error('Error getting photobook plan limits:', error);
    // エラー時はフリープラン制限
    return {
      quick: {
        maxPages: 5,
        maxPhotobooks: 3,
      },
      advanced: {
        maxPages: 10,
        maxPhotobooks: 1,
      },
      allowedTypes: ['quick'],
    };
  }
}

/**
 * フォトブック作成制限をチェックする（タイプ別）
 */
export async function checkPhotobookCreationLimit(
  userId: string,
  type: PhotobookType = 'quick'
): Promise<PlanLimitCheck> {
  try {
    const supabase = await createClient();

    // 現在のフォトブック数を取得（タイプ別）
    const { count, error } = await supabase
      .from('photobooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('photobook_type', type);

    if (error) {
      logger.error('Error counting photobooks:', error);
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

    // プラン制限を取得
    const planLimits = await getPhotobookPlanLimits(userId);
    const typeLimit = type === 'quick' ? planLimits.quick : planLimits.advanced;

    // プラン名を決定
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    let planName = 'フリープラン';
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      planName = '管理者プラン';
    }

    return {
      allowed: currentCount < typeLimit.maxPhotobooks,
      current_usage: currentCount,
      limit: typeLimit.maxPhotobooks,
      remaining: Math.max(0, typeLimit.maxPhotobooks - currentCount),
      plan_name: `${planName} (${type === 'quick' ? 'クイック' : 'アドバンスド'})`,
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

    // subscription_planフィールドを明示的に設定
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
        subscription_plan: 'free', // 明示的にフリープランを設定
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
