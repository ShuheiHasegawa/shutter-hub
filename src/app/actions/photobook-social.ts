'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export interface PhotobookSocialData {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  is_published: boolean;
  is_public: boolean;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  likes_count: number;
  comments_count: number;
  is_liked_by_user?: boolean;
}

/**
 * フォトブックの閲覧回数を増加させる
 */
export async function incrementPhotobookView(photobookId: string) {
  try {
    const supabase = await createClient();

    // 統計レコードが存在するかチェック
    const { data: existing } = await supabase
      .from('photobook_statistics')
      .select('id, view_count')
      .eq('photobook_id', photobookId)
      .single();

    if (existing) {
      // 既存レコードの閲覧回数を更新
      await supabase
        .from('photobook_statistics')
        .update({
          view_count: existing.view_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // 新規統計レコードを作成
      await supabase.from('photobook_statistics').insert({
        photobook_id: photobookId,
        view_count: 1,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error incrementing photobook view:', error);
    return { success: false, error: 'Failed to increment view count' };
  }
}

/**
 * ユーザーのフォトブック一覧を取得（ソーシャル機能付き）
 */
export async function getUserPhotobooks(
  userId: string,
  currentUserId?: string
) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('photobooks')
      .select(
        `
        id,
        user_id,
        title,
        description,
        cover_image_url,
        is_published,
        is_public,
        subscription_plan,
        created_at,
        updated_at,
        photobook_statistics (
          view_count,
          likes_count,
          comments_count
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 自分以外のプロフィールでは公開フォトブックのみ表示
    if (currentUserId !== userId) {
      query = query.eq('is_published', true).eq('is_public', true);
    }

    const { data: photobooks, error } = await query;
    if (error) {
      logger.error('Error fetching photobooks:', error);
      return { success: false, error: 'Failed to fetch photobooks' };
    }

    // データを整形
    const formattedPhotobooks: PhotobookSocialData[] =
      photobooks?.map(
        (photobook: {
          id: string;
          user_id: string;
          title: string;
          description?: string;
          cover_image_url?: string;
          is_published: boolean;
          is_public: boolean;
          subscription_plan: string;
          created_at: string;
          updated_at: string;
          photobook_statistics?: Array<{
            view_count: number;
            likes_count: number;
            comments_count: number;
          }>;
        }) => ({
          ...photobook,
          view_count: photobook.photobook_statistics?.[0]?.view_count || 0,
          likes_count: photobook.photobook_statistics?.[0]?.likes_count || 0,
          comments_count:
            photobook.photobook_statistics?.[0]?.comments_count || 0,
          is_liked_by_user: false, // TODO: 実装予定
        })
      ) || [];

    return { success: true, data: formattedPhotobooks };
  } catch (error) {
    logger.error('Error in getUserPhotobooks:', error);
    return { success: false, error: 'Failed to fetch photobooks' };
  }
}

/**
 * フォトブック詳細情報を取得（アクセス権限チェック付き）
 */
export async function getPhotobookDetails(photobookId: string) {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: photobook, error } = await supabase
      .from('photobooks')
      .select(
        `
        id,
        user_id,
        title,
        description,
        cover_image_url,
        is_published,
        is_public,
        subscription_plan,
        created_at,
        updated_at,
        photobook_statistics (
          view_count,
          likes_count,
          comments_count
        )
      `
      )
      .eq('id', photobookId)
      .single();

    if (error) {
      logger.error('Error fetching photobook:', error);
      return { success: false, error: 'Photobook not found' };
    }

    // アクセス権限チェック
    const isOwner = user?.id === photobook.user_id;
    const isPublic = photobook.is_published && photobook.is_public;

    if (!isOwner && !isPublic) {
      return { success: false, error: 'Access denied' };
    }

    const formattedPhotobook: PhotobookSocialData = {
      ...photobook,
      view_count: photobook.photobook_statistics?.[0]?.view_count || 0,
      likes_count: photobook.photobook_statistics?.[0]?.likes_count || 0,
      comments_count: photobook.photobook_statistics?.[0]?.comments_count || 0,
      is_liked_by_user: false, // TODO: 実装予定
    };

    return { success: true, data: formattedPhotobook, isOwner };
  } catch (error) {
    logger.error('Error in getPhotobookDetails:', error);
    return { success: false, error: 'Failed to fetch photobook details' };
  }
}
