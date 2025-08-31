'use client';

import { PhotoSessionFavoritesContent } from '@/components/favorites/PhotoSessionFavoritesContent';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { HeartIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function PhotoSessionFavoritesPage() {
  const _t = useTranslations('favorites');

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto">
        <PageTitleHeader
          title="お気に入り撮影会"
          description="お気に入りに登録した撮影会を一覧で確認できます"
          icon={<HeartIcon className="h-6 w-6" />}
        />

        <PhotoSessionFavoritesContent />
      </div>
    </AuthenticatedLayout>
  );
}
