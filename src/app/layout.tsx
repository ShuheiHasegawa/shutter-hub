import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
});

export const metadata: Metadata = {
  title: 'ShutterHub v2 - 撮影業界をつなぐプラットフォーム',
  description:
    'モデル、カメラマン、撮影会運営者をつなぐ統合型プラットフォーム。撮影会の予約から即座撮影リクエストまで、撮影業界のすべてがここに。',
  keywords: ['撮影会', 'カメラマン', 'モデル', '写真', 'ポートレート', '撮影'],
  authors: [{ name: 'ShutterHub Team' }],
  creator: 'ShutterHub',
  publisher: 'ShutterHub',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://shutterhub.app'),
  openGraph: {
    title: 'ShutterHub v2 - 撮影業界をつなぐプラットフォーム',
    description:
      'モデル、カメラマン、撮影会運営者をつなぐ統合型プラットフォーム',
    url: 'https://shutterhub.app',
    siteName: 'ShutterHub',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShutterHub v2 - 撮影業界をつなぐプラットフォーム',
    description:
      'モデル、カメラマン、撮影会運営者をつなぐ統合型プラットフォーム',
    creator: '@shutterhub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
