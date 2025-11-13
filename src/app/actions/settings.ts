/**
 * ユーザー設定管理のServer Actions
 * user_metadata、notification_settings、user_preferencesの保存・取得
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';

// 表示設定（user_metadataに保存）
export interface DisplaySettings {
  language: string;
  timezone: string;
  currency: string;
}

// 通知設定
export interface NotificationSettings {
  email_enabled_global: boolean;
  push_enabled_global: boolean;
  toast_enabled?: boolean;
  realtime_enabled?: boolean;
  email_enabled: {
    booking_reminders?: boolean;
    instant_requests?: boolean;
    messages?: boolean;
    marketing?: boolean;
    system_updates?: boolean;
  };
  push_enabled: {
    booking_reminders?: boolean;
    instant_requests?: boolean;
    messages?: boolean;
    marketing?: boolean;
    system_updates?: boolean;
  };
}

// プライバシー設定
export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'verified_only';
  show_online_status: boolean;
  allow_messages_from_strangers: boolean;
  show_location: boolean;
}

// 撮影関連設定
export interface PhotoSessionSettings {
  instant_photo_available: boolean;
  max_travel_distance: number;
  auto_accept_bookings: boolean;
  require_photo_consent: boolean;
}

// セキュリティ設定
export interface SecuritySettings {
  two_factor_enabled: boolean;
}

/**
 * 表示設定をuser_metadataに保存
 */
export async function updateDisplaySettings(
  settings: Partial<DisplaySettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 現在のuser_metadataを取得
    const currentMetadata = user.user_metadata || {};

    // 表示設定をuser_metadataにマージ
    const updatedMetadata = {
      ...currentMetadata,
      ...(settings.language && { language: settings.language }),
      ...(settings.timezone && { timezone: settings.timezone }),
      ...(settings.currency && { currency: settings.currency }),
    };

    // user_metadataを更新
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        user_metadata: updatedMetadata,
      },
    });

    if (updateError) {
      logger.error('表示設定の更新エラー:', updateError);
      return { success: false, error: '設定の保存に失敗しました' };
    }

    logger.info('表示設定を更新しました', {
      userId: user.id,
      settings,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    logger.error('表示設定更新中の予期しないエラー:', error);
    return { success: false, error: '設定の保存に失敗しました' };
  }
}

/**
 * 表示設定をuser_metadataから取得
 */
export async function getDisplaySettings(): Promise<{
  success: boolean;
  data?: DisplaySettings;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const metadata = user.user_metadata || {};

    return {
      success: true,
      data: {
        language: metadata.language || 'ja',
        timezone: metadata.timezone || 'Asia/Tokyo',
        currency: metadata.currency || 'JPY',
      },
    };
  } catch (error) {
    logger.error('表示設定取得中の予期しないエラー:', error);
    return { success: false, error: '設定の取得に失敗しました' };
  }
}

/**
 * 通知設定を保存
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // notification_settingsテーブルを取得または作成
    const { data: existingSettings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const updateData: Partial<NotificationSettings> = {};

    if (settings.email_enabled_global !== undefined) {
      updateData.email_enabled_global = settings.email_enabled_global;
    }
    if (settings.push_enabled_global !== undefined) {
      updateData.push_enabled_global = settings.push_enabled_global;
    }
    if (settings.email_enabled) {
      updateData.email_enabled = settings.email_enabled;
    }
    if (settings.push_enabled) {
      updateData.push_enabled = settings.push_enabled;
    }
    if (settings.toast_enabled !== undefined) {
      updateData.toast_enabled = settings.toast_enabled;
    }
    if (settings.realtime_enabled !== undefined) {
      updateData.realtime_enabled = settings.realtime_enabled;
    }

    if (existingSettings) {
      // 更新
      const { error: updateError } = await supabase
        .from('notification_settings')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        logger.error('通知設定の更新エラー:', updateError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    } else {
      // 新規作成
      const { error: insertError } = await supabase
        .from('notification_settings')
        .insert({
          user_id: user.id,
          ...updateData,
        });

      if (insertError) {
        logger.error('通知設定の作成エラー:', insertError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    }

    logger.info('通知設定を更新しました', {
      userId: user.id,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    logger.error('通知設定更新中の予期しないエラー:', error);
    return { success: false, error: '設定の保存に失敗しました' };
  }
}

/**
 * 通知設定を取得
 */
export async function getNotificationSettings(): Promise<{
  success: boolean;
  data?: NotificationSettings;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('通知設定取得エラー:', error);
      return { success: false, error: '設定の取得に失敗しました' };
    }

    return {
      success: true,
      data: data
        ? {
            email_enabled_global: data.email_enabled_global ?? true,
            push_enabled_global: data.push_enabled_global ?? true,
            toast_enabled: data.toast_enabled ?? true,
            realtime_enabled: data.realtime_enabled ?? true,
            email_enabled:
              (data.email_enabled as NotificationSettings['email_enabled']) ||
              {},
            push_enabled:
              (data.push_enabled as NotificationSettings['push_enabled']) || {},
          }
        : {
            email_enabled_global: true,
            push_enabled_global: true,
            toast_enabled: true,
            realtime_enabled: true,
            email_enabled: {},
            push_enabled: {},
          },
    };
  } catch (error) {
    logger.error('通知設定取得中の予期しないエラー:', error);
    return { success: false, error: '設定の取得に失敗しました' };
  }
}

/**
 * プライバシー設定を保存
 */
export async function updatePrivacySettings(
  settings: Partial<PrivacySettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // user_preferencesテーブルを取得または作成
    const { data: existingPreferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const updateData: Partial<PrivacySettings> = {};

    if (settings.profile_visibility !== undefined) {
      updateData.profile_visibility = settings.profile_visibility;
    }
    if (settings.show_online_status !== undefined) {
      updateData.show_online_status = settings.show_online_status;
    }
    if (settings.allow_messages_from_strangers !== undefined) {
      updateData.allow_messages_from_strangers =
        settings.allow_messages_from_strangers;
    }
    if (settings.show_location !== undefined) {
      updateData.show_location = settings.show_location;
    }

    if (existingPreferences) {
      // 更新
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        logger.error('プライバシー設定の更新エラー:', updateError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    } else {
      // 新規作成
      const { error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...updateData,
        });

      if (insertError) {
        logger.error('プライバシー設定の作成エラー:', insertError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    }

    logger.info('プライバシー設定を更新しました', {
      userId: user.id,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    logger.error('プライバシー設定更新中の予期しないエラー:', error);
    return { success: false, error: '設定の保存に失敗しました' };
  }
}

/**
 * プライバシー設定を取得
 */
export async function getPrivacySettings(): Promise<{
  success: boolean;
  data?: PrivacySettings;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('プライバシー設定取得エラー:', error);
      return { success: false, error: '設定の取得に失敗しました' };
    }

    return {
      success: true,
      data: data
        ? {
            profile_visibility:
              (data.profile_visibility as PrivacySettings['profile_visibility']) ||
              'public',
            show_online_status: data.show_online_status ?? true,
            allow_messages_from_strangers:
              data.allow_messages_from_strangers ?? false,
            show_location: (data.show_location as boolean | undefined) ?? true,
          }
        : {
            profile_visibility: 'public',
            show_online_status: true,
            allow_messages_from_strangers: false,
            show_location: true,
          },
    };
  } catch (error) {
    logger.error('プライバシー設定取得中の予期しないエラー:', error);
    return { success: false, error: '設定の取得に失敗しました' };
  }
}

/**
 * 撮影関連設定を保存
 */
export async function updatePhotoSessionSettings(
  settings: Partial<PhotoSessionSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // user_settingsテーブルを取得または作成
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const updateData: Partial<PhotoSessionSettings> = {};

    if (settings.instant_photo_available !== undefined) {
      updateData.instant_photo_available = settings.instant_photo_available;
    }
    if (settings.max_travel_distance !== undefined) {
      updateData.max_travel_distance = settings.max_travel_distance;
    }
    if (settings.auto_accept_bookings !== undefined) {
      updateData.auto_accept_bookings = settings.auto_accept_bookings;
    }
    if (settings.require_photo_consent !== undefined) {
      updateData.require_photo_consent = settings.require_photo_consent;
    }

    if (existingSettings) {
      // 更新
      const { error: updateError } = await supabase
        .from('user_settings')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        logger.error('撮影関連設定の更新エラー:', updateError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    } else {
      // 新規作成
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...updateData,
        });

      if (insertError) {
        logger.error('撮影関連設定の作成エラー:', insertError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    }

    logger.info('撮影関連設定を更新しました', {
      userId: user.id,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    logger.error('撮影関連設定更新中の予期しないエラー:', error);
    return { success: false, error: '設定の保存に失敗しました' };
  }
}

/**
 * 撮影関連設定を取得
 */
export async function getPhotoSessionSettings(): Promise<{
  success: boolean;
  data?: PhotoSessionSettings;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('撮影関連設定取得エラー:', error);
      return { success: false, error: '設定の取得に失敗しました' };
    }

    return {
      success: true,
      data: data
        ? {
            instant_photo_available: data.instant_photo_available ?? false,
            max_travel_distance: data.max_travel_distance ?? 10,
            auto_accept_bookings: data.auto_accept_bookings ?? false,
            require_photo_consent: data.require_photo_consent ?? true,
          }
        : {
            instant_photo_available: false,
            max_travel_distance: 10,
            auto_accept_bookings: false,
            require_photo_consent: true,
          },
    };
  } catch (error) {
    logger.error('撮影関連設定取得中の予期しないエラー:', error);
    return { success: false, error: '設定の取得に失敗しました' };
  }
}

/**
 * セキュリティ設定を保存
 */
export async function updateSecuritySettings(
  settings: Partial<SecuritySettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // user_settingsテーブルを取得または作成
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const updateData: Partial<SecuritySettings> = {};

    if (settings.two_factor_enabled !== undefined) {
      updateData.two_factor_enabled = settings.two_factor_enabled;
    }

    if (existingSettings) {
      // 更新
      const { error: updateError } = await supabase
        .from('user_settings')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        logger.error('セキュリティ設定の更新エラー:', updateError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    } else {
      // 新規作成
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...updateData,
        });

      if (insertError) {
        logger.error('セキュリティ設定の作成エラー:', insertError);
        return { success: false, error: '設定の保存に失敗しました' };
      }
    }

    logger.info('セキュリティ設定を更新しました', {
      userId: user.id,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    logger.error('セキュリティ設定更新中の予期しないエラー:', error);
    return { success: false, error: '設定の保存に失敗しました' };
  }
}

/**
 * セキュリティ設定を取得
 */
export async function getSecuritySettings(): Promise<{
  success: boolean;
  data?: SecuritySettings;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('セキュリティ設定取得エラー:', error);
      return { success: false, error: '設定の取得に失敗しました' };
    }

    return {
      success: true,
      data: data
        ? {
            two_factor_enabled: data.two_factor_enabled ?? false,
          }
        : {
            two_factor_enabled: false,
          },
    };
  } catch (error) {
    logger.error('セキュリティ設定取得中の予期しないエラー:', error);
    return { success: false, error: '設定の取得に失敗しました' };
  }
}
