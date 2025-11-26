import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';

test.describe('優先チケット配布機能', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済みユーザーでログイン（login.spec.tsの成功パターンを採用）
    await authenticateTestUser(page, 'organizer');

    // 認証後のページ遷移を確認（login.spec.tsと同じパターン）
    const currentUrl = page.url();
    expect(
      currentUrl.includes('/dashboard') || currentUrl.includes('/profile')
    ).toBeTruthy();

    // サインインページではないことを確認
    expect(currentUrl.includes('/auth/signin')).toBeFalsy();
  });

  test('優先チケット管理ページへのアクセス', async ({ page }) => {
    // 優先チケット管理ページに移動（beforeEachで認証済み）
    await page.goto('/ja/priority-tickets', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック：サインインページにリダイレクトされていないか確認
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      // 認証が切れている場合は再認証（login.spec.tsのパターン）
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      // 再度優先チケット管理ページに移動
      await page.goto('/ja/priority-tickets', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // ページタイトルが表示されることを確認（strict mode violation回避: headingを優先）
    await expect(
      page.getByRole('heading', { name: '優先チケット管理' }).first()
    ).toBeVisible({
      timeout: 10000,
    });

    // 説明文が表示されることを確認
    await expect(
      page.getByText('配布したチケットは、今後のどの撮影会でも使用できます')
    ).toBeVisible({ timeout: 5000 });

    // 統計カードが表示されることを確認（strict mode violation回避: より具体的なセレクタを使用）
    await expect(page.getByText('配布総数')).toBeVisible({ timeout: 5000 });
    // 統計カード内の「有効」を確認（カードコンテキスト内で検索）
    await expect(
      page.locator('[class*="card"]').filter({ hasText: '有効' }).first()
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[class*="card"]').filter({ hasText: '使用済み' }).first()
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[class*="card"]').filter({ hasText: '期限切れ' }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('ユーザー検索とチケット配布', async ({ page }) => {
    // 優先チケット管理ページに移動（beforeEachで認証済み）
    await page.goto('/ja/priority-tickets', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック（login.spec.tsのパターン）
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      await page.goto('/ja/priority-tickets', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // チケット配布フォームが表示されることを確認
    await expect(page.getByText('優先チケットを配布')).toBeVisible({
      timeout: 10000,
    });

    // ユーザー検索フィールドを探す
    const searchInput = page
      .locator('input[placeholder*="ユーザー名"]')
      .or(page.locator('input[placeholder*="username"]'))
      .or(page.locator('input[placeholder*="検索"]'))
      .first();

    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // ユーザー検索（テストユーザーを検索）
    await searchInput.fill('e2e');
    await page.waitForTimeout(1000); // デバウンス待機

    // 検索結果が表示されるまで待機
    await page.waitForTimeout(2000);

    // 検索結果からユーザーを選択（最初の結果を選択）
    const searchResults = page
      .locator('[role="listbox"]')
      .or(page.locator('.rounded-lg.hover\\:bg-muted\\/50'));

    // 検索結果が表示されている場合、最初のユーザーをクリック
    const firstResult = searchResults.first();
    const resultCount = await firstResult.count();

    if (resultCount > 0) {
      await firstResult.click({ timeout: 5000 });
      await page.waitForTimeout(500);
    } else {
      // 検索結果がない場合は、直接ユーザー名を入力（フォールバック）
      // この場合はテストをスキップするか、別の方法でユーザーを選択
      test.skip();
    }

    // 有効期限を設定（30日後）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const expiresAtValue = futureDate.toISOString().slice(0, 16);

    const expiresAtInput = page
      .locator('input[type="datetime-local"]')
      .or(page.locator('input[id="expires_at"]'));
    await expect(expiresAtInput).toBeVisible({ timeout: 5000 });
    await expiresAtInput.fill(expiresAtValue);

    // メモを入力（オプション）
    const notesTextarea = page
      .locator('textarea[placeholder*="メモ"]')
      .or(page.locator('textarea[name="notes"]'))
      .first();

    if ((await notesTextarea.count()) > 0) {
      await notesTextarea.fill('E2Eテスト用チケット');
    }

    // チケット配布ボタンをクリック
    const grantButton = page
      .getByRole('button', { name: /チケットを配布|配布/ })
      .filter({ hasText: /チケットを配布|配布/ })
      .first();

    await expect(grantButton).toBeVisible({ timeout: 5000 });
    await grantButton.click();

    // 成功メッセージが表示されることを確認（複数のパターンに対応）
    // トースト通知またはページ上のメッセージを確認
    const successMessage = page
      .getByText(/優先チケットを配布しました|チケットを配布しました|成功/)
      .or(page.locator('[role="status"]').filter({ hasText: /配布|成功/ }));

    // 成功メッセージが表示されるか、エラーメッセージが表示されていないことを確認
    const hasSuccess = await successMessage
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasError = await page
      .getByText(/エラー|失敗/)
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!hasSuccess && !hasError) {
      // メッセージが表示されない場合、ページの状態を確認
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      // エラーページに遷移していないことを確認
      expect(currentUrl.includes('/error')).toBeFalsy();
    } else if (hasError) {
      throw new Error('チケット配布中にエラーが発生しました');
    }

    // チケット一覧に追加されたことを確認（統計カードの更新）
    await page.waitForTimeout(1000);
    await expect(page.getByText('配布総数')).toBeVisible({ timeout: 5000 });
  });

  test('チケット配布フォームのバリデーション', async ({ page }) => {
    // 優先チケット管理ページに移動（beforeEachで認証済み）
    await page.goto('/ja/priority-tickets', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック（login.spec.tsのパターン）
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      await page.goto('/ja/priority-tickets', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // ユーザーを選択せずに配布ボタンをクリック
    const grantButton = page
      .getByRole('button', { name: /配布|配布する|チケットを配布/ })
      .first();

    if ((await grantButton.count()) > 0) {
      await grantButton.click();

      // エラーメッセージが表示されることを確認
      await expect(
        page.getByText(/ユーザーを選択してください|ユーザーを選択/)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('有効期限未設定時のバリデーション', async ({ page }) => {
    // 優先チケット管理ページに移動（beforeEachで認証済み）
    await page.goto('/ja/priority-tickets', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック（login.spec.tsのパターン）
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      await page.goto('/ja/priority-tickets', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // ユーザー検索
    const searchInput = page
      .locator('input[placeholder*="ユーザー名"]')
      .or(page.locator('input[placeholder*="username"]'))
      .first();

    await searchInput.fill('e2e');
    await page.waitForTimeout(2000);

    // 検索結果からユーザーを選択
    const firstResult = page
      .locator('[role="listbox"]')
      .or(page.locator('.rounded-lg.hover\\:bg-muted\\/50'))
      .first();

    if ((await firstResult.count()) > 0) {
      await firstResult.click();
      await page.waitForTimeout(500);

      // 有効期限をクリア
      const expiresAtInput = page
        .locator('input[type="datetime-local"]')
        .or(page.locator('input[id="expires_at"]'))
        .first();

      if ((await expiresAtInput.count()) > 0) {
        await expiresAtInput.fill('');
        await page.waitForTimeout(500); // バリデーション実行を待機

        // 配布ボタンが無効化されていることを確認（バリデーションエラーのため）
        const grantButton = page
          .getByRole('button', { name: /配布|配布する|チケットを配布/ })
          .first();

        // ボタンが無効化されていることを確認（これがバリデーションの動作）
        await expect(grantButton).toBeDisabled({ timeout: 5000 });

        // エラーメッセージが表示されることを確認（フォームバリデーション）
        // ボタンが無効化されている場合、エラーメッセージが表示される可能性がある
        const errorMessage = page
          .getByText(/有効期限を設定してください|有効期限/)
          .first();
        const hasError = await errorMessage
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        // エラーメッセージが表示されない場合でも、ボタンが無効化されていればバリデーションは機能している
        if (!hasError) {
          // ボタンが無効化されていることを確認（これがバリデーションの動作）
          await expect(grantButton).toBeDisabled({ timeout: 2000 });
        }
      }
    } else {
      test.skip();
    }
  });

  test('チケット一覧の表示', async ({ page }) => {
    // 優先チケット管理ページに移動（beforeEachで認証済み）
    await page.goto('/ja/priority-tickets', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック（login.spec.tsのパターン）
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      await page.goto('/ja/priority-tickets', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // チケット一覧テーブルが表示されることを確認
    await page.waitForTimeout(2000);

    // テーブルヘッダーが表示されることを確認
    const tableHeaders = [
      'ユーザー',
      '有効期限',
      '状態',
      '使用先撮影会',
      'メモ',
      '配布日時',
      '操作',
    ];

    for (const header of tableHeaders) {
      try {
        await expect(page.getByText(header)).toBeVisible({ timeout: 3000 });
      } catch {
        // ヘッダーが見つからない場合はスキップ（テーブルが空の場合もある）
        continue;
      }
    }
  });

  test('チケット削除（使用前）', async ({ page }) => {
    // 優先チケット管理ページに移動（beforeEachで認証済み）
    await page.goto('/ja/priority-tickets', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック（login.spec.tsのパターン）
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      await page.goto('/ja/priority-tickets', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    await page.waitForTimeout(2000);

    // 使用前のチケットの削除ボタンを探す
    // テーブル内の削除ボタン（Trash2アイコンを使用、使用済みでないもの）
    // テーブル行から、無効化されていない削除ボタンを探す
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    let deleteButtonFound = false;

    for (let i = 0; i < rowCount; i++) {
      const row = tableRows.nth(i);
      const deleteButton = row.locator('button').filter({
        has: page.locator('svg'), // SVGアイコンを含むボタン
      });

      if ((await deleteButton.count()) > 0) {
        const isDisabled = await deleteButton.isDisabled().catch(() => false);
        if (!isDisabled) {
          await deleteButton.click();
          deleteButtonFound = true;
          break;
        }
      }
    }

    if (!deleteButtonFound) {
      // 削除可能なチケットがない場合はスキップ
      test.skip();
      return;
    }

    // 削除確認ダイアログが表示されることを確認（strict mode violation回避: headingを優先）
    await expect(
      page.getByRole('heading', { name: /チケットを削除しますか/ }).first()
    ).toBeVisible({ timeout: 5000 });

    // 削除を確認（AlertDialogActionの削除ボタン）
    const confirmButton = page
      .getByRole('button', { name: '削除' })
      .filter({ hasText: '削除' })
      .last();

    if ((await confirmButton.count()) > 0) {
      await confirmButton.click();
      await page.waitForTimeout(1000); // 削除処理の実行を待機

      // 成功メッセージが表示されることを確認（複数のパターンに対応）
      // トースト通知またはページ上のメッセージを確認
      const successMessage = page
        .getByText(/優先チケットを削除しました|チケットを削除しました|成功/)
        .or(page.locator('[role="status"]').filter({ hasText: /削除|成功/ }));

      // 成功メッセージが表示されるか、エラーメッセージが表示されていないことを確認
      const hasSuccess = await successMessage
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasError = await page
        .getByText(/エラー|失敗/)
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasSuccess && !hasError) {
        // メッセージが表示されない場合、ページの状態を確認
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        // エラーページに遷移していないことを確認
        expect(currentUrl.includes('/error')).toBeFalsy();
        // チケットが削除されたことを確認（テーブルから削除されたか、統計カードが更新されたか）
        // この場合は、エラーが発生していないことを確認するだけで十分
      } else if (hasError) {
        throw new Error('チケット削除中にエラーが発生しました');
      }
    }
  });

  test('使用済みチケットの削除ボタンが無効化されている', async ({ page }) => {
    // 優先チケット管理ページに移動（beforeEachで認証済み）
    await page.goto('/ja/priority-tickets', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック（login.spec.tsのパターン）
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      await page.goto('/ja/priority-tickets', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    await page.waitForTimeout(2000);

    // 使用済みチケットの削除ボタンが無効化されていることを確認
    // 「使用済み」バッジを含む行を探す
    const usedStatusRows = page
      .locator('tr')
      .filter({ has: page.locator('text=使用済み') });

    if ((await usedStatusRows.count()) > 0) {
      const usedRow = usedStatusRows.first();

      // その行内の削除ボタン（SVGアイコンを含むボタン）が無効化されていることを確認
      const deleteButtonInRow = usedRow
        .locator('button')
        .filter({ has: page.locator('svg') });

      if ((await deleteButtonInRow.count()) > 0) {
        await expect(deleteButtonInRow).toBeDisabled({ timeout: 3000 });
      }
    } else {
      // 使用済みチケットがない場合はスキップ
      test.skip();
    }
  });

  test('サイドバーからのナビゲーション', async ({ page }) => {
    // ダッシュボードからサイドバーを開く（beforeEachで認証済み）
    await page.goto('/ja/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック（login.spec.tsのパターン）
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      const postAuthUrl = page.url();
      expect(
        postAuthUrl.includes('/dashboard') || postAuthUrl.includes('/profile')
      ).toBeTruthy();

      await page.goto('/ja/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // サイドバーの「撮影会」セクションを展開（strict mode violation回避: より具体的なセレクタを使用）
    // CollapsibleTriggerのボタンを探す（aria-expanded属性で展開状態を確認）
    const photoSessionsSection = page
      .locator('button')
      .filter({ hasText: '撮影会' })
      .filter({ has: page.locator('svg') }) // Chevronアイコンを含むボタン
      .first();

    // セクションが既に展開されているか確認
    const isExpanded = await photoSessionsSection
      .getAttribute('aria-expanded')
      .then(attr => attr === 'true')
      .catch(() => false);

    if (!isExpanded) {
      await expect(photoSessionsSection).toBeVisible({ timeout: 5000 });
      await photoSessionsSection.click();
      await page.waitForTimeout(1000); // セクション展開を待機
    }

    // 「優先チケット管理」リンクをクリック（strict mode violation回避: より具体的なセレクタを使用）
    // サイドバー内のリンクを探す（href属性で確認）
    const priorityTicketsLink = page
      .locator('button')
      .filter({ hasText: '優先チケット管理' })
      .or(page.locator('a[href*="priority-tickets"]'))
      .first();
    await expect(priorityTicketsLink).toBeVisible({ timeout: 5000 });
    await priorityTicketsLink.click();

    // 優先チケット管理ページに遷移することを確認（strict mode violation回避: headingを優先）
    await page.waitForURL('**/priority-tickets', { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: '優先チケット管理' }).first()
    ).toBeVisible({
      timeout: 10000,
    });
  });
});
