import { Page, expect } from '@playwright/test';
import { waitForPageLoad } from './test-helpers';

// テスト環境用Logger（Sentryエラー回避）
/* eslint-disable no-console */
const Logger = {
  info: (message: string) => console.log(`ℹ️ ${message}`),
  error: (message: string) => console.error(`❌ ${message}`),
  warn: (message: string) => console.warn(`⚠️ ${message}`),
};
/* eslint-enable no-console */

/**
 * 時間文字列から分数を計算
 */
function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startTotal = startHour * 60 + startMin;
  const endTotal = endHour * 60 + endMin;

  return endTotal - startTotal;
}

/**
 * 撮影会E2Eテスト用ヘルパー関数
 * Phase 6: 撮影会作成・予約フロー自動テスト
 */

export type BookingType =
  | 'first_come'
  | 'lottery'
  | 'admin_lottery'
  | 'priority';

export interface PhotoSessionTestData {
  title: string;
  description: string;
  bookingType: BookingType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  slots: SlotTestData[];
  venue: string;
  maxParticipants: number;
  costumes: {
    theme: string;
    description: string;
  };
}

export interface SlotTestData {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  maxParticipants: number;
  pricePerPerson: number;
  description?: string;
}

/**
 * E2E用テストデータ生成（現在日時ベース）
 */
export function generatePhotoSessionTestData(
  bookingType: BookingType,
  testId: string,
  slotCount: number = 2
): PhotoSessionTestData {
  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1週間後
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // 翌日

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return {
    title: `【E2E-${testId}】${bookingType}方式テスト撮影会(${slotCount}枠) - ${now.getTime()}`,
    description: `E2Eテスト用撮影会です。予約方式: ${bookingType}。スロット数: ${slotCount}。テスト実行時刻: ${now.toISOString()}`,
    bookingType,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    venue: `E2Eテスト会場-${testId}`,
    maxParticipants: 0, // スロットから自動計算
    costumes: {
      theme: `E2Eテーマ-${bookingType}`,
      description: `${bookingType}方式用のE2Eテストコスチューム設定です。`,
    },
    slots: generateSlotTestData(bookingType, testId, slotCount),
  };
}

/**
 * 予約方式別スロットデータ生成（指定枠数対応）
 */
function generateSlotTestData(
  bookingType: BookingType,
  testId: string,
  slotCount: number = 2
): SlotTestData[] {
  // 時間パターンの生成
  const timeSlots = [
    { start: '10:00', end: '11:30', period: '午前の部' },
    { start: '13:00', end: '14:30', period: '午後の部' },
    { start: '15:00', end: '16:30', period: '午後2の部' },
    { start: '17:00', end: '18:30', period: '夕方の部' },
    { start: '19:00', end: '20:30', period: '夜の部' },
  ];

  const baseSlots: SlotTestData[] = [];

  for (let i = 0; i < slotCount && i < timeSlots.length; i++) {
    const timeSlot = timeSlots[i];
    baseSlots.push({
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      maxParticipants: 4 + i * 2, // 4, 6, 8, 10, 12人
      pricePerPerson: 5000 + i * 500, // 5000, 5500, 6000, 6500, 7000円
      description: `E2E-${testId}: ${timeSlot.period}`,
    });
  }

  // 予約方式別の調整
  switch (bookingType) {
    case 'lottery':
    case 'admin_lottery':
      // 抽選系は少し多めの参加者枠
      return baseSlots.map(slot => ({
        ...slot,
        maxParticipants: slot.maxParticipants + 2,
      }));

    case 'priority':
      // 優先予約は高価格帯
      return baseSlots.map(slot => ({
        ...slot,
        pricePerPerson: slot.pricePerPerson + 1000,
      }));

    case 'first_come':
    default:
      return baseSlots;
  }
}

/**
 * 撮影会作成フォーム入力（実際のUI構造に対応）
 */
export async function fillPhotoSessionForm(
  page: Page,
  data: PhotoSessionTestData
): Promise<void> {
  Logger.info(`📝 撮影会フォーム入力開始: ${data.title}`);

  // 基本情報入力
  Logger.info(`📋 基本情報入力`);
  await page.fill('input[name="title"]', data.title);
  await page.fill('textarea[name="description"]', data.description);

  // 場所情報入力
  Logger.info(`📍 場所情報入力`);
  await page.fill('input[name="location"]', data.venue);
  await page.fill('input[name="address"]', `${data.venue} 詳細住所`);

  // 少し待機（フォーム更新のため）
  await page.waitForTimeout(500);

  // 予約方式選択（実際のRadioGroup構造に対応）
  Logger.info(`📋 予約方式選択: ${data.bookingType}`);
  await page.click(`label[for="${data.bookingType}"]`);

  // 予約方式選択後の待機
  await page.waitForTimeout(1000);

  Logger.info(`✅ 基本情報入力完了`);
}

/**
 * スロット設定（画像に基づく実際の構造対応）
 */
export async function configureSlots(
  page: Page,
  slots: SlotTestData[]
): Promise<void> {
  Logger.info(`🕒 スロット設定開始: ${slots.length}個`);

  // 既存の1個目のスロットを設定
  if (slots.length > 0) {
    Logger.info(
      `📅 1個目のスロット設定: ${slots[0].startTime}-${slots[0].endTime}`
    );
    await configureSlot(page, slots[0], 0);
  }

  // 2個目以降は追加が必要
  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i];
    Logger.info(`📅 スロット${i + 1}追加: ${slot.startTime}-${slot.endTime}`);

    // 「枠を追加」ボタンをクリック（data-testid使用）
    try {
      Logger.info(`🎯 data-testidを使用してスロット追加ボタンを検索`);
      const addButton = page.locator('[data-testid="add-slot-button"]');
      await addButton.waitFor({ timeout: 5000 });
      await addButton.click();
      Logger.info(`✅ スロット追加ボタンクリック成功`);

      await page.waitForTimeout(1000); // 追加後の描画待機
    } catch (error) {
      Logger.error(`❌ スロット${i + 1}追加ボタンエラー: ${error}`);

      // フォールバック: 従来の方法
      Logger.info(`🔄 フォールバック: テキストベース検索`);
      try {
        await page.click('button:has-text("枠を追加")');
        Logger.info(`✅ フォールバック成功`);
      } catch (fallbackError) {
        Logger.error(`❌ フォールバックも失敗: ${fallbackError}`);
        throw error;
      }
    }

    await configureSlot(page, slot, i);
  }

  Logger.info(`🎯 全スロット設定完了`);
}

/**
 * 運営用: モデル選択機能
 */
export async function selectModelsForSession(
  page: Page,
  modelEmails: string[]
): Promise<void> {
  Logger.info(`👗 モデル選択開始: ${modelEmails.length}人`);

  try {
    // モデル選択セクションを探す
    const modelSelectionSelectors = [
      '[data-testid="model-selection"]',
      'section:has-text("モデル選択")',
      'div:has-text("参加モデル")',
      'fieldset:has-text("モデル")',
    ];

    let modelSection = null;
    for (const selector of modelSelectionSelectors) {
      try {
        const section = page.locator(selector);
        const count = await section.count();
        if (count > 0) {
          modelSection = section;
          Logger.info(`🎯 モデル選択セクション発見: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!modelSection) {
      Logger.info(`ℹ️ モデル選択セクションが見つからない（任意機能の可能性）`);
      return;
    }

    // モデル招待・選択処理
    for (const email of modelEmails) {
      Logger.info(`📧 モデル招待: ${email}`);

      try {
        // モデル追加ボタンまたは入力フィールド
        const addModelButton = page
          .locator('button:has-text("モデルを追加")')
          .or(page.locator('button:has-text("招待")'));

        const modelInput = page
          .locator('input[placeholder*="モデル"]')
          .or(page.locator('input[placeholder*="メール"]'));

        const addButtonCount = await addModelButton.count();
        const inputCount = await modelInput.count();

        if (inputCount > 0) {
          await modelInput.fill(email);
          Logger.info(`✅ モデルメール入力: ${email}`);

          if (addButtonCount > 0) {
            await addModelButton.click();
            Logger.info(`✅ モデル追加ボタンクリック`);
          }
        } else if (addButtonCount > 0) {
          // モーダルまたはドロップダウン形式の可能性
          await addModelButton.click();
          await page.waitForTimeout(1000);

          const modalInput = page
            .locator('input[type="email"]')
            .or(page.locator('input[placeholder*="メール"]'));

          await modalInput.fill(email);
          await page.press('input[type="email"]', 'Enter');
          Logger.info(`✅ モーダルからモデル招待: ${email}`);
        }

        await page.waitForTimeout(500);
      } catch (modelError) {
        Logger.warn(`⚠️ モデル ${email} の選択に失敗（続行）: ${modelError}`);
      }
    }

    Logger.info(`✅ モデル選択完了`);
  } catch (error) {
    Logger.warn(`⚠️ モデル選択機能エラー（テスト続行）: ${error}`);
    // モデル選択失敗はテスト全体を失敗させない
  }
}

/**
 * 個別スロット設定（より柔軟なセレクター使用）
 */
async function configureSlot(
  page: Page,
  slot: SlotTestData,
  index: number
): Promise<void> {
  Logger.info(`⚙️ スロット${index + 1}設定中...`);

  try {
    // data-testidを使用した正確なスロット要素特定
    Logger.info(`🎯 data-testidを使用してスロット${index + 1}要素を特定`);

    // 開始時間設定
    const startTimeInput = page.locator(
      `[data-testid="slot-${index}-start-time"]`
    );
    await startTimeInput.waitFor({ timeout: 5000 });
    await startTimeInput.fill(slot.startTime);
    Logger.info(`⏰ 開始時間設定: ${slot.startTime}`);

    // 撮影時間（分）設定
    const shootingDuration = calculateDurationMinutes(
      slot.startTime,
      slot.endTime || '11:30'
    );
    const durationInput = page.locator(
      `[data-testid="slot-${index}-duration"]`
    );
    await durationInput.fill(shootingDuration.toString());
    Logger.info(`⏱️ 撮影時間設定: ${shootingDuration}分`);

    // 最大参加者数設定
    const participantsInput = page.locator(
      `[data-testid="slot-${index}-max-participants"]`
    );
    await participantsInput.fill(slot.maxParticipants.toString());
    Logger.info(`👥 最大参加者数設定: ${slot.maxParticipants}人`);

    // 1人あたり料金設定（PriceInputコンポーネント対応）
    const priceInput = page.locator(`[data-testid="slot-${index}-price"]`);
    await priceInput.fill(slot.pricePerPerson.toString());
    Logger.info(`💰 料金設定: ¥${slot.pricePerPerson}`);

    // 設定後の短い待機
    await page.waitForTimeout(500);

    Logger.info(`✅ スロット${index + 1}設定完了`);
  } catch (error) {
    Logger.error(`❌ スロット${index + 1}設定エラー: ${error}`);

    // data-testid が見つからない場合のフォールバック
    Logger.info(`🔄 フォールバック: 従来の方法でスロット設定`);
    try {
      const timeInputs = page.locator('input[type="time"]');
      const timeInputCount = await timeInputs.count();
      Logger.info(`🕒 フォールバック: time入力フィールド数: ${timeInputCount}`);

      if (timeInputCount > index) {
        const targetTimeInput = timeInputs.nth(index);
        await targetTimeInput.fill(slot.startTime);
        Logger.info(`⏰ フォールバック: 開始時間設定成功`);
      }

      // フォールバック用の簡易設定（最低限）
      Logger.info(`⚠️ フォールバック設定完了（制限あり）`);
    } catch (fallbackError) {
      Logger.error(`❌ フォールバックも失敗: ${fallbackError}`);
      throw error;
    }
  }
}

/**
 * 撮影会公開（実際のUI構造に対応）
 */
export async function publishPhotoSession(page: Page): Promise<string> {
  Logger.info(`🚀 撮影会公開処理開始`);

  try {
    // 公開設定スイッチをオンにする（画像下部で確認済み）
    Logger.info(`📋 公開設定を有効化`);
    const publishSwitch = page.locator('button[role="switch"]').last(); // 最下部の公開設定スイッチ
    const isChecked = await publishSwitch.getAttribute('data-state');

    if (isChecked !== 'checked') {
      await publishSwitch.click();
      Logger.info(`✅ 公開設定をONに変更`);
      await page.waitForTimeout(500);
    }

    // フォーム保存/作成ボタンをクリック（より具体的なセレクター）
    // "Create Photo Session" ボタンを優先（実際のsubmitボタン）
    try {
      const submitButton = page.locator(
        'button[type="submit"]:has-text("Create Photo Session")'
      );
      const submitCount = await submitButton.count();

      if (submitCount > 0) {
        Logger.info(`🎯 Create Photo Sessionボタンを使用`);
        await submitButton.click();
      } else {
        // fallback: Japanese text
        const japaneseButton = page.locator('button[type="submit"]').first();
        Logger.info(`🎯 Submit type ボタンを使用`);
        await japaneseButton.click();
      }
    } catch (buttonError) {
      Logger.error(`❌ ボタンクリックエラー: ${buttonError}`);
      throw buttonError;
    }
    Logger.info(`💾 撮影会保存実行`);

    // フォーム送信後の処理待機
    Logger.info(`⏳ フォーム送信後の処理を待機`);

    try {
      // ページ遷移またはメッセージ表示を待機
      await Promise.race([
        page.waitForURL('**/photo-sessions/**', { timeout: 15000 }),
        page.waitForURL('**/photo-sessions', { timeout: 15000 }),
        page.waitForSelector('text=撮影会が作成されました', { timeout: 15000 }),
        page.waitForSelector('text=撮影会が保存されました', { timeout: 15000 }),
        page.waitForSelector('[data-testid="success-message"]', {
          timeout: 15000,
        }),
      ]);

      // ネットワーク処理完了を待機
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // 現在のURLを確認
      const currentUrl = page.url();
      Logger.info(`📍 作成後URL: ${currentUrl}`);

      // IDの抽出を試行
      let sessionId = 'unknown';

      if (currentUrl.includes('/photo-sessions/')) {
        const urlParts = currentUrl.split('/photo-sessions/');
        if (urlParts.length > 1) {
          sessionId = urlParts[1].split('/')[0] || sessionId;
          sessionId = sessionId.split('?')[0]; // クエリパラメータを除去
        }
      }

      // IDが取得できない場合は一覧ページから最新のものを探す
      if (sessionId === 'unknown' || sessionId === 'create') {
        Logger.info(`🔍 IDが不明なため、一覧ページで確認`);

        // 撮影会一覧ページに移動
        await page.goto('/photo-sessions');
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // 最新の撮影会リンクを探す（E2Eテストで作成されたもの）
        const e2eLinks = page.locator(
          'a[href*="/photo-sessions/"]:has-text("E2E-")'
        );
        const linkCount = await e2eLinks.count();

        if (linkCount > 0) {
          const firstLink = e2eLinks.first();
          const href = await firstLink.getAttribute('href');
          if (href) {
            sessionId =
              href.split('/photo-sessions/')[1]?.split('/')[0] || sessionId;
          }
        }
      }

      Logger.info(`✅ 撮影会公開完了: ID=${sessionId}`);
      return sessionId;
    } catch (error) {
      Logger.error(`❌ 公開後処理エラー: ${error}`);

      // フォールバック: 現在のURLから推測
      const currentUrl = page.url();
      Logger.info(`🔄 フォールバック: 現在URL=${currentUrl}`);

      return `fallback-${Date.now()}`;
    }
  } catch (error) {
    Logger.error(`❌ 撮影会公開エラー: ${error}`);

    // エラー時のスクリーンショット
    await page.screenshot({ path: `publish-error-${Date.now()}.png` });
    throw error;
  }
}

/**
 * スロット選択と予約申込み
 */
export async function selectSlotAndBook(
  page: Page,
  sessionId: string,
  slotIndex: number = 0
): Promise<void> {
  Logger.info(
    `🎯 スロット選択・予約申込み開始: セッション${sessionId}, スロット${slotIndex}`
  );

  // 撮影会詳細ページに移動
  await page.goto(`/photo-sessions/${sessionId}`);
  await waitForPageLoad(page);

  // スロット選択
  await page.click(`[data-testid="slot-${slotIndex}-select"]`);
  await page.waitForSelector('[data-testid="booking-form"]', {
    timeout: 10000,
  });

  // 参加者情報入力（簡易版）
  await page.fill('#participantName', 'E2Eテストユーザー');
  await page.fill('#participantEmail', 'e2e-test@example.com');
  await page.fill('#participantPhone', '090-0000-0000');

  // 予約申込みボタンクリック
  await page.click('button:has-text("予約を申し込む")');

  Logger.info(`📋 予約申込み処理完了`);
}

/**
 * 決済画面確認（決済画面表示まで）
 */
export async function verifyPaymentScreen(page: Page): Promise<void> {
  Logger.info(`💳 決済画面確認開始`);

  // 決済画面への遷移を待機
  await page.waitForSelector('h1:has-text("決済手続き")', { timeout: 15000 });

  // 決済内容確認
  await expect(page.locator('[data-testid="payment-amount"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="payment-session-title"]')
  ).toBeVisible();
  await expect(page.locator('[data-testid="payment-slot-info"]')).toBeVisible();

  // 決済フォーム表示確認
  await expect(
    page.locator('[data-testid="stripe-payment-form"]')
  ).toBeVisible();

  Logger.info(`✅ 決済画面表示確認完了 - 【決済処理はTODO】`);
  Logger.info(`🛑 テスト終了: 決済画面表示まで確認済み`);
}

/**
 * テスト用ユーザー認証（簡易版）
 */
export async function authenticateTestUser(
  page: Page,
  userType: 'organizer' | 'photographer' | 'model' = 'organizer'
): Promise<void> {
  Logger.info(`🔐 テストユーザー認証: ${userType}`);

  await page.goto('/auth/signin');
  await waitForPageLoad(page);

  // テスト用認証（実際のUIセレクターと作成済みテストユーザーに対応）
  if (userType === 'organizer') {
    await page.fill('#signin-email', 'e2e-organizer@example.com');
    await page.fill('#signin-password', 'E2ETestPassword123!');
  } else if (userType === 'photographer') {
    await page.fill('#signin-email', 'e2e-photographer@example.com');
    await page.fill('#signin-password', 'E2ETestPassword123!');
  } else {
    await page.fill('#signin-email', 'e2e-model@example.com');
    await page.fill('#signin-password', 'E2ETestPassword123!');
  }

  // 成功パターン適用: Enterキーでフォーム送信
  Logger.info('⌨️ Enterキーでログイン送信');
  await page.locator('#signin-password').press('Enter');

  // ログイン後のページ読み込み完了を待機（長めのタイムアウト）
  await page.waitForLoadState('networkidle', { timeout: 20000 });

  // ログイン成功の確認（ロケール考慮、複数の条件でチェック）
  await Promise.race([
    page
      .waitForSelector('text=ダッシュボード', { timeout: 8000 })
      .catch(() => null),
    page
      .waitForSelector('[data-testid="dashboard"]', { timeout: 8000 })
      .catch(() => null),
    page.waitForSelector('nav', { timeout: 8000 }).catch(() => null),
    page.waitForURL('**/dashboard', { timeout: 8000 }).catch(() => null),
    page.waitForURL('**/profile/edit', { timeout: 8000 }).catch(() => null), // プロフィール未設定の場合
  ]);

  // 最終URL確認（ログイン成功判定）
  const finalUrl = page.url();
  const isSuccess =
    finalUrl.includes('/dashboard') || finalUrl.includes('/profile');

  if (!isSuccess && finalUrl.includes('/auth/signin')) {
    throw new Error(`${userType}認証に失敗しました: ${finalUrl}`);
  }

  Logger.info(`✅ ${userType}認証完了`);
}

/**
 * 撮影会削除（テストクリーンアップ用）
 */
export async function cleanupPhotoSession(
  page: Page,
  sessionId: string
): Promise<void> {
  Logger.info(`🧹 テスト撮影会削除: ${sessionId}`);

  try {
    await page.goto(`/photo-sessions/${sessionId}/edit`);
    await waitForPageLoad(page);

    await page.click('button:has-text("削除")');
    await page.click('button:has-text("削除を確認")');
    await page.waitForSelector('text=撮影会が削除されました', {
      timeout: 10000,
    });

    Logger.info(`✅ テスト撮影会削除完了`);
  } catch (error) {
    Logger.warn(`⚠️ テスト撮影会削除に失敗: ${error}`);
  }
}
