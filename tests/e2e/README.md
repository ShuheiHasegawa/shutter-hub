# E2E テスト構造

ShutterHub v2のE2Eテストは、アプリケーションの構造に沿って整理されています。

## ディレクトリ構造

```
tests/
├── e2e/
│   ├── auth/                 # 認証関連のテスト
│   │   ├── login.spec.ts     # ログイン・ログアウト
│   │   └── permissions.spec.ts # 権限管理
│   ├── dashboard/            # ダッシュボード関連
│   │   └── dashboard-navigation.spec.ts
│   ├── studios/              # スタジオ機能関連
│   │   ├── studio-create.spec.ts
│   │   ├── studio-edit.spec.ts
│   │   └── studio-list.spec.ts
│   ├── instant/              # 即座撮影関連
│   │   └── instant-request.spec.ts
│   ├── profile/              # プロフィール関連
│   └── dev/                  # 開発・デバッグ用
│       └── database-validation.spec.ts
├── helpers/                  # 共通ヘルパー
│   └── test-data.ts          # テストデータとヘルパー関数
└── README.md
```

## テストカテゴリ

### 1. 認証テスト (`auth/`)
- ユーザーログイン/ログアウト
- 権限チェック（photographer/organizer/admin）
- セッション管理

### 2. ダッシュボードテスト (`dashboard/`)
- ダッシュボード表示
- ナビゲーション
- 統計表示

### 3. スタジオ機能テスト (`studios/`)
- スタジオ作成
- スタジオ編集（権限チェック含む）
- スタジオ一覧・検索

### 4. 即座撮影テスト (`instant/`)
- ゲスト機能
- カメラマンマッチング
- リクエスト処理

### 5. 開発・デバッグテスト (`dev/`)
- データベース状態の確認
- デバッグ情報の検証

## 実行方法

```bash
# 全てのE2Eテストを実行
npm run test:e2e

# 特定のカテゴリのみ実行
npx playwright test tests/e2e/studios/

# 特定のテストファイルのみ実行
npx playwright test tests/e2e/studios/studio-edit.spec.ts

# ヘッドレスモードで実行（デバッグ用）
npx playwright test --headed
```

## 共通ヘルパーの使用

`tests/helpers/test-data.ts`には共通のテストデータとヘルパー関数が定義されています：

```typescript
import { login, TEST_USERS, createTestStudio } from '../helpers/test-data';

test('スタジオ作成テスト', async ({ page }) => {
  // organizerでログイン
  await login(page, 'organizer');
  
  // テストスタジオを作成
  const studioId = await createTestStudio(page);
  
  expect(studioId).toBeDefined();
});
```

## ベストプラクティス

1. **テストの独立性**: 各テストは他のテストに依存しないよう設計
2. **共通データの使用**: `test-data.ts`の定数を活用
3. **適切なタイムアウト**: 非同期処理には適切なタイムアウトを設定
4. **エラーハンドリング**: 期待される失敗も含めてテスト
5. **クリーンアップ**: テスト後のデータクリーンアップ（必要に応じて）
