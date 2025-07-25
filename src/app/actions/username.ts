'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';

// ユーザーハンドルバリデーション結果の型定義
export interface UsernameValidationResult {
  valid: boolean;
  errors: string[];
  suggestions?: string[];
}

// ユーザー検索結果の型定義
export interface UserSearchResult {
  id: string;
  username: string | null;
  display_name: string;
  user_type: string;
  is_verified: boolean;
  avatar_url: string | null;
  rank?: number;
}

/**
 * ユーザーハンドルのバリデーション
 */
export async function validateUsername(
  username: string
): Promise<UsernameValidationResult> {
  if (!username) {
    return {
      valid: false,
      errors: ['ユーザー名を入力してください'],
    };
  }

  try {
    const supabase = await createClient();

    // バリデーション実行
    const errors: string[] = [];

    // 長さチェック
    if (username.length < 3) {
      errors.push('ユーザー名は3文字以上である必要があります');
    }
    if (username.length > 30) {
      errors.push('ユーザー名は30文字以下である必要があります');
    }

    // 文字種チェック
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('ユーザー名は英数字とアンダースコアのみ使用できます');
    }

    // 予約語チェック
    const { data: reservedData } = await supabase
      .from('reserved_usernames')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (reservedData) {
      errors.push('このユーザー名は予約されています');
    }

    // 重複チェック
    const { data: existingData } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (existingData) {
      errors.push('このユーザー名は既に使用されています');
    }

    const result: UsernameValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    // バリデーションに失敗した場合は候補を生成
    if (!result.valid) {
      const suggestions = await generateUsernameSuggestions(username);
      result.suggestions = suggestions;
    }

    return result;
  } catch (error) {
    logger.error('ユーザー名バリデーション中の予期しないエラー:', error);
    return {
      valid: false,
      errors: ['バリデーション中にエラーが発生しました'],
    };
  }
}

/**
 * ユーザーハンドル候補の生成
 */
export async function generateUsernameSuggestions(
  baseName: string
): Promise<string[]> {
  try {
    const supabase = await createClient();
    const suggestions: string[] = [];
    let cleanBase = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '');

    // 長さの調整
    if (cleanBase.length < 3) {
      cleanBase = cleanBase + 'user';
    }
    if (cleanBase.length > 20) {
      cleanBase = cleanBase.substring(0, 20);
    }

    // 候補生成
    const candidates = [
      cleanBase,
      `${cleanBase}1`,
      `${cleanBase}2`,
      `${cleanBase}3`,
      `${cleanBase}_${Math.floor(Math.random() * 999 + 100)}`,
    ];

    for (const candidate of candidates) {
      if (suggestions.length >= 5) break;

      try {
        // 予約語チェック
        const { data: reserved } = await supabase
          .from('reserved_usernames')
          .select('username')
          .eq('username', candidate)
          .single();

        if (reserved) continue;

        // 重複チェック
        const { data: existing } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', candidate)
          .single();

        if (!existing) {
          suggestions.push(candidate);
        }
      } catch {
        // エラーの場合は候補に追加（利用可能性は後で確認）
        suggestions.push(candidate);
      }
    }

    // フォールバック処理
    if (suggestions.length === 0) {
      return [
        `${cleanBase}_${Math.floor(Math.random() * 9999)}`,
        `user_${Math.floor(Math.random() * 9999)}`,
        `user${Date.now().toString().slice(-6)}`,
      ];
    }

    return suggestions;
  } catch (error) {
    logger.error('ユーザー名候補生成中の予期しないエラー:', error);
    // 最終フォールバック
    const cleanBase = baseName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 15);
    const baseForSuggestions = cleanBase.length >= 3 ? cleanBase : 'user';
    return [
      `${baseForSuggestions}_${Math.floor(Math.random() * 9999)}`,
      `user_${Math.floor(Math.random() * 9999)}`,
      `user${Date.now().toString().slice(-6)}`,
    ];
  }
}

/**
 * ユーザーハンドルの設定
 */
export async function setUsername(
  username: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // バリデーション
    const validation = await validateUsername(username);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors[0] || 'ユーザー名が無効です',
      };
    }

    // ユーザー名を小文字で統一
    const normalizedUsername = username.toLowerCase();

    // プロフィールを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: normalizedUsername })
      .eq('id', user.id);

    if (updateError) {
      logger.error('ユーザー名設定エラー:', updateError);

      // 重複エラーの場合の特別ハンドリング
      if (updateError.code === '23505') {
        return {
          success: false,
          error: 'このユーザー名は既に使用されています',
        };
      }

      return { success: false, error: 'ユーザー名の設定に失敗しました' };
    }

    // キャッシュを無効化
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    logger.info('ユーザー名設定成功:', {
      userId: user.id,
      username: normalizedUsername,
    });
    return { success: true };
  } catch (error) {
    logger.error('ユーザー名設定中の予期しないエラー:', error);
    return { success: false, error: 'ユーザー名の設定に失敗しました' };
  }
}

/**
 * 現在のユーザーのユーザーハンドルを取得
 */
export async function getCurrentUsername(): Promise<string | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('ユーザー名取得エラー:', error);
      return null;
    }

    return data?.username || null;
  } catch (error) {
    logger.error('ユーザー名取得中の予期しないエラー:', error);
    return null;
  }
}

/**
 * ユーザーハンドルのリアルタイムチェック（入力中の即座検証用）
 */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean; message?: string }> {
  if (!username || username.length < 3) {
    return {
      available: false,
      message: 'ユーザー名は3文字以上で入力してください',
    };
  }

  try {
    const supabase = await createClient();

    // 基本的な文字チェック
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        available: false,
        message: '英数字とアンダースコアのみ使用できます',
      };
    }

    // 予約語チェック
    const { data: reservedData, error: reservedError } = await supabase
      .from('reserved_usernames')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (reservedError && reservedError.code !== 'PGRST116') {
      logger.error('予約語チェックエラー:', reservedError);
      return { available: false, message: 'チェック中にエラーが発生しました' };
    }

    if (reservedData) {
      return { available: false, message: 'このユーザー名は予約されています' };
    }

    // 重複チェック
    const { data: existingData, error: existingError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      logger.error('重複チェックエラー:', existingError);
      return { available: false, message: 'チェック中にエラーが発生しました' };
    }

    if (existingData) {
      return {
        available: false,
        message: 'このユーザー名は既に使用されています',
      };
    }

    return { available: true, message: 'このユーザー名は利用可能です' };
  } catch (error) {
    logger.error('ユーザー名利用可能性チェック中の予期しないエラー:', error);
    return { available: false, message: 'チェック中にエラーが発生しました' };
  }
}

/**
 * 統合ユーザー検索（@username + display_name）
 */
export async function searchUsers(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<UserSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const supabase = await createClient();
    const searchTerm = `%${query.trim()}%`;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, user_type, is_verified, avatar_url')
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('ユーザー検索エラー:', error);
      return [];
    }

    return (profiles || []).map(profile => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name || '',
      user_type: profile.user_type,
      is_verified: profile.is_verified,
      avatar_url: profile.avatar_url,
      rank: 1.0,
    }));
  } catch (error) {
    logger.error('ユーザー検索中の予期しないエラー:', error);
    return [];
  }
}

/**
 * @username形式での特定ユーザー検索
 */
export async function getUserByUsername(
  username: string
): Promise<UserSearchResult | null> {
  if (!username) {
    return null;
  }

  try {
    const supabase = await createClient();

    // @マークを除去
    const cleanUsername = username.replace('@', '').toLowerCase();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, user_type, is_verified, avatar_url')
      .eq('username', cleanUsername)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // ユーザーが見つからない
      }
      logger.error('ユーザー名による検索エラー:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('ユーザー名による検索中の予期しないエラー:', error);
    return null;
  }
}

/**
 * display_nameベースのユーザーハンドル候補生成（Google認証新規登録用）
 */
export async function generateUsernameFromDisplayName(
  displayName: string
): Promise<string[]> {
  if (!displayName) {
    return ['user1', 'user2', 'user3'];
  }

  try {
    // display_nameから基本的なusernameを生成
    let baseName = displayName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '') // 英数字とアンダースコア以外を除去
      .replace(/^[0-9]+/, '') // 先頭の数字を除去
      .substring(0, 20); // 最大20文字

    // 短すぎる場合は"user"を追加
    if (baseName.length < 3) {
      baseName = `user${baseName}`;
    }

    // 候補を生成
    const suggestions = await generateUsernameSuggestions(baseName);

    // 候補が空の場合はフォールバック
    if (suggestions.length === 0) {
      return [`user${Date.now()}`, `user${Math.floor(Math.random() * 9999)}`];
    }

    return suggestions;
  } catch (error) {
    logger.error('display_nameからのユーザー名生成エラー:', error);
    return [`user${Date.now()}`, `user${Math.floor(Math.random() * 9999)}`];
  }
}

/**
 * ユーザーハンドル設定状況の確認
 */
export async function getUsernameStatus(): Promise<{
  hasUsername: boolean;
  username?: string;
  canChange: boolean;
  lastUpdated?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { hasUsername: false, canChange: false };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username, username_updated_at')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('ユーザー名状況取得エラー:', error);
      return { hasUsername: false, canChange: false };
    }

    const hasUsername = !!data?.username;
    const lastUpdated = data?.username_updated_at;

    // ユーザー名変更の制限（例：30日間に1回まで）
    const canChange =
      !lastUpdated ||
      new Date().getTime() - new Date(lastUpdated).getTime() >
        30 * 24 * 60 * 60 * 1000;

    return {
      hasUsername,
      username: data?.username || undefined,
      canChange,
      lastUpdated: lastUpdated || undefined,
    };
  } catch (error) {
    logger.error('ユーザー名状況取得中の予期しないエラー:', error);
    return { hasUsername: false, canChange: false };
  }
}
