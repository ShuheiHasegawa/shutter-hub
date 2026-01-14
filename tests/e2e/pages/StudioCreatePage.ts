import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * スタジオ作成ページ Page Object（最小限の実装）
 * スタジオ一覧からの遷移確認用
 */
export class StudioCreatePage extends BasePage {
  constructor(page: Page, isMobile: boolean = false) {
    super(page, isMobile);
  }

  /**
   * スタジオ作成ページに遷移したことを確認
   */
  async assertCreatePageLoaded(): Promise<void> {
    // URLがスタジオ作成ページのパターンに一致することを確認
    await expect(this.page).toHaveURL(/\/studios\/create/);
  }
}
