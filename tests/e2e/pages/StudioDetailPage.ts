import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * スタジオ詳細ページ Page Object（最小限の実装）
 * スタジオ一覧からの遷移確認用
 */
export class StudioDetailPage extends BasePage {
  constructor(page: Page, isMobile: boolean = false) {
    super(page, isMobile);
  }

  /**
   * スタジオ詳細ページに遷移したことを確認
   */
  async assertDetailPageLoaded(): Promise<void> {
    // URLがスタジオ詳細ページのパターンに一致することを確認
    await expect(this.page).toHaveURL(/\/studios\/[^/]+/);
  }
}
