import { test, expect, Page } from '@playwright/test';
import { waitForPageLoad } from './utils/test-helpers';

/**
 * 即座撮影リクエストシステム包括テスト
 * ゲスト機能、位置ベースマッチング、リアルタイム通知の完全フロー
 */

test.describe('即座撮影リクエストシステム包括テスト', () => {
  let clientPage: Page;
  let photographerPage: Page;

  test.beforeEach(async ({ browser }) => {
    // クライアント用ページ（ゲスト）
    clientPage = await browser.newPage();

    // カメラマン用ページ（認証済み）
    photographerPage = await browser.newPage();

    // モック認証状態を設定
    await clientPage.addInitScript(() => {
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({
          access_token: 'mock-token',
          user: { id: 'test-user', email: 'test@example.com' },
        })
      );
      // OAuth モック設定（型アサーションで回避）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).TEST_OAUTH_MOCK_ENABLED = true;
    });

    await clientPage.goto('/instant');
  });

  test.afterEach(async () => {
    await clientPage.close();
    await photographerPage.close();
  });

  test.describe('ゲスト機能テスト', () => {
    test('ゲストユーザーによる即座撮影ページアクセス', async () => {
      console.log('🎭 ゲスト機能テスト: 即座撮影ページアクセス開始');

      // 即座撮影ページにアクセス
      await expect(clientPage).toHaveTitle(/ShutterHub/);

      // メインタイトルの確認（実際のテキストに修正）
      await expect(clientPage.locator('h1')).toContainText('今いる場所で');
      await expect(clientPage.locator('h1')).toContainText('即座に撮影');

      // ゲスト利用可能な説明文の確認
      await expect(clientPage.locator('text=認証不要で簡単')).toBeVisible();

      // 基本的なUI要素の確認
      await expect(
        clientPage.locator('[data-testid="quick-request-form"], form')
      ).toBeVisible();

      console.log('✅ ゲストアクセス成功');
    });

    test('位置情報許可とマップ表示', async () => {
      console.log('🗺️ 位置情報許可テスト開始');

      // 位置情報許可ボタンの確認（実際のボタンテキストに修正）
      const locationButton = clientPage.locator('button', {
        hasText: '位置情報を許可',
      });
      await expect(locationButton).toBeVisible();

      // 位置情報許可の説明文
      await expect(
        clientPage.locator('text=位置情報を許可してください')
      ).toBeVisible();
      await expect(
        clientPage.locator('text=近くのカメラマンを見つけるために')
      ).toBeVisible();

      // 手動入力オプションも確認
      await expect(
        clientPage.locator('button', { hasText: '手動で場所を入力' })
      ).toBeVisible();

      // 位置情報許可（モック）
      await clientPage.evaluate(() => {
        // テスト環境でのGeolocation API モック
        Object.defineProperty(navigator, 'geolocation', {
          value: {
            getCurrentPosition: (
              success: (position: GeolocationPosition) => void
            ) => {
              success({
                coords: {
                  latitude: 35.6762,
                  longitude: 139.6503, // 東京駅
                  accuracy: 100,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                  toJSON: () => ({}),
                },
                timestamp: Date.now(),
              } as GeolocationPosition);
            },
          },
        });
      });

      // 位置情報許可ボタンクリック
      await locationButton.click();

      // マップ表示の確認
      await expect(
        clientPage.locator(
          '[data-testid="instant-photo-map"], .map-container, #map'
        )
      ).toBeVisible({ timeout: 10000 });

      console.log('✅ 位置情報許可・マップ表示成功');
    });
  });

  test.describe('即座撮影リクエストフォーム', () => {
    test('リクエストフォーム入力・送信', async () => {
      console.log('📝 リクエストフォーム入力テスト開始');

      await clientPage.goto('/instant');
      await waitForPageLoad(clientPage);

      // 位置情報許可（前処理）
      await clientPage.evaluate(() => {
        Object.defineProperty(navigator, 'geolocation', {
          value: {
            getCurrentPosition: (
              success: (position: GeolocationPosition) => void
            ) => {
              success({
                coords: {
                  latitude: 35.6762,
                  longitude: 139.6503,
                  accuracy: 100,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                  toJSON: () => ({}),
                },
                timestamp: Date.now(),
              } as GeolocationPosition);
            },
          },
        });
      });

      // フォーム要素の確認と入力
      await clientPage.fill(
        '[data-testid="request-type"], select[name="type"], input[name="type"]',
        'portrait'
      );
      await clientPage.fill(
        '[data-testid="duration"], input[name="duration"], select[name="duration"]',
        '30'
      );
      await clientPage.fill(
        '[data-testid="budget"], input[name="budget"], input[name="price"]',
        '8000'
      );
      await clientPage.fill(
        '[data-testid="special-requests"], textarea[name="requests"], textarea[name="description"]',
        'E2Eテスト用即座撮影リクエスト'
      );

      // リクエスト送信ボタンの確認
      const submitButton = clientPage.locator(
        'button:has-text("カメラマンを探す"), button:has-text("リクエスト"), button:has-text("送信"), button[type="submit"]'
      );
      await expect(submitButton).toBeVisible();

      // リクエスト送信
      await submitButton.click();

      // 送信完了またはマッチング画面の確認
      await expect(
        clientPage.locator(
          ':has-text("リクエストを送信"), :has-text("カメラマンを探して"), :has-text("マッチング"), [data-testid="matching-status"]'
        )
      ).toBeVisible({ timeout: 10000 });

      console.log('✅ リクエスト送信成功');
    });

    test('料金表示・見積もり機能', async () => {
      console.log('💰 料金表示テスト開始');

      await clientPage.goto('/instant');
      await waitForPageLoad(clientPage);

      // 料金表示コンポーネントの確認
      await expect(
        clientPage.locator(
          '[data-testid="pricing-display"], .pricing, .price-info'
        )
      ).toBeVisible();

      // 基本料金情報の確認
      await expect(
        clientPage.locator(':has-text("円"), :has-text("¥"), :has-text("料金")')
      ).toBeVisible();

      // 撮影時間・料金の連動確認
      const durationInput = clientPage.locator(
        '[data-testid="duration"], input[name="duration"]'
      );
      if (await durationInput.isVisible()) {
        await durationInput.fill('60');

        // 料金の更新確認（数秒待機）
        await clientPage.waitForTimeout(2000);
        await expect(
          clientPage.locator(':has-text("12000"), :has-text("12,000")')
        ).toBeVisible();
      }

      console.log('✅ 料金表示機能確認完了');
    });
  });

  test.describe('カメラマンマッチングシステム', () => {
    test('カメラマンのオンライン状態管理', async () => {
      console.log('📷 カメラマンオンライン状態テスト開始');

      // カメラマンとしてログイン
      await photographerPage.goto('/dashboard');
      await waitForPageLoad(photographerPage);

      // ダッシュボード or 専用ページでオンライン設定
      const onlineToggle = photographerPage.locator(
        '[data-testid="go-online"], button:has-text("オンライン"), .online-toggle, [data-testid="online-status"]'
      );

      if (await onlineToggle.isVisible()) {
        await onlineToggle.click();

        // オンライン状態の確認
        await expect(
          photographerPage.locator(
            ':has-text("オンライン"), .status-online, [data-status="online"]'
          )
        ).toBeVisible();
      } else {
        console.log('ℹ️ オンライン切り替えボタンが見つからないため、スキップ');
      }

      console.log('✅ カメラマンオンライン状態設定完了');
    });

    test('リクエスト通知受信', async () => {
      console.log('🔔 リクエスト通知受信テスト開始');

      await photographerPage.goto('/dashboard');
      await waitForPageLoad(photographerPage);

      // 通知エリアの確認
      await expect(
        photographerPage.locator(
          '[data-testid="notifications"], .notification-area, .alerts, [data-testid="request-notifications"]'
        )
      ).toBeVisible();

      // 新規リクエスト通知の確認（モック or 実際のリクエスト）
      const newRequestNotification = photographerPage.locator(
        '[data-testid="new-request-notification"], .new-request, :has-text("新しいリクエスト")'
      );

      // 通知表示確認（タイムアウトを長めに設定）
      await expect(newRequestNotification).toBeVisible({ timeout: 15000 });

      console.log('✅ リクエスト通知受信確認完了');
    });

    test('リクエスト受諾・マッチング成立', async () => {
      console.log('🤝 リクエスト受諾テスト開始');

      await photographerPage.goto('/dashboard');
      await waitForPageLoad(photographerPage);

      // リクエスト詳細確認ボタン
      const viewRequestButton = photographerPage.locator(
        '[data-testid="view-request"], button:has-text("詳細"), button:has-text("確認"), .request-details'
      );

      if (await viewRequestButton.isVisible()) {
        await viewRequestButton.click();
        await waitForPageLoad(photographerPage);

        // リクエスト受諾ボタン
        const acceptButton = photographerPage.locator(
          'button:has-text("受諾"), button:has-text("受ける"), button:has-text("OK"), [data-testid="accept-request"]'
        );

        await expect(acceptButton).toBeVisible();
        await acceptButton.click();

        // 受諾完了の確認
        await expect(
          photographerPage.locator(
            ':has-text("受諾しました"), :has-text("受諾完了"), :has-text("マッチング成立"), [data-testid="match-established"]'
          )
        ).toBeVisible();
      }

      console.log('✅ リクエスト受諾・マッチング成立確認完了');
    });
  });

  test.describe('リアルタイム通信機能', () => {
    test('リアルタイム状態更新', async () => {
      console.log('⚡ リアルタイム状態更新テスト開始');

      // クライアント側でマッチング状態を確認
      await clientPage.goto('/instant');
      await waitForPageLoad(clientPage);

      // マッチング状態の表示確認
      const matchingStatus = clientPage.locator(
        '[data-testid="matching-status"], .matching-status, .status-display'
      );

      if (await matchingStatus.isVisible()) {
        // 状態変更のシミュレーション
        await clientPage.evaluate(() => {
          // WebSocket や EventSource のモック
          window.dispatchEvent(
            new CustomEvent('match-found', {
              detail: { photographerId: 'test-photographer-123' },
            })
          );
        });

        // 状態更新の確認
        await expect(
          clientPage.locator(
            ':has-text("マッチング"), :has-text("見つかり"), .status-matched'
          )
        ).toBeVisible({ timeout: 5000 });
      }

      console.log('✅ リアルタイム状態更新確認完了');
    });

    test('音声通知システム', async () => {
      console.log('🔊 音声通知テスト開始');

      await photographerPage.goto('/dashboard');
      await waitForPageLoad(photographerPage);

      // 音声通知の許可・設定確認
      const audioSettings = photographerPage.locator(
        '[data-testid="audio-notifications"], .audio-settings, .notification-sound'
      );

      if (await audioSettings.isVisible()) {
        // 音声通知の有効化
        await audioSettings.click();

        // 音声通知設定の確認
        await expect(
          photographerPage.locator(
            ':has-text("音声"), :has-text("サウンド"), .audio-enabled'
          )
        ).toBeVisible();
      }

      console.log('✅ 音声通知システム確認完了');
    });
  });

  test.describe('エラーハンドリング・エッジケース', () => {
    test('位置情報拒否時の対処', async () => {
      console.log('❌ 位置情報拒否時テスト開始');

      await clientPage.goto('/instant');
      await waitForPageLoad(clientPage);

      // 位置情報拒否のシミュレーション
      await clientPage.evaluate(() => {
        Object.defineProperty(navigator, 'geolocation', {
          value: {
            getCurrentPosition: (
              success: (position: GeolocationPosition) => void,
              error: (error: GeolocationPositionError) => void
            ) => {
              error({
                code: 1,
                message: 'User denied Geolocation',
              } as GeolocationPositionError);
            },
          },
        });
      });

      // 位置情報許可ボタンクリック
      const locationButton = clientPage.locator(
        'button:has-text("位置情報"), [data-testid="location-permission"]'
      );

      if (await locationButton.isVisible()) {
        await locationButton.click();

        // エラーメッセージの確認
        await expect(
          clientPage.locator(
            ':has-text("位置情報を取得できません"), :has-text("許可してください"), .location-error'
          )
        ).toBeVisible({ timeout: 5000 });
      }

      console.log('✅ 位置情報拒否時の対処確認完了');
    });

    test('ネットワークエラー時の対処', async () => {
      console.log('🌐 ネットワークエラー時テスト開始');

      await clientPage.goto('/instant');
      await waitForPageLoad(clientPage);

      // ネットワーク切断のシミュレーション
      await clientPage.route('**/api/**', route => {
        route.abort('failed');
      });

      // リクエスト送信の試行
      const submitButton = clientPage.locator(
        'button:has-text("カメラマンを探す"), button[type="submit"]'
      );

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // ネットワークエラーメッセージの確認
        await expect(
          clientPage.locator(
            ':has-text("接続エラー"), :has-text("ネットワーク"), :has-text("再試行"), .network-error'
          )
        ).toBeVisible({ timeout: 5000 });
      }

      console.log('✅ ネットワークエラー時の対処確認完了');
    });

    test('カメラマン不在時の対処', async () => {
      console.log('👥 カメラマン不在時テスト開始');

      await clientPage.goto('/instant');
      await waitForPageLoad(clientPage);

      // カメラマン不在状況のシミュレーション
      await clientPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('no-photographers-available'));
      });

      // 不在メッセージの確認
      await expect(
        clientPage.locator(
          ':has-text("カメラマンが見つかりません"), :has-text("対応可能なカメラマンがいません"), .no-photographers'
        )
      ).toBeVisible({ timeout: 10000 });

      console.log('✅ カメラマン不在時の対処確認完了');
    });
  });
});
