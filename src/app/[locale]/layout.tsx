import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import '../globals.css';
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
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/images/favicon/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/images/favicon/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/images/favicon/favicon-16x16.png',
      },
    ],
  },
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as 'ja' | 'en')) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
