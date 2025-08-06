/**
 * プライバシーポリシーページ
 * GDPR対応・データ処理詳細・ユーザー権利説明
 */

import { getLegalDocument } from '@/app/actions/legal-documents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Eye,
  Download,
  Trash2,
  Edit,
  CheckCircle2,
  Calendar,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PrivacyPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const resolvedParams = await params;
  const result = await getLegalDocument(
    'privacy_policy',
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
          <Shield className="w-6 h-6 text-primary" />
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
            <Globe className="w-4 h-4" />
            <Badge variant="secondary">GDPR準拠</Badge>
          </div>
        </div>
      </div>

      {/* GDPR権利の要約 */}
      <Card className="mb-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Shield className="w-5 h-5" />
            あなたのデータ保護権利
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            EU一般データ保護規則（GDPR）に基づき、以下の権利を保障しています：
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                  アクセス権
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  保存されているあなたのデータを確認する権利
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Edit className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                  訂正権
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  不正確なデータの訂正を求める権利
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                  削除権
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  個人データの削除を求める権利
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                  データポータビリティ権
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  データの提供や移転を求める権利
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link href="/legal/gdpr">権利を行使する</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/legal/consent">同意設定</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/privacy">プライバシー設定</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* データ処理の法的根拠 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            データ処理の法的根拠
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
              <div>
                <h4 className="font-semibold">契約の履行（GDPR第6条1項b）</h4>
                <p className="text-sm text-muted-foreground">
                  サービス提供・アカウント管理・撮影会予約管理
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
              <div>
                <h4 className="font-semibold">正当な利益（GDPR第6条1項f）</h4>
                <p className="text-sm text-muted-foreground">
                  サービス改善・セキュリティ対策・不正利用防止
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
              <div>
                <h4 className="font-semibold">同意（GDPR第6条1項a）</h4>
                <p className="text-sm text-muted-foreground">
                  マーケティング・分析・個人化されたコンテンツ
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* プライバシーポリシー本文 */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: document.content.replace(/\n/g, '<br />'),
            }}
          />
        </CardContent>
      </Card>

      {/* データ保護責任者情報 */}
      <Card className="mb-8 border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/20">
        <CardHeader>
          <CardTitle className="text-lg">
            データ保護に関するお問い合わせ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">データ管理者</h4>
              <p className="text-sm text-muted-foreground">
                ShutterHub 運営チーム
                <br />
                Email: privacy@shutterhub.example.com
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">監督機関</h4>
              <p className="text-sm text-muted-foreground">
                個人情報保護委員会
                <br />
                〒100-0013 東京都千代田区霞が関3-2-2
                <br />
                https://www.ppc.go.jp/
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                データ保護に関するご不明な点や苦情がございましたら、
                まずは上記連絡先までお問い合わせください。
                問題が解決しない場合は、監督機関に直接申し立てることも可能です。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="mt-8 pt-8 border-t">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <p>
              このプライバシーポリシーについてご質問がある場合は、
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
              <Link href="/legal/terms">利用規約</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// メタデータ
export async function generateMetadata({ params }: PrivacyPageProps) {
  const resolvedParams = await params;
  const result = await getLegalDocument(
    'privacy_policy',
    resolvedParams.locale
  );

  return {
    title: result.data?.title || 'ShutterHub プライバシーポリシー',
    description:
      'ShutterHubのプライバシーポリシーとGDPR準拠のデータ保護方針について説明します。',
    robots: 'index, follow',
    alternates: {
      languages: {
        ja: '/ja/legal/privacy',
        en: '/en/legal/privacy',
      },
    },
  };
}
