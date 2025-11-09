'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function PhotoSessionFavoritesPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    // 統合お気に入りページにリダイレクト（撮影会タブで初期表示）
    router.replace(`/${locale}/favorites?tab=photo_session`);
  }, [router, locale]);

  return null;
}
