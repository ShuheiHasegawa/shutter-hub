/**
 * E2Eテスト用ユーザー設定
 *
 * このファイルを編集することで、すべてのE2Eテストで使用するテストユーザーを一元管理できます。
 * 各ユーザーのパスワードは個別に設定できます。
 */

export interface TestUser {
  email: string;
  password: string;
  type: 'organizer' | 'photographer' | 'model';
  displayName: string;
}

/**
 * E2Eテスト用ユーザー設定
 *
 * 各ユーザーのパスワードは個別に設定されています。
 * 環境変数が設定されている場合は環境変数を使用し、
 * 設定されていない場合はデフォルトのパスワードを使用します。
 */
export const E2E_TEST_USERS: Record<
  'organizer' | 'photographer' | 'model',
  TestUser
> = {
  organizer: {
    email: 'malymoon@shutterhub.test',
    password: process.env.MALYMOON_PASSWORD || 'Malymoon2025!',
    type: 'organizer',
    displayName: 'マリームーン撮影会',
  },
  photographer: {
    email: 'ninagawa.mika@testdomain.com',
    password: process.env.PHOTOGRAPHER_PASSWORD || 'test123456',
    type: 'photographer',
    displayName: '蜷川実花',
  },
  model: {
    email: 'yuka.kohinata@testdomain.com',
    password: process.env.MODEL_PASSWORD || 'test123456',
    type: 'model',
    displayName: '小日向ゆか',
  },
};

/**
 * ユーザータイプからテストユーザー情報を取得
 */
export function getTestUser(
  userType: 'organizer' | 'photographer' | 'model'
): TestUser {
  return E2E_TEST_USERS[userType];
}

/**
 * すべてのテストユーザーの配列を取得
 */
export function getAllTestUsers(): TestUser[] {
  return Object.values(E2E_TEST_USERS);
}

/**
 * メールアドレスからテストユーザー情報を取得
 */
export function getTestUserByEmail(email: string): TestUser | undefined {
  return Object.values(E2E_TEST_USERS).find(user => user.email === email);
}
