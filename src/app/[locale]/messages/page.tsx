import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MessagesLayout } from '@/components/social/MessagesLayout';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social.messaging');

  return {
    title: t('title'),
    description: t('searchPlaceholder'),
  };
}

export default function MessagesPage() {
  return (
    <DashboardLayout>
      <MessagesLayout />
    </DashboardLayout>
  );
}
