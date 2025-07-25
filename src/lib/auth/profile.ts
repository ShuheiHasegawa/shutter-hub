import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { generateUsernameFromDisplayName } from '@/app/actions/username';

export type UserType = 'model' | 'photographer' | 'organizer';

export interface CreateProfileData {
  user_type: UserType;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  phone?: string;
  avatar_url?: string;
}

export async function createProfile(
  user: User,
  profileData: CreateProfileData
) {
  const supabase = createClient();

  try {
    // まず既存のプロフィールをチェック
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError) {
      logger.error('既存プロフィールチェックエラー:', checkError);
    }

    // 既に存在する場合は更新
    if (existingProfile) {
      logger.debug('既存のプロフィールが見つかりました。更新します。');
      return await updateProfile(user.id, profileData);
    }

    // 新規作成 - まずトリガーエラーを回避するため、最小限のデータで作成
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        display_name:
          profileData.display_name || user.user_metadata?.full_name || '',
        user_type: profileData.user_type,
      })
      .select()
      .single();

    // トリガーエラー（user_id曖昧性）の場合は、手動で関連データを作成
    if (error && error.code === '42702') {
      logger.warn(
        'トリガーエラーが発生しました。手動で関連データを作成します。'
      );

      // プロフィールが実際に作成されたかチェック
      const { data: createdProfile, error: recheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (recheckError || !createdProfile) {
        // プロフィール作成が完全に失敗した場合、再試行
        logger.debug('プロフィール作成を再試行します...');
        const { error: retryError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            display_name:
              profileData.display_name || user.user_metadata?.full_name || '',
            user_type: profileData.user_type,
          })
          .select()
          .single();

        if (retryError) {
          logger.error('プロフィール再作成に失敗:', retryError);
          return { data: null, error: retryError };
        }
      }

      // 手動でソーシャル機能を初期化
      try {
        logger.debug('ソーシャル機能を手動で初期化します...');

        // user_preferences を作成
        try {
          await supabase.from('user_preferences').insert({ user_id: user.id });
          logger.debug('✓ user_preferences created');
        } catch (err) {
          logger.warn('user_preferences creation failed:', err);
        }

        // user_follow_stats を作成
        try {
          await supabase.from('user_follow_stats').insert({ user_id: user.id });
          logger.debug('✓ user_follow_stats created');
        } catch (err) {
          logger.warn('user_follow_stats creation failed:', err);
        }

        // timeline_preferences を作成
        try {
          await supabase
            .from('timeline_preferences')
            .insert({ user_id: user.id });
          logger.debug('✓ timeline_preferences created');
        } catch (err) {
          logger.warn('timeline_preferences creation failed:', err);
        }

        // user_rating_stats を作成
        try {
          await supabase.from('user_rating_stats').insert({ user_id: user.id });
          logger.debug('✓ user_rating_stats created');
        } catch (err) {
          logger.warn('user_rating_stats creation failed:', err);
        }
      } catch (initError) {
        logger.error('ソーシャル機能初期化エラー:', initError);
        // ソーシャル機能の初期化に失敗してもプロフィール作成は成功とする
      }

      // 最終的にプロフィールを取得して返す
      const { data: finalProfile, error: finalError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (finalError || !finalProfile) {
        logger.error('最終プロフィール取得に失敗:', finalError);
        return {
          data: null,
          error: finalError || new Error('Profile not found after creation'),
        };
      }

      // 残りのプロフィールデータを更新
      if (
        profileData.bio ||
        profileData.location ||
        profileData.website ||
        profileData.instagram_handle ||
        profileData.twitter_handle ||
        profileData.phone
      ) {
        return await updateProfile(user.id, profileData);
      }

      return { data: finalProfile, error: null };
    }

    // エラーがない場合は通常通り
    if (!error && data) {
      // Google認証などで表示名が設定されている場合、username候補を生成
      if (data.display_name && !profileData.user_type) {
        // バックグラウンドでusername候補を生成（エラーは無視）
        generateUsernameFromDisplayName(data.display_name).catch(err => {
          logger.warn('Username候補生成エラー:', err);
        });
      }

      // 残りのプロフィールデータを更新
      if (
        profileData.bio ||
        profileData.location ||
        profileData.website ||
        profileData.instagram_handle ||
        profileData.twitter_handle ||
        profileData.phone
      ) {
        return await updateProfile(user.id, profileData);
      }
      return { data, error: null };
    }

    return { data, error };
  } catch (error) {
    logger.error('プロフィール作成中に予期しないエラー:', error);
    return { data: null, error };
  }
}

export async function getProfile(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // プロフィールが存在しない場合は error が設定される（.single()使用時）
  if (error && error.code === 'PGRST116') {
    return {
      data: null,
      error: {
        code: 'PROFILE_NOT_FOUND',
        message: 'Profile not found',
      },
    };
  }

  // データが存在する場合は最初の要素を返す
  if (!error && data && data.length > 0) {
    return { data: data[0], error: null };
  }

  return { data, error };
}

export async function updateProfile(
  userId: string,
  profileData: Partial<CreateProfileData>
) {
  const supabase = createClient();

  try {
    logger.debug('プロフィール更新開始（データベース）', {
      userId,
      profileData,
      avatarUrl: profileData.avatar_url,
    });

    const updateData = {
      display_name: profileData.display_name,
      user_type: profileData.user_type,
      bio: profileData.bio,
      location: profileData.location,
      website: profileData.website,
      instagram_handle: profileData.instagram_handle,
      twitter_handle: profileData.twitter_handle,
      phone: profileData.phone,
      avatar_url: profileData.avatar_url,
      updated_at: new Date().toISOString(),
    };

    logger.debug('データベース更新実行', { userId, updateData });

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('データベース更新エラー', {
        userId,
        error,
        updateData,
        avatarUrl: profileData.avatar_url,
      });
      return { data, error };
    }

    logger.info('データベース更新成功', {
      userId,
      updatedProfile: data,
      newAvatarUrl: data?.avatar_url,
      updatedAt: data?.updated_at,
    });

    return { data, error };
  } catch (error) {
    logger.error('プロフィール更新中に予期しないエラー', {
      error,
      userId,
      profileData,
    });
    return { data: null, error };
  }
}
