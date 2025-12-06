'use client';

import Link from 'next/link';
import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube, ArrowRight, Users, Camera, Calendar } from 'lucide-react';

export default function TestDataSetupPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DevToolsNavigation />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            <section className="py-16 surface-primary">
              <div className="container">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <TestTube className="h-7 w-7" />
                      <h1 className="text-3xl md:text-4xl font-bold">
                        テストデータセットアップ
                      </h1>
                    </div>
                    <p className="text-sm md:text-base opacity-80 max-w-2xl mx-auto">
                      下記のテスト用アカウントと既存の開発ツールを組み合わせて、
                      認証・即座撮影・撮影会フローなどのテストデータを素早く作成できます。
                    </p>
                  </div>

                  <Card className="border-blue-200 bg-background/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Users className="h-4 w-4" />
                        テスト用アカウント一覧
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                              カメラマン
                            </span>
                            <span className="text-xs text-muted-foreground">
                              長谷川秀平
                            </span>
                          </div>
                          <dl className="space-y-1 font-mono text-[11px] break-all">
                            <div>
                              <dt className="inline text-muted-foreground">
                                Email:
                              </dt>{' '}
                              <dd className="inline">ishushushu13@gmail.com</dd>
                            </div>
                            <div>
                              <dt className="inline text-muted-foreground">
                                Password:
                              </dt>{' '}
                              <dd className="inline">
                                test123456
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  （Google連携のため環境によって異なる可能性あり）
                                </span>
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pink-50 text-pink-800 border border-pink-200">
                              モデル
                            </span>
                            <span className="text-xs text-muted-foreground">
                              小日向ゆか
                            </span>
                          </div>
                          <dl className="space-y-1 font-mono text-[11px] break-all">
                            <div>
                              <dt className="inline text-muted-foreground">
                                Email:
                              </dt>{' '}
                              <dd className="inline">
                                yuka.kohinata@testdomain.com
                              </dd>
                            </div>
                            <div>
                              <dt className="inline text-muted-foreground">
                                Password:
                              </dt>{' '}
                              <dd className="inline">test123456</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              運営（大規模）
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Malymoon撮影会
                            </span>
                          </div>
                          <dl className="space-y-1 font-mono text-[11px] break-all">
                            <div>
                              <dt className="inline text-muted-foreground">
                                Email:
                              </dt>{' '}
                              <dd className="inline">
                                malymoon@shutterhub.test
                              </dd>
                            </div>
                            <div>
                              <dt className="inline text-muted-foreground">
                                Password:
                              </dt>{' '}
                              <dd className="inline">Malymoon2025!</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              運営（小規模）
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ことり撮影会
                            </span>
                          </div>
                          <dl className="space-y-1 font-mono text-[11px] break-all">
                            <div>
                              <dt className="inline text-muted-foreground">
                                Email:
                              </dt>{' '}
                              <dd className="inline">
                                kotori.session@testdomain.com
                              </dd>
                            </div>
                            <div>
                              <dt className="inline text-muted-foreground">
                                Password:
                              </dt>{' '}
                              <dd className="inline">test123456</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                          <Camera className="h-4 w-4" />
                          即座撮影リクエスト
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs md:text-sm">
                        <p className="text-muted-foreground">
                          長谷川秀平（カメラマン）を対象に、位置情報付きの即座撮影リクエストを
                          ワンクリックで作成できます。
                        </p>
                        <Link href="/dev/instant-test">
                          <Button size="sm" className="w-full justify-between">
                            ツールを開く
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                          <Calendar className="h-4 w-4" />
                          撮影会テストフロー
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs md:text-sm">
                        <p className="text-muted-foreground">
                          運営アカウントを使って、
                          「撮影会作成→予約→レビュー可能な状態」までの一連のテストデータを
                          自動生成します。
                        </p>
                        <Link href="/dev/photo-session-test-flow">
                          <Button size="sm" className="w-full justify-between">
                            ツールを開く
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                          <Users className="h-4 w-4" />
                          ログイン・権限確認
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs md:text-sm">
                        <p className="text-muted-foreground">
                          上記のテストアカウントでログイン挙動やロール別の表示内容を確認する場合は、
                          ログインテストツールを利用します。
                        </p>
                        <Link href="/dev/test-login">
                          <Button size="sm" className="w-full justify-between">
                            ツールを開く
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex items-center justify-start gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="h-5 px-2 text-[10px]">
                      ガイド用ツール
                    </Badge>
                    <span>
                      詳細なテストシナリオは Playwright E2E テストや各 /dev
                      ページ内の説明も併せて参照してください。
                    </span>
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
