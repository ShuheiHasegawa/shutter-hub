/**
 * 利用規約ページ
 * GDPR対応・バージョン管理・多言語対応
 */

import { getLegalDocument } from '@/app/actions/legal-documents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface TermsPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    version?: string;
  }>;
}

export default async function TermsPage({ params }: TermsPageProps) {
  const resolvedParams = await params;
  const result = await getLegalDocument(
    'terms_of_service',
    resolvedParams.locale
  );

  if (!result.success || !result.data) {
    notFound();
  }

  const document = result.data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">{document.title}</h1>
          <Badge variant="outline">v{document.version}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              有効日:{' '}
              {new Date(document.effective_date!).toLocaleDateString(
                resolvedParams.locale
              )}
            </span>
          </div>

          {document.published_at && (
            <div>
              公開日:{' '}
              {new Date(document.published_at).toLocaleDateString(
                resolvedParams.locale
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            <Badge variant="secondary">
              {resolvedParams.locale === 'ja' ? '日本語' : 'English'}
            </Badge>
          </div>
        </div>
      </div>

      {/* 重要なお知らせ */}
      <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                重要なお知らせ
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                この利用規約は、ShutterHub
                v2サービスの利用に関する重要な情報を含んでいます。
                サービスを利用される前に、必ずお読みください。
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/legal/privacy">プライバシーポリシー</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/legal/consent">同意管理</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/legal/gdpr">データ保護権利</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利用規約本文 */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: document.content.replace(/\n/g, '<br />'),
            }}
          />
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="mt-8 pt-8 border-t">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <p>
              この利用規約についてご質問がある場合は、
              <Link href="/contact" className="text-primary hover:underline">
                お問い合わせ
              </Link>
              からご連絡ください。
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/legal">法的文書一覧</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">ホームに戻る</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// メタデータ
export async function generateMetadata({ params }: TermsPageProps) {
  const resolvedParams = await params;
  const result = await getLegalDocument(
    'terms_of_service',
    resolvedParams.locale
  );

  return {
    title: result.data?.title || 'ShutterHub 利用規約',
    description:
      'ShutterHubサービスの利用規約です。サービスをご利用前に必ずお読みください。',
    robots: 'index, follow',
    alternates: {
      languages: {
        ja: '/ja/legal/terms',
        en: '/en/legal/terms',
      },
    },
  };
}
