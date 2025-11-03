'use client';

import { useTranslations } from 'next-intl';

/**
 * 認証済みレイアウト用シンプルフッターコンポーネント
 * 著作権表示のみを表示する
 */
export function AuthenticatedFooter() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t bg-background mt-auto py-4 px-4">
      <div className="text-center text-sm text-muted-foreground">
        <p>{t('copyright')}</p>
      </div>
    </footer>
  );
}
