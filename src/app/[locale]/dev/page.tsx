'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import {
  Palette,
  CreditCard,
  MapPin,
  Calendar,
  Shield,
  LogIn,
  TestTube,
  Code,
  Star,
  PlayCircle,
  Camera,
  Inbox,
} from 'lucide-react';

interface DevTool {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  status: 'stable' | 'beta' | 'experimental';
  category: 'ui' | 'payment' | 'auth' | 'testing' | 'demo';
}

const devTools: DevTool[] = [
  {
    title: 'カラーテーマシステム',
    description: '統合カラーシステムのテーマ切り替えとブランド色の確認',
    path: '/dev/color-theme',
    icon: <Palette className="h-5 w-5" />,
    status: 'stable',
    category: 'ui',
  },
  {
    title: '即座撮影テスト',
    description: '即座撮影リクエストのテストデータ作成とStripe決済テスト',
    path: '/dev/instant-test',
    icon: <Camera className="h-5 w-5" />,
    status: 'stable',
    category: 'testing',
  },
  {
    title: 'Stripe決済テスト',
    description: 'Stripe決済システムの動作確認とWebhookテスト',
    path: '/dev/test-payment',
    icon: <CreditCard className="h-5 w-5" />,
    status: 'stable',
    category: 'payment',
  },
  {
    title: '地図機能テスト',
    description: '位置情報と地図表示機能のテスト',
    path: '/dev/map-test',
    icon: <MapPin className="h-5 w-5" />,
    status: 'beta',
    category: 'testing',
  },
  {
    title: 'スケジュール設計',
    description: 'ユーザースケジュール管理UIの設計確認',
    path: '/dev/schedule-design',
    icon: <Calendar className="h-5 w-5" />,
    status: 'experimental',
    category: 'ui',
  },
  {
    title: 'Sentry監視テスト',
    description: 'エラー監視システムの動作確認',
    path: '/dev/sentry-monitoring-test',
    icon: <Shield className="h-5 w-5" />,
    status: 'stable',
    category: 'testing',
  },
  {
    title: 'Sentryサンプルページ',
    description: 'Sentryエラー追跡のサンプル実装',
    path: '/dev/sentry-example-page',
    icon: <TestTube className="h-5 w-5" />,
    status: 'stable',
    category: 'testing',
  },
  {
    title: 'ログインテスト',
    description: '認証システムの動作確認',
    path: '/dev/test-login',
    icon: <LogIn className="h-5 w-5" />,
    status: 'stable',
    category: 'auth',
  },
  {
    title: 'スロット選択テスト',
    description: '撮影会スロット選択UIのテスト',
    path: '/dev/test-slot-selection',
    icon: <Calendar className="h-5 w-5" />,
    status: 'beta',
    category: 'ui',
  },
  {
    title: 'レビューフォームモック',
    description: '3段階評価UI（良い、普通、悪い）の動作確認とデザイン検証',
    path: '/dev/review-form-mock',
    icon: <Star className="h-5 w-5" />,
    status: 'experimental',
    category: 'ui',
  },
  {
    title: '撮影会テストフロー',
    description:
      '撮影会作成→予約→レビューまでのフローを効率的にテスト（過去日時で自動作成）',
    path: '/dev/photo-session-test-flow',
    icon: <PlayCircle className="h-5 w-5" />,
    status: 'beta',
    category: 'testing',
  },
  {
    title: '空状態表示デモ',
    description:
      '統一的な空状態（Empty State）表示コンポーネントのデザインパターン',
    path: '/dev/empty-state-demo',
    icon: <Inbox className="h-5 w-5" />,
    status: 'experimental',
    category: 'ui',
  },
];

const categoryLabels = {
  ui: 'UI/UX',
  payment: '決済',
  auth: '認証',
  testing: 'テスト',
  demo: 'デモ',
};

const statusColors = {
  stable: 'bg-green-100 text-green-800 border-green-200',
  beta: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  experimental: 'bg-red-100 text-red-800 border-red-200',
};

export default function DevToolsPage() {
  const [today, setToday] = useState('');

  useEffect(() => {
    // クライアント側でのみ日付を設定してハイドレーション不一致を防止する
    try {
      setToday(new Date().toLocaleDateString('ja-JP'));
    } catch {}
  }, []);
  const categories = Object.keys(categoryLabels) as Array<
    keyof typeof categoryLabels
  >;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DevToolsNavigation />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ヘッダーセクション */}
            <section className="py-24 surface-primary">
              <div className="container">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Code className="h-8 w-8" />
                    <h1 className="text-4xl md:text-5xl font-bold">
                      開発ツール
                    </h1>
                  </div>
                  <p className="text-xl opacity-80 max-w-2xl mx-auto">
                    ShutterHub の開発・テスト・デバッグ用ツール集
                  </p>
                  <div className="flex justify-center gap-2 mt-6">
                    <Badge variant="outline" className="bg-background/20">
                      {devTools.length} ツール
                    </Badge>
                  </div>
                </div>
              </div>
            </section>

            {/* 説明セクション */}
            <section className="py-8 bg-blue-50 border-y border-blue-200">
              <div className="container">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-start gap-3">
                    <TestTube className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-800 mb-1">
                        💡 開発ツールについて
                      </h3>
                      <p className="text-sm text-blue-700">
                        ShutterHub
                        の各機能をテスト・確認するためのツール集です。
                        UI確認、決済テスト、認証テストなどが行えます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ツール一覧 */}
            <section className="py-16 bg-background">
              <div className="container">
                <div className="max-w-6xl mx-auto">
                  {categories.map(category => {
                    const categoryTools = devTools.filter(
                      tool => tool.category === category
                    );
                    if (categoryTools.length === 0) return null;

                    return (
                      <div key={category} className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                          <h2 className="text-2xl font-bold">
                            {categoryLabels[category]}
                          </h2>
                          <Badge variant="secondary">
                            {categoryTools.length} ツール
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {categoryTools.map(tool => (
                            <Card
                              key={tool.path}
                              className="hover:shadow-lg transition-shadow"
                            >
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    {tool.icon}
                                    <CardTitle className="text-lg">
                                      {tool.title}
                                    </CardTitle>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={statusColors[tool.status]}
                                  >
                                    {tool.status}
                                  </Badge>
                                </div>
                                <CardDescription className="text-sm">
                                  {tool.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <Link href={tool.path}>
                                  <Button className="w-full" variant="outline">
                                    ツールを開く
                                  </Button>
                                </Link>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* フッター情報 */}
            <section className="py-12 surface-neutral">
              <div className="container">
                <div className="max-w-4xl mx-auto text-center space-y-4">
                  <h3 className="text-xl font-semibold">開発情報</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">技術スタック</h4>
                      <p className="opacity-80">
                        Next.js 14 + TypeScript
                        <br />
                        Supabase + Stripe
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">更新</h4>
                      <p className="opacity-80">
                        最終更新: {today || '—'}
                        <br />
                        バージョン: v2.0
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
