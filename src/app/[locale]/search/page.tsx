import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';

export default function SearchPage() {
  const t = useTranslations('pages.search');

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <AdvancedSearch />
      </div>
    </MainLayout>
  );
}
