import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'フォトブック | ShutterHub',
  description:
    '美しいフォトブックビューアーで写真を閲覧・編集できます。見開きモードとページモードで快適な写真閲覧体験を提供します。',
  keywords: [
    'フォトブック',
    '写真',
    'ビューアー',
    '写真集',
    'ポートフォリオ',
    'ShutterHub',
  ],
  openGraph: {
    title: 'フォトブック | ShutterHub',
    description: '美しいフォトブックビューアーで写真を閲覧・編集できます',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'フォトブック | ShutterHub',
    description: '美しいフォトブックビューアーで写真を閲覧・編集できます',
  },
};

export default function PhotobookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
