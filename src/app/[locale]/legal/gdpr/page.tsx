/**
 * GDPR権利行使ページ
 * データアクセス・削除・エクスポート・訂正要求
 */

import { getUserGdprRequests } from '@/app/actions/legal-documents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Eye,
  Download,
  Trash2,
  Edit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { GdprRequestForm } from '@/components/legal/gdpr-request-form';
import { DataExportButton } from '@/components/legal/data-export-button';

interface GdprPageProps {
  params: Promise<{
    locale: string;
  }>;
}

const gdprRightIcons = {
  access: Eye,
  rectification: Edit,
  erasure: Trash2,
  portability: Download,
  restriction: AlertCircle,
  objection: Shield,
};

const gdprRightColors = {
  access: 'text-blue-600',
  rectification: 'text-green-600',
  erasure: 'text-red-600',
  portability: 'text-purple-600',
  restriction: 'text-orange-600',
  objection: 'text-gray-600',
};

const statusColors = {
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  processing:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const statusLabels = {
  submitted: '提出済み',
  verified: '本人確認済み',
  processing: '処理中',
  completed: '完了',
  rejected: '拒否',
  cancelled: '取り消し',
};

const rightLabels = {
  access: 'データアクセス要求',
  rectification: 'データ訂正要求',
  erasure: 'データ削除要求',
  portability: 'データポータビリティ要求',
  restriction: '処理制限要求',
  objection: '処理への異議',
};

export default async function GdprPage({ params }: GdprPageProps) {
  const resolvedParams = await params;
  const requestsResult = await getUserGdprRequests();
  const requests = requestsResult.success ? requestsResult.data : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">データ保護権利</h1>
          <Badge variant="outline">GDPR準拠</Badge>
        </div>

        <p className="text-muted-foreground max-w-3xl">
          EU一般データ保護規則（GDPR）に基づき、あなたの個人データに関する以下の権利を行使できます。
          権利行使は無料で、通常30日以内に対応いたします。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左カラム: 権利の説明と新規要求 */}
        <div className="lg:col-span-2 space-y-6">
          {/* GDPR権利の説明 */}
          <Card>
            <CardHeader>
              <CardTitle>行使可能な権利</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Eye className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold">アクセス権（第15条）</h4>
                    <p className="text-sm text-muted-foreground">
                      当社が保有するあなたの個人データの内容と処理状況を確認する権利
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Edit className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold">訂正権（第16条）</h4>
                    <p className="text-sm text-muted-foreground">
                      不正確または不完全な個人データの訂正・補完を求める権利
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Trash2 className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold">削除権（第17条）</h4>
                    <p className="text-sm text-muted-foreground">
                      特定の条件下で個人データの削除を求める権利（忘れられる権利）
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Download className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold">
                      データポータビリティ権（第20条）
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      構造化されたデータ形式で個人データの提供を求める権利
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 即座データエクスポート */}
          <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <Download className="w-5 h-5" />
                即座データエクスポート
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                基本的な個人データは即座にダウンロードできます。
                より詳細なデータが必要な場合は、正式なデータポータビリティ要求を提出してください。
              </p>

              <div className="flex gap-2">
                <DataExportButton />
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  詳細データ要求
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 新規要求フォーム */}
          <Card>
            <CardHeader>
              <CardTitle>新しい権利行使要求</CardTitle>
            </CardHeader>
            <CardContent>
              <GdprRequestForm />
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: 要求履歴 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                要求履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    まだ権利行使要求はありません
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests?.map(request => {
                    const Icon =
                      gdprRightIcons[
                        request.request_type as keyof typeof gdprRightIcons
                      ];
                    const iconColor =
                      gdprRightColors[
                        request.request_type as keyof typeof gdprRightColors
                      ];

                    return (
                      <div key={request.id} className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Icon
                            className={`w-5 h-5 ${iconColor} mt-0.5 shrink-0`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm">
                                {
                                  rightLabels[
                                    request.request_type as keyof typeof rightLabels
                                  ]
                                }
                              </h4>
                              <Badge
                                variant="secondary"
                                className={
                                  statusColors[
                                    request.status as keyof typeof statusColors
                                  ]
                                }
                              >
                                {
                                  statusLabels[
                                    request.status as keyof typeof statusLabels
                                  ]
                                }
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground mb-2">
                              提出日:{' '}
                              {new Date(request.created_at).toLocaleDateString(
                                resolvedParams.locale
                              )}
                            </p>

                            {request.request_details && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {request.request_details}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                回答期限:{' '}
                                {new Date(
                                  request.response_due_date
                                ).toLocaleDateString(resolvedParams.locale)}
                              </span>

                              {request.export_file_url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={request.export_file_url}>
                                    <Download className="w-3 h-3 mr-1" />
                                    ダウンロード
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 重要な注意事項 */}
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-5 h-5" />
                重要な注意事項
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
                <li>
                  • 本人確認のため、追加情報の提供をお願いする場合があります
                </li>
                <li>• 法的に対応が困難な場合は、理由とともにお知らせします</li>
                <li>
                  • 緊急を要する場合は、お問い合わせフォームもご利用ください
                </li>
                <li>• データ削除要求は慎重にご検討ください（復元不可能）</li>
              </ul>
            </CardContent>
          </Card>

          {/* 関連リンク */}
          <Card>
            <CardHeader>
              <CardTitle>関連情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/legal/privacy">
                    <Shield className="w-4 h-4 mr-2" />
                    プライバシーポリシー
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/legal/consent">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    同意管理
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/settings/privacy">
                    <Edit className="w-4 h-4 mr-2" />
                    プライバシー設定
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/contact">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    お問い合わせ
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// メタデータ
export async function generateMetadata({ params }: GdprPageProps) {
  const _resolvedParams = await params;
  return {
    title: 'データ保護権利 | ShutterHub',
    description:
      'GDPR準拠のデータ保護権利を行使できます。アクセス権、削除権、データポータビリティ権など。',
    robots: 'noindex, nofollow', // 個人的な権利行使ページのため
  };
}
