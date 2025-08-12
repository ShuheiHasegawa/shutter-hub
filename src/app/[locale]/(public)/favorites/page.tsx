import { Metadata } from 'next';
import { Suspense } from 'react';
import { FavoritesContent } from '@/components/favorites/FavoritesContent';
import { FavoritesLoading } from '@/components/favorites/FavoritesLoading';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('favorites');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function FavoritesPage() {
  return (
    <div className="min-h-screen bg-theme-background">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<FavoritesLoading />}>
          <FavoritesContent />
        </Suspense>
      </div>
    </div>
  );
}
