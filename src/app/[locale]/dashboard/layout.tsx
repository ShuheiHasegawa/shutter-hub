import type { Metadata } from 'next';
import { buildTitle } from '@/lib/seo';

export const metadata: Metadata = {
  title: buildTitle('ダッシュボード'),
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
