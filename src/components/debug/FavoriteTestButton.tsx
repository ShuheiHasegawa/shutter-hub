'use client';

import { toggleFavoriteAction } from '@/app/actions/favorites';
import { Button } from '@/components/ui/button';

export function FavoriteTestButton() {
  const handleTest = async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('🧪 テストボタンクリック - データベース関数修正版');

      // 実際のスタジオIDを使ってテスト（存在するIDを使用）
      const result = await toggleFavoriteAction(
        'studio',
        '4957fe97-7a0f-4a38-8746-c251f340d7a6'
      );

      // eslint-disable-next-line no-console
      console.log('🧪 テスト結果:', result);

      if (result.success && result.data) {
        // eslint-disable-next-line no-console
        console.log('✅ 成功！お気に入り状態:', {
          action: result.data.action,
          isFavorited: result.data.is_favorited,
          totalFavorites: result.data.total_favorites,
          message: result.data.message,
        });
      } else {
        // eslint-disable-next-line no-console
        console.error('❌ 失敗:', result.error);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('🧪 テストエラー:', error);
    }
  };

  return (
    <Button
      onClick={handleTest}
      variant="outline"
      className="bg-green-100 hover:bg-green-200"
    >
      🧪 お気に入りテスト（修正版）
    </Button>
  );
}
