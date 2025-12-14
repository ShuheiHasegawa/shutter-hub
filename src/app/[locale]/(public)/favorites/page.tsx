import { Metadata } from 'next';
import { Suspense } from 'react';
import { FavoritesContent } from '@/components/favorites/FavoritesContent';
import { FavoritesLoading } from '@/components/favorites/FavoritesLoading';
import { getTranslations } from 'next-intl/server';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('favorites');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params.tab === 'studio' ? 'studio' : 'photo_session';

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<FavoritesLoading />}>
          <FavoritesContent initialTab={initialTab} />
        </Suspense>
      </div>
    </AuthenticatedLayout>
  );
}
