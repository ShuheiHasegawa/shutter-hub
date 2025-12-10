'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';
import { PhotobookFormData, PhotobookError } from '@/types/quick-photobook';
import {
  PhotobookProject,
  PhotobookPage,
  PageElement,
  ProjectSettings,
} from '@/types/photobook-editor';
import {
  getPhotobookPlanLimits,
  // checkPhotobookCreationLimit,
  // updatePhotobook,
} from './quick-photobook';
import { getCurrentSubscription } from './subscription-management';

// =============================================================================
// Types
// =============================================================================

interface AdvancedPhotobookDbRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  photobook_type: 'advanced';
  max_pages: number;
  current_pages: number;
  cover_image_url: string | null;
  is_published: boolean;
  theme_id: string | null;
  advanced_settings: AdvancedSettings | null;
  created_at: string;
  updated_at: string;
}

interface AdvancedSettings {
  dimensions?: { width: number; height: number };
  dpi?: number;
  colorSpace?: 'RGB' | 'CMYK';
  bleedMargin?: number;
  binding?: 'left' | 'right' | 'spiral';
  coverType?: 'soft' | 'hard';
  paperType?: 'matte' | 'glossy' | 'premium';
}

interface AdvancedPageDbRecord {
  id: string;
  photobook_id: string;
  page_number: number;
  background_color: string;
  background_image_url: string | null;
  template_id: string | null;
  elements: PageElement[];
  is_locked: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

interface AdvancedResourceDbRecord {
  id: string;
  photobook_id: string;
  resource_type: 'image' | 'font';
  name: string;
  url: string;
  thumbnail_url: string | null;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  created_at: string;
}

// =============================================================================
// Create Advanced Photobook
// =============================================================================

export async function createAdvancedPhotobook(
  userId: string,
  data: PhotobookFormData & { advanced_settings?: AdvancedSettings }
): Promise<{ success: boolean; photobookId?: string; error?: PhotobookError }> {
  try {
    // TODO: 本番環境では有効化する
    // プラン制限チェック（開発中は一時的に無効化）
    // const limitCheck = await checkPhotobookCreationLimit(userId, 'advanced');
    // if (!limitCheck.allowed) {
    //   return {
    //     success: false,
    //     error: {
    //       type: 'plan_limit',
    //       message: `アドバンスドフォトブック作成にはプレミアムプランが必要です。`,
    //       details: { limitCheck },
    //     },
    //   };
    // }

    // プラン制限に基づく設定
    const limits = await getPhotobookPlanLimits(userId);

    const supabase = await createClient();

    // 現在のサブスクリプションプランIDを取得
    const subscription = await getCurrentSubscription(userId);
    const planId = subscription?.plan_id || 'free';

    // デフォルトのadvanced_settings
    const defaultAdvancedSettings: AdvancedSettings = {
      dimensions: { width: 210, height: 297 }, // A4サイズ (mm)
      dpi: 300,
      colorSpace: 'RGB',
      bleedMargin: 3,
      binding: 'left',
      coverType: 'soft',
      paperType: 'matte',
    };

    // フォトブック作成
    const { data: photobook, error } = await supabase
      .from('photobooks')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        photobook_type: 'advanced',
        max_pages: Math.min(data.max_pages, limits.advanced.maxPages),
        is_published: data.is_published || false,
        advanced_settings: data.advanced_settings || defaultAdvancedSettings,
        subscription_plan: planId,
      })
      .select()
      .single();

    if (error) throw error;

    // 初期ページを作成（表紙ページ）
    const { error: pageError } = await supabase
      .from('advanced_photobook_pages')
      .insert({
        photobook_id: photobook.id,
        page_number: 1,
        background_color: '#ffffff',
        elements: [],
        is_locked: false,
        is_hidden: false,
      });

    if (pageError) {
      logger.warn(
        'Failed to create initial page, but photobook created:',
        pageError
      );
    }

    logger.info('Advanced photobook created successfully', {
      photobookId: photobook.id,
      userId,
    });

    revalidatePath('/photobooks');

    return {
      success: true,
      photobookId: photobook.id,
    };
  } catch (error) {
    logger.error('Error creating advanced photobook:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'アドバンスドフォトブックの作成に失敗しました',
        details: { error },
      },
    };
  }
}

// =============================================================================
// Load Advanced Photobook (Full Project Data)
// =============================================================================

export async function loadAdvancedPhotobook(
  photobookId: string,
  userId: string
): Promise<{
  success: boolean;
  project?: PhotobookProject;
  error?: PhotobookError;
}> {
  try {
    const supabase = await createClient();

    // フォトブック基本情報を取得
    const { data: photobook, error: photobookError } = await supabase
      .from('photobooks')
      .select('*')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .eq('photobook_type', 'advanced')
      .single();

    if (photobookError || !photobook) {
      return {
        success: false,
        error: {
          type: 'server',
          message: 'フォトブックが見つかりません',
        },
      };
    }

    const dbRecord = photobook as AdvancedPhotobookDbRecord;

    // ページデータを取得
    const { data: pages, error: pagesError } = await supabase
      .from('advanced_photobook_pages')
      .select('*')
      .eq('photobook_id', photobookId)
      .order('page_number', { ascending: true });

    if (pagesError) {
      logger.warn('Failed to load pages:', pagesError);
    }

    // リソースデータを取得
    const { data: resources, error: resourcesError } = await supabase
      .from('advanced_photobook_resources')
      .select('*')
      .eq('photobook_id', photobookId);

    if (resourcesError) {
      logger.warn('Failed to load resources:', resourcesError);
    }

    // DBデータをPhotobookProject型に変換
    const advancedSettings = dbRecord.advanced_settings || {};

    const projectSettings: ProjectSettings = {
      dimensions: advancedSettings.dimensions || { width: 210, height: 297 },
      dpi: advancedSettings.dpi || 300,
      colorSpace: advancedSettings.colorSpace || 'RGB',
      bleedMargin: advancedSettings.bleedMargin || 3,
      binding: advancedSettings.binding || 'left',
      coverType: advancedSettings.coverType || 'soft',
      paperType: advancedSettings.paperType || 'matte',
      aspectRatio: 'portrait',
    };

    const projectPages: PhotobookPage[] = (pages || []).map(
      (page: AdvancedPageDbRecord) => ({
        id: page.id,
        pageNumber: page.page_number,
        layout: {
          backgroundColor: page.background_color,
          backgroundImage: page.background_image_url || undefined,
          templateId: page.template_id || undefined,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        elements: page.elements || [],
        settings: {
          locked: page.is_locked,
          hidden: page.is_hidden,
        },
      })
    );

    // ページがない場合はデフォルトページを作成
    if (projectPages.length === 0) {
      projectPages.push({
        id: crypto.randomUUID(),
        pageNumber: 1,
        layout: {
          backgroundColor: '#ffffff',
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        elements: [],
      });
    }

    const project: PhotobookProject = {
      meta: {
        id: dbRecord.id,
        version: '1.0.0',
        createdAt: dbRecord.created_at,
        updatedAt: dbRecord.updated_at,
        title: dbRecord.title,
        description: dbRecord.description || undefined,
        accountTier: 'premium', // Advanced使用可能 = premium以上
      },
      settings: projectSettings,
      pages: projectPages,
      resources: {
        images: (resources || [])
          .filter((r: AdvancedResourceDbRecord) => r.resource_type === 'image')
          .map((r: AdvancedResourceDbRecord) => ({
            id: r.id,
            name: r.name,
            src: r.url,
            thumbnailSrc: r.thumbnail_url || undefined,
            size: r.file_size_bytes || 0,
            dimensions: {
              width: r.width || 0,
              height: r.height || 0,
            },
            format: r.format || 'jpeg',
            uploadedAt: r.created_at,
          })),
        fonts: (resources || [])
          .filter((r: AdvancedResourceDbRecord) => r.resource_type === 'font')
          .map((r: AdvancedResourceDbRecord) => ({
            id: r.id,
            name: r.name,
            family: r.name,
            url: r.url,
            weight: '400',
            style: 'normal',
          })),
      },
    };

    logger.info('Advanced photobook loaded successfully', {
      photobookId,
      userId,
      pageCount: projectPages.length,
    });

    return {
      success: true,
      project,
    };
  } catch (error) {
    logger.error('Error loading advanced photobook:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'フォトブックの読み込みに失敗しました',
        details: { error },
      },
    };
  }
}

// =============================================================================
// Save Advanced Photobook (Full Project Data)
// =============================================================================

export async function saveAdvancedPhotobook(
  userId: string,
  project: PhotobookProject
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();
    const photobookId = project.meta.id;

    // 所有権確認
    const { data: existingPhotobook, error: checkError } = await supabase
      .from('photobooks')
      .select('id, user_id')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingPhotobook) {
      return {
        success: false,
        error: {
          type: 'server',
          message: 'フォトブックが見つからないか、編集権限がありません',
        },
      };
    }

    // フォトブック基本情報を更新
    const advancedSettings: AdvancedSettings = {
      dimensions: project.settings.dimensions,
      dpi: project.settings.dpi,
      colorSpace: project.settings.colorSpace,
      bleedMargin: project.settings.bleedMargin,
      binding: project.settings.binding,
      coverType: project.settings.coverType,
      paperType: project.settings.paperType,
    };

    const { error: updateError } = await supabase
      .from('photobooks')
      .update({
        title: project.meta.title,
        description: project.meta.description,
        current_pages: project.pages.length,
        advanced_settings: advancedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photobookId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // 既存ページを削除して新しいページを挿入（シンプルな更新戦略）
    const { error: deletePagesError } = await supabase
      .from('advanced_photobook_pages')
      .delete()
      .eq('photobook_id', photobookId);

    if (deletePagesError) {
      logger.warn('Failed to delete existing pages:', deletePagesError);
    }

    // 新しいページを挿入
    if (project.pages.length > 0) {
      const pageInserts = project.pages.map(page => ({
        id: page.id,
        photobook_id: photobookId,
        page_number: page.pageNumber,
        background_color: page.layout.backgroundColor || '#ffffff',
        background_image_url: page.layout.backgroundImage || null,
        template_id: page.layout.templateId || null,
        elements: page.elements,
        is_locked: page.settings?.locked || false,
        is_hidden: page.settings?.hidden || false,
      }));

      const { error: insertPagesError } = await supabase
        .from('advanced_photobook_pages')
        .insert(pageInserts);

      if (insertPagesError) {
        logger.error('Failed to insert pages:', insertPagesError);
        throw insertPagesError;
      }
    }

    logger.info('Advanced photobook saved successfully', {
      photobookId,
      userId,
      pageCount: project.pages.length,
    });

    revalidatePath('/photobooks');
    revalidatePath(`/photobooks/advanced/${photobookId}`);
    revalidatePath(`/photobooks/advanced/${photobookId}/edit`);

    return { success: true };
  } catch (error) {
    logger.error('Error saving advanced photobook:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'フォトブックの保存に失敗しました',
        details: { error },
      },
    };
  }
}

// =============================================================================
// Update Advanced Page
// =============================================================================

export async function updateAdvancedPage(
  userId: string,
  photobookId: string,
  pageId: string,
  pageData: Partial<PhotobookPage>
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
      return {
        success: false,
        error: {
          type: 'server',
          message: 'フォトブックが見つからないか、編集権限がありません',
        },
      };
    }

    // ページを更新
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (pageData.layout) {
      if (pageData.layout.backgroundColor) {
        updateData.background_color = pageData.layout.backgroundColor;
      }
      if (pageData.layout.backgroundImage !== undefined) {
        updateData.background_image_url = pageData.layout.backgroundImage;
      }
      if (pageData.layout.templateId !== undefined) {
        updateData.template_id = pageData.layout.templateId;
      }
    }

    if (pageData.elements) {
      updateData.elements = pageData.elements;
    }

    if (pageData.settings) {
      if (pageData.settings.locked !== undefined) {
        updateData.is_locked = pageData.settings.locked;
      }
      if (pageData.settings.hidden !== undefined) {
        updateData.is_hidden = pageData.settings.hidden;
      }
    }

    const { error: updateError } = await supabase
      .from('advanced_photobook_pages')
      .update(updateData)
      .eq('id', pageId)
      .eq('photobook_id', photobookId);

    if (updateError) throw updateError;

    logger.info('Advanced page updated', { pageId, photobookId });

    return { success: true };
  } catch (error) {
    logger.error('Error updating advanced page:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'ページの更新に失敗しました',
        details: { error },
      },
    };
  }
}

// =============================================================================
// Delete Advanced Photobook
// =============================================================================

export async function deleteAdvancedPhotobook(
  photobookId: string,
  userId: string
): Promise<{ success: boolean; error?: PhotobookError }> {
  try {
    const supabase = await createClient();

    // 削除権限チェック
    const { data: photobook, error: fetchError } = await supabase
      .from('photobooks')
      .select('id, user_id, title')
      .eq('id', photobookId)
      .eq('user_id', userId)
      .eq('photobook_type', 'advanced')
      .single();

    if (fetchError || !photobook) {
      return {
        success: false,
        error: {
          type: 'server',
          message: 'フォトブックが見つからないか、削除権限がありません',
        },
      };
    }

    // リソース画像をストレージから削除
    const { data: resources } = await supabase
      .from('advanced_photobook_resources')
      .select('url, resource_type')
      .eq('photobook_id', photobookId)
      .eq('resource_type', 'image');

    if (resources && resources.length > 0) {
      for (const resource of resources) {
        if (resource.url) {
          const urlParts = resource.url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `photobooks/${userId}/advanced/${fileName}`;

          await supabase.storage.from('user-uploads').remove([filePath]);
        }
      }
    }

    // データベースからフォトブック削除（CASCADEによりページとリソースも自動削除）
    const { error: deleteError } = await supabase
      .from('photobooks')
      .delete()
      .eq('id', photobookId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    revalidatePath('/photobooks');

    logger.info('Advanced photobook deleted successfully', {
      photobookId,
      userId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error deleting advanced photobook:', error);
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

// =============================================================================
// Upload Advanced Resource
// =============================================================================

export async function uploadAdvancedResource(
  userId: string,
  photobookId: string,
  resourceData: {
    base64Data: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
    resourceType?: 'image' | 'font';
  }
): Promise<{
  success: boolean;
  resource?: AdvancedResourceDbRecord;
  error?: PhotobookError;
}> {
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
      return {
        success: false,
        error: {
          type: 'server',
          message: 'フォトブックが見つからないか、アップロード権限がありません',
        },
      };
    }

    // Base64からファイルデータを抽出
    const base64Content =
      resourceData.base64Data.split(',')[1] || resourceData.base64Data;
    const fileBuffer = Buffer.from(base64Content, 'base64');

    // ファイル名を生成
    const timestamp = Date.now();
    const safeFileName = resourceData.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `photobooks/${userId}/advanced/${timestamp}_${safeFileName}`;

    // Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, fileBuffer, {
        contentType: resourceData.mimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // リソースをDBに登録
    const resourceType = resourceData.resourceType || 'image';
    const format = resourceData.mimeType.split('/')[1] || 'jpeg';

    const { data: resource, error: insertError } = await supabase
      .from('advanced_photobook_resources')
      .insert({
        photobook_id: photobookId,
        resource_type: resourceType,
        name: resourceData.fileName,
        url: publicUrl,
        thumbnail_url: resourceType === 'image' ? publicUrl : null,
        file_size_bytes: resourceData.fileSize,
        width: resourceData.width,
        height: resourceData.height,
        format: format,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info('Advanced resource uploaded', {
      resourceId: resource.id,
      photobookId,
      resourceType,
    });

    return {
      success: true,
      resource: resource as AdvancedResourceDbRecord,
    };
  } catch (error) {
    logger.error('Error uploading advanced resource:', error);
    return {
      success: false,
      error: {
        type: 'upload',
        message: 'リソースのアップロードに失敗しました',
        details: { error },
      },
    };
  }
}

// =============================================================================
// Get Advanced Photobook Resources
// =============================================================================

export async function getAdvancedPhotobookResources(
  photobookId: string,
  userId: string,
  resourceType?: 'image' | 'font'
): Promise<{
  success: boolean;
  resources?: AdvancedResourceDbRecord[];
  error?: PhotobookError;
}> {
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
      return {
        success: false,
        error: {
          type: 'server',
          message: 'フォトブックが見つかりません',
        },
      };
    }

    let query = supabase
      .from('advanced_photobook_resources')
      .select('*')
      .eq('photobook_id', photobookId);

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    const { data: resources, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    return {
      success: true,
      resources: resources as AdvancedResourceDbRecord[],
    };
  } catch (error) {
    logger.error('Error getting advanced photobook resources:', error);
    return {
      success: false,
      error: {
        type: 'server',
        message: 'リソースの取得に失敗しました',
        details: { error },
      },
    };
  }
}
