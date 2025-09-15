import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';

export default function PhotobooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
