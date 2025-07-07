import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

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
      console.error('既存プロフィールチェックエラー:', checkError);
    }

    // 既に存在する場合は更新
    if (existingProfile) {
      console.log('既存のプロフィールが見つかりました。更新します。');
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
      console.warn(
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
        console.log('プロフィール作成を再試行します...');
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
          console.error('プロフィール再作成に失敗:', retryError);
          return { data: null, error: retryError };
        }
      }

      // 手動でソーシャル機能を初期化
      try {
        console.log('ソーシャル機能を手動で初期化します...');

        // user_preferences を作成
        try {
          await supabase.from('user_preferences').insert({ user_id: user.id });
          console.log('✓ user_preferences created');
        } catch (err) {
          console.warn('user_preferences creation failed:', err);
        }

        // user_follow_stats を作成
        try {
          await supabase.from('user_follow_stats').insert({ user_id: user.id });
          console.log('✓ user_follow_stats created');
        } catch (err) {
          console.warn('user_follow_stats creation failed:', err);
        }

        // timeline_preferences を作成
        try {
          await supabase
            .from('timeline_preferences')
            .insert({ user_id: user.id });
          console.log('✓ timeline_preferences created');
        } catch (err) {
          console.warn('timeline_preferences creation failed:', err);
        }

        // user_rating_stats を作成
        try {
          await supabase.from('user_rating_stats').insert({ user_id: user.id });
          console.log('✓ user_rating_stats created');
        } catch (err) {
          console.warn('user_rating_stats creation failed:', err);
        }
      } catch (initError) {
        console.error('ソーシャル機能初期化エラー:', initError);
        // ソーシャル機能の初期化に失敗してもプロフィール作成は成功とする
      }

      // 最終的にプロフィールを取得して返す
      const { data: finalProfile, error: finalError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (finalError || !finalProfile) {
        console.error('最終プロフィール取得に失敗:', finalError);
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
    console.error('プロフィール作成中に予期しないエラー:', error);
    return { data: null, error };
  }
}

export async function getProfile(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);

  // プロフィールが存在しない場合
  if (!error && (!data || data.length === 0)) {
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
    const { data, error } = await supabase
      .from('profiles')
      .update({
        display_name: profileData.display_name,
        user_type: profileData.user_type,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        instagram_handle: profileData.instagram_handle,
        twitter_handle: profileData.twitter_handle,
        phone: profileData.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('プロフィール更新中に予期しないエラー:', error);
    return { data: null, error };
  }
}
