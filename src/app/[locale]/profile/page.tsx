import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function ProfilePage() {
  const t = useTranslations('pages.profile');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('placeholder')}</p>
      </div>
    </DashboardLayout>
  );
}
