import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { Ticket } from 'lucide-react';
import { PriorityTicketManagement } from '@/components/organizer/PriorityTicketManagement';

interface PriorityTicketsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PriorityTicketsPage({
  params,
}: PriorityTicketsPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-6 px-4">
        {/* ヘッダー */}
        <PageTitleHeader
          title="優先チケット管理"
          description="配布したチケットは、今後のどの撮影会でも使用できます"
          icon={<Ticket className="h-5 w-5" />}
          backButton={{
            href: `/${locale}/dashboard`,
            variant: 'ghost',
          }}
        />

        {/* チケット管理コンポーネント */}
        <div className="mt-6">
          <PriorityTicketManagement />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
