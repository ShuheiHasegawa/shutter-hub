'use client';

import { toggleFavoriteAction } from '@/app/actions/favorites';
import { Button } from '@/components/ui/button';

export function FavoriteTestButton() {
  const handleTest = async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('🧪 テストボタンクリック');
      const result = await toggleFavoriteAction('studio', 'test-id');
      // eslint-disable-next-line no-console
      console.log('🧪 テスト結果:', result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('🧪 テストエラー:', error);
    }
  };

  return (
    <Button onClick={handleTest} variant="outline">
      🧪 お気に入りテスト
    </Button>
  );
}
