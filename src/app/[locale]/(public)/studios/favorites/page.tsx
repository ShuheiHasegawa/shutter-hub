'use client';

import { StudioFavoritesContent } from '@/components/favorites/StudioFavoritesContent';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { useTranslations } from 'next-intl';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { HeartIcon } from 'lucide-react';

export default function StudioFavoritesPage() {
  const _t = useTranslations('favorites');

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto">
        <PageTitleHeader
          title="お気に入りスタジオ"
          icon={<HeartIcon className="h-6 w-6" />}
        />
        <StudioFavoritesContent />
      </div>
    </AuthenticatedLayout>
  );
}
