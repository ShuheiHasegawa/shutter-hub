import { test } from '@playwright/test';

// データベース修正のためのヘルパーテスト
test.describe('データベース修正検証', () => {
  test('created_byがnullのスタジオを確認', async ({ page }) => {
    // APIまたはSupabase直接クエリでcreated_byがnullのスタジオを確認
    const response = await page.request.get('/api/studios');
    const studios = await response.json();

    const nullCreatedByStudios = studios.filter((studio: unknown) => {
      const studioData = studio as { created_by: string | null };
      return studioData.created_by === null;
    });

    // eslint-disable-next-line no-console
    console.log('created_byがnullのスタジオ数:', nullCreatedByStudios.length);
    nullCreatedByStudios.forEach((studio: unknown) => {
      const studioData = studio as { id: string; name: string };
      // eslint-disable-next-line no-console
      console.log(`- ID: ${studioData.id}, Name: ${studioData.name}`);
    });

    // 修正が必要なスタジオが存在することを記録
    if (nullCreatedByStudios.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        '警告: created_byがnullのスタジオが存在します。修正が必要です。'
      );
    }
  });
});
