import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * スタジオ一覧ページ Page Object
 * スタジオの検索、フィルタリング、一覧表示機能を提供
 */
export class StudioListPage extends BasePage {
  // ============================================================================
  // 静的要素（常に存在する要素）
  // ============================================================================

  /**
   * ページタイトル「スタジオ一覧」
   */
  readonly pageTitle: Locator;

  /**
   * キーワード検索入力欄
   * PC版とSP版で異なる要素にマッチするため、getterメソッドで適切なセレクタを返す
   */
  get searchInput(): Locator {
    if (this.isMobile) {
      // SP版: モバイルフィルターシート（Sheet）内の検索入力欄
      // シートが開いている場合は[role="dialog"]内、開いていない場合は通常のセレクタ
      return this.page
        .locator('[role="dialog"] [data-testid="studio-search-input"]')
        .first();
    } else {
      // PC版: StickyHeader内の検索入力欄（常に表示）
      return this.page
        .locator('main [data-testid="studio-search-input"]')
        .first();
    }
  }

  /**
   * 検索ボタン（mainコンテンツ内）
   */
  readonly searchButton: Locator;

  /**
   * リセットボタン（mainコンテンツ内）
   */
  readonly resetButton: Locator;

  /**
   * 新規スタジオ作成ボタン（mainコンテンツ内）
   */
  readonly createStudioButton: Locator;

  /**
   * 都道府県フィルター（combobox）
   * PC版とSP版で異なる要素にマッチするため、getterメソッドで適切なセレクタを返す
   */
  get prefectureSelect(): Locator {
    if (this.isMobile) {
      // SP版: モバイルフィルターシート（Sheet）内の都道府県セレクト
      return this.page
        .locator('[role="dialog"] [data-testid="studio-prefecture-select"]')
        .first();
    } else {
      // PC版: StickyHeader内の都道府県セレクト（常に表示）
      return this.page
        .locator('main [data-testid="studio-prefecture-select"]')
        .first();
    }
  }

  /**
   * ソート選択ボタン
   * PC版とSP版で異なる要素にマッチするため、getterメソッドで適切なセレクタを返す
   */
  get sortSelect(): Locator {
    if (this.isMobile) {
      // SP版: モバイルフィルターシート（Sheet）内のソートセレクト
      return this.page
        .locator('[role="dialog"] [data-testid="studio-sort-select"]')
        .first();
    } else {
      // PC版: StickyHeader内のソートセレクト（常に表示）
      return this.page
        .locator('main [data-testid="studio-sort-select"]')
        .first();
    }
  }

  /**
   * もっと見るボタン
   */
  readonly loadMoreButton: Locator;

  /**
   * モバイルフィルターボタン（SP版専用）
   */
  readonly mobileFilterButton: Locator;

  /**
   * モバイルフィルター適用ボタン（SP版専用）
   */
  readonly mobileFilterApply: Locator;

  /**
   * モバイルフィルターリセットボタン（SP版専用）
   */
  readonly mobileFilterReset: Locator;

  /**
   * 空状態メッセージ
   */
  readonly emptyMessage: Locator;

  /**
   * 検索条件設定メッセージ（初期状態）
   */
  readonly initialMessage: Locator;

  constructor(page: Page, isMobile: boolean = false) {
    super(page, isMobile);

    // 静的要素の初期化
    this.pageTitle = this.page.getByRole('heading', { name: 'スタジオ一覧' });
    // searchInputはgetterメソッドで定義されているため、ここでは初期化しない
    this.searchButton = this.page
      .getByTestId('studio-search-button')
      .or(this.page.locator('main').locator('button:has-text("検索")').first());
    this.resetButton = this.page
      .getByTestId('studio-reset-button')
      .or(
        this.page.locator('main').locator('button:has-text("リセット")').first()
      );
    // data-testidを持つボタンのみを対象とする（Link内のButtonを正確に特定）
    this.createStudioButton = this.page.getByTestId('studio-create-button');
    // prefectureSelectとsortSelectはgetterメソッドで定義されているため、ここでは初期化しない
    this.loadMoreButton = this.page.getByTestId('studio-load-more');
    this.mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    this.mobileFilterApply = this.page.getByTestId('mobile-filter-apply');
    this.mobileFilterReset = this.page.getByTestId('mobile-filter-reset');
    this.emptyMessage = this.page.locator(
      'text=条件に一致するスタジオが見つかりません'
    );
    this.initialMessage = this.page.locator(
      'text=検索条件を設定して「検索」ボタンを押してください'
    );
  }

  // ============================================================================
  // 動的要素（引数に基づいて変化する要素）
  // ============================================================================

  /**
   * スタジオカード（インデックス指定）
   */
  studioCard = (index: number = 0): Locator => {
    // data-testid優先でセレクタを設定
    return this.page
      .locator('[data-testid^="studio-card-"]')
      .nth(index)
      .or(this.page.locator('[class*="card"]').nth(index));
  };

  /**
   * 全てのスタジオカード
   */
  allStudioCards = (): Locator => {
    // data-testid優先でセレクタを設定
    return this.page
      .locator('[data-testid^="studio-card-"]')
      .or(this.page.locator('[class*="card"]'));
  };

  /**
   * 都道府県選択肢（ドロップダウン内）
   */
  prefectureOption = (prefecture: string): Locator => {
    return this.page
      .locator(`[role="option"]:has-text("${prefecture}")`)
      .first();
  };

  /**
   * ソート選択肢（ドロップダウン内）
   */
  sortOption = (sortName: string): Locator => {
    return this.page.locator(`text=${sortName}`);
  };

  /**
   * スケルトンローディング要素
   */
  loadingSkeleton = (): Locator => {
    return this.page
      .locator(
        '[class*="skeleton"], [class*="Skeleton"], [data-testid*="skeleton"]'
      )
      .first();
  };

  // ============================================================================
  // ナビゲーションメソッド
  // ============================================================================

  /**
   * スタジオ一覧ページを開く
   */
  async open(): Promise<void> {
    await this.page.goto('/ja/studios', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // ページの読み込み完了を待機
    await this.waitForPageLoad();

    // ネットワーク処理完了を待機
    await this.waitForNetworkIdle();

    // ページタイトルが表示されるまで待機（PC/SP共通）
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });

    // PC版: 検索フォームが直接表示される
    // SP版: モバイルフィルターボタンが表示される
    if (!this.isMobile) {
      // PC版: 検索フォームが表示されるまで待機
      await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    } else {
      // SP版: モバイルフィルターボタンが表示されるまで待機
      // data-testid優先でセレクタを設定
      await expect(this.mobileFilterButton).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * スタジオ詳細ページに遷移
   * @param cardIndex カードのインデックス（デフォルト: 0）
   */
  async goToStudioDetail(cardIndex: number = 0): Promise<void> {
    const card = this.studioCard(cardIndex);
    const cardLink = card.locator('a').first();
    const hasLink = await cardLink.isVisible().catch(() => false);

    if (hasLink) {
      await cardLink.click();
    } else {
      await card.click();
    }

    await this.page.waitForURL(/\/studios\/[^/]+/, { timeout: 10000 });
  }

  /**
   * スタジオ作成ページに遷移
   */
  async goToCreateStudio(): Promise<void> {
    // Link内のButtonをクリックするため、表示を確認してからクリック
    await expect(this.createStudioButton).toBeVisible({ timeout: 15000 });
    await this.createStudioButton.click();
    await this.page.waitForURL(/\/studios\/create/, { timeout: 10000 });
  }

  // ============================================================================
  // アクションメソッド
  // ============================================================================

  /**
   * モバイルフィルターシートを開く（SP版専用）
   */
  private async openMobileFilterSheet(): Promise<void> {
    if (!this.isMobile) return;

    // シートが開いているかどうかを[role="dialog"]の存在で確認
    const dialogExists = await this.page
      .locator('[role="dialog"]')
      .isVisible()
      .catch(() => false);

    if (!dialogExists) {
      await this.mobileFilterButton.click();
      await this.page.waitForTimeout(500);
      // シートが開くまで待機（[role="dialog"]が表示されるまで）
      await expect(
        this.page.locator('[role="dialog"] [data-testid="studio-search-input"]')
      ).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * モバイルフィルターシートを閉じる（SP版専用）
   */
  private async closeMobileFilterSheet(): Promise<void> {
    if (!this.isMobile) return;

    // シートが開いているかどうかを[role="dialog"]の存在で確認
    const dialogExists = await this.page
      .locator('[role="dialog"]')
      .isVisible()
      .catch(() => false);

    if (dialogExists) {
      // data-testid優先でセレクタを設定
      await this.mobileFilterApply.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * キーワード検索を実行
   * @param keyword 検索キーワード
   */
  async searchByKeyword(keyword: string): Promise<void> {
    // SP版: モバイルフィルターシートを開く
    await this.openMobileFilterSheet();

    await this.searchInput.fill(keyword);
    await this.page.waitForTimeout(500);

    // SP版: 適用ボタンをクリックしてシートを閉じる + 検索実行
    // PC版: 検索ボタンをクリック
    if (this.isMobile) {
      // data-testid優先でセレクタを設定
      await this.mobileFilterApply.click();
    } else {
      await this.searchButton.click();
    }

    await this.page.waitForTimeout(2000);
  }

  /**
   * 検索ボタンをクリック（フィルター条件で検索）
   */
  async executeSearch(waitTime: number = 2000): Promise<void> {
    // SP版: モバイルフィルターシートを開いて適用ボタンをクリック
    if (this.isMobile) {
      await this.openMobileFilterSheet();
      // data-testid優先でセレクタを設定
      await this.mobileFilterApply.click();
    } else {
      await this.searchButton.click();
    }
    await this.page.waitForTimeout(waitTime);
  }

  /**
   * 都道府県を選択して検索
   * @param prefecture 都道府県名（例: "東京都"）
   */
  async selectPrefecture(prefecture: string): Promise<void> {
    // SP版: モバイルフィルターシートを開く
    await this.openMobileFilterSheet();

    await expect(this.prefectureSelect).toBeVisible({ timeout: 10000 });
    await this.prefectureSelect.click();
    await this.page.waitForTimeout(1000);

    await this.prefectureOption(prefecture).click({ force: true });
    await this.page.waitForTimeout(500);
  }

  /**
   * ソートオプションを変更
   * @param sortName ソート名（例: "名前順（A-Z）"）
   */
  async selectSort(sortName: string): Promise<void> {
    // SP版: モバイルフィルターシートを開く
    await this.openMobileFilterSheet();

    await this.sortSelect.click();
    await this.page.waitForTimeout(500);

    await this.sortOption(sortName).click();
  }

  /**
   * 「もっと見る」ボタンをクリック
   */
  async clickLoadMore(): Promise<void> {
    const isVisible = await this.loadMoreButton.isVisible().catch(() => false);

    if (isVisible) {
      await this.loadMoreButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * フィルターをリセット
   */
  async resetFilters(): Promise<void> {
    if (this.isMobile) {
      // SP版: モバイルフィルターシートを開く
      await this.openMobileFilterSheet();
      // SP版: モバイルフィルターシート内のリセットボタンを使用
      await expect(this.mobileFilterReset).toBeVisible({ timeout: 10000 });
      await this.mobileFilterReset.click();
      await this.page.waitForTimeout(1000);
      // リセットボタンはシートを閉じないため、シートは開いたままにする
    } else {
      // PC版: 通常のリセットボタンを使用
      await expect(this.resetButton).toBeVisible({ timeout: 10000 });
      await this.resetButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // ============================================================================
  // アサーションメソッド
  // ============================================================================

  /**
   * ページ初期表示要素が全て表示されることを確認
   */
  async assertInitialPageLoaded(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });

    // createStudioButtonの表示確認（タイムアウトを延長）
    await expect(this.createStudioButton).toBeVisible({ timeout: 15000 });

    // PC版: 検索フォームが直接表示される（キーワード、都道府県、ソート、検索・リセットボタンがすべて表示）
    // SP版: モバイルフィルターボタンが表示される（検索フォームは非表示）
    if (!this.isMobile) {
      await expect(this.searchInput).toBeVisible({ timeout: 10000 });
      await expect(this.prefectureSelect).toBeVisible({ timeout: 10000 });
      await expect(this.sortSelect).toBeVisible({ timeout: 10000 });
      await expect(this.searchButton).toBeVisible({ timeout: 10000 });
      await expect(this.resetButton).toBeVisible({ timeout: 10000 });
    } else {
      // SP版: モバイルフィルターボタンの表示を確認
      // data-testid優先でセレクタを設定
      await expect(this.mobileFilterButton).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * 検索結果が表示されることを確認（カードまたは空状態メッセージ）
   */
  async assertSearchResultsVisible(): Promise<void> {
    const hasResults = await this.studioCard()
      .isVisible()
      .catch(() => false);
    const hasEmptyMessage = await this.emptyMessage
      .isVisible()
      .catch(() => false);
    const hasInitialMessage = await this.initialMessage
      .isVisible()
      .catch(() => false);

    expect(hasResults || hasEmptyMessage || hasInitialMessage).toBe(true);
  }

  /**
   * グリッド内の検索結果が表示されることを確認
   */
  async assertGridResultsVisible(): Promise<void> {
    const hasResults = await this.page
      .locator('[class*="grid"]:has([class*="card"])')
      .isVisible()
      .catch(() => false);
    const hasEmptyMessage = await this.emptyMessage
      .isVisible()
      .catch(() => false);

    expect(hasResults || hasEmptyMessage).toBe(true);
  }

  /**
   * 空状態メッセージが表示されることを確認
   */
  async assertEmptyState(): Promise<void> {
    await expect(this.emptyMessage).toBeVisible({ timeout: 5000 });
  }

  /**
   * スタジオカードが表示されることを確認
   */
  async assertStudioCardsVisible(): Promise<void> {
    await expect(this.studioCard()).toBeVisible({ timeout: 5000 });
  }

  /**
   * スタジオカード内の情報を確認
   * @param cardIndex カードのインデックス（デフォルト: 0）
   */
  async assertStudioCardContent(cardIndex: number = 0): Promise<void> {
    const card = this.studioCard(cardIndex);
    await expect(card).toBeVisible();

    const cardText = await card.textContent();
    expect(cardText).toBeTruthy();
    expect(cardText!.length).toBeGreaterThan(0);
  }

  /**
   * フィルターがリセットされたことを確認
   */
  async assertFiltersReset(): Promise<void> {
    if (this.isMobile) {
      // SP版: モバイルフィルターシートが開いていない場合は開く
      const dialogExists = await this.page
        .locator('[role="dialog"]')
        .isVisible()
        .catch(() => false);
      if (!dialogExists) {
        await this.openMobileFilterSheet();
      }
    }

    // キーワード入力がクリアされている
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    const inputValue = await this.searchInput.inputValue();
    expect(inputValue).toBe('');

    // 都道府県フィルターが「すべて」に戻っている
    await expect(this.prefectureSelect).toBeVisible({ timeout: 10000 });
    const prefectureText = await this.prefectureSelect.textContent();
    expect(prefectureText).toMatch(/すべて/);

    if (this.isMobile) {
      // SP版: シートを閉じる（検証後）
      await this.closeMobileFilterSheet();
    }
  }

  /**
   * モバイル表示で横スクロールが発生しないことを確認
   */
  async assertNoHorizontalScroll(): Promise<void> {
    const hasHorizontalScroll = await this.page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  }

  /**
   * デスクトップ表示で3カラムレイアウトが適用されることを確認
   */
  async assertThreeColumnLayout(): Promise<void> {
    const cardGridContainer = this.page
      .locator('[class*="grid"]')
      .filter({ has: this.page.locator('[class*="card"]') })
      .first();
    const gridExists = await cardGridContainer.isVisible().catch(() => false);

    if (gridExists) {
      const gridClass = await cardGridContainer.getAttribute('class');
      expect(gridClass).toContain('grid');
      expect(gridClass).toContain('lg:grid-cols-3');
    }
  }

  /**
   * ローディング状態またはスケルトン表示を確認
   */
  async assertLoadingOrResults(): Promise<void> {
    const hasSkeleton = await this.loadingSkeleton()
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const hasResults = await this.studioCard()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasEmptyMessage = await this.emptyMessage
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasSkeleton || hasResults || hasEmptyMessage).toBe(true);
  }

  // ============================================================================
  // ヘルパーメソッド
  // ============================================================================

  /**
   * 検索結果の状態を取得
   */
  async getSearchResultsState(): Promise<{
    hasResults: boolean;
    hasEmptyMessage: boolean;
    hasInitialMessage: boolean;
  }> {
    const hasResults = await this.studioCard()
      .isVisible()
      .catch(() => false);
    const hasEmptyMessage = await this.emptyMessage
      .isVisible()
      .catch(() => false);
    const hasInitialMessage = await this.initialMessage
      .isVisible()
      .catch(() => false);

    return { hasResults, hasEmptyMessage, hasInitialMessage };
  }

  /**
   * スタジオカードが存在するか確認
   */
  async hasStudioCards(): Promise<boolean> {
    return await this.studioCard()
      .isVisible()
      .catch(() => false);
  }

  /**
   * 「もっと見る」ボタンが表示されているか確認
   */
  async hasLoadMoreButton(): Promise<boolean> {
    return await this.loadMoreButton.isVisible().catch(() => false);
  }
}
