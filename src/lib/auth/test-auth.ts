/**
 * 開発環境専用のテスト認証ヘルパー
 * 本番環境では絶対に使用しないこと
 */

export interface TestUserProfile {
  id: string;
  email: string;
  display_name: string;
  user_type: 'model' | 'photographer' | 'organizer';
  bio: string;
  location: string;
  is_verified: boolean;
}

export const TEST_ACCOUNTS: TestUserProfile[] = [
  {
    id: '2d5e8f3a-1b4c-4d6e-9f8a-3c5d7e9f1a2b',
    email: 'ninagawa.mika@example.com',
    display_name: '蜷川実花',
    user_type: 'photographer',
    bio: '色彩豊かで独創的な世界観を表現するフォトグラファーです。ポートレートからファッション撮影まで幅広く対応いたします。',
    location: '東京都',
    is_verified: true,
  },
  {
    id: '4f7a9c2d-3e6b-5f8c-1a4d-7e9f2c5a8b1d',
    email: 'kohinata.yuka@example.com',
    display_name: '小日向ゆか',
    user_type: 'model',
    bio: '自然な笑顔と表現力豊かなポージングが得意なモデルです。ポートレートやファッション撮影でお手伝いさせていただきます。',
    location: '東京都',
    is_verified: true,
  },
  {
    id: '6b8d1f4e-5c7a-6b9d-2f5e-8c1f4a7b9e2c',
    email: 'kotori.photosession@example.com',
    display_name: 'ことり撮影会',
    user_type: 'organizer',
    bio: '初心者からプロまで楽しめる撮影会を企画・運営しています。アットホームな雰囲気で素敵な作品作りをサポートします。',
    location: '東京都',
    is_verified: true,
  },
];

/**
 * 開発環境でテストユーザーとしてログインする
 * @param userId テストユーザーのID
 * @returns 成功/失敗
 */
export async function loginAsTestUser(userId: string): Promise<boolean> {
  // 本番環境では実行を拒否
  if (process.env.NODE_ENV === 'production') {
    console.error('テストログインは本番環境では利用できません');
    return false;
  }

  const testUser = TEST_ACCOUNTS.find(account => account.id === userId);
  if (!testUser) {
    console.error('指定されたテストユーザーが見つかりません:', userId);
    return false;
  }

  try {
    // セッション情報をローカルストレージに保存
    const mockSession = {
      access_token: `dev-mock-${userId}`,
      refresh_token: `dev-mock-refresh-${userId}`,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: testUser.id,
        email: testUser.email,
        user_metadata: {
          full_name: testUser.display_name,
          user_type: testUser.user_type,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Supabaseのローカルストレージキーを生成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL が設定されていません');
    }

    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    localStorage.setItem(storageKey, JSON.stringify(mockSession));

    console.log(
      `テストユーザー ${testUser.display_name} としてログインしました`
    );
    return true;
  } catch (error) {
    console.error('テストログインエラー:', error);
    return false;
  }
}

/**
 * テストログインからログアウトする
 */
export function logoutTestUser(): void {
  if (process.env.NODE_ENV === 'production') {
    console.error('テストログアウトは本番環境では利用できません');
    return;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL が設定されていません');
    }

    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    localStorage.removeItem(storageKey);
    console.log('テストユーザーからログアウトしました');
  } catch (error) {
    console.error('テストログアウトエラー:', error);
  }
}

/**
 * 現在のテストユーザー情報を取得する
 */
export function getCurrentTestUser(): TestUserProfile | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return null;
    }

    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    const sessionData = localStorage.getItem(storageKey);
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);
    const userId = session.user?.id;

    if (!userId) {
      return null;
    }

    return TEST_ACCOUNTS.find(account => account.id === userId) || null;
  } catch (error) {
    console.error('テストユーザー取得エラー:', error);
    return null;
  }
}

/**
 * 開発環境かどうかをチェックする
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development';
}
