'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { colorPalettes, applyTheme } from '@/lib/utils/color-system';
import { Moon, Sun } from 'lucide-react';

export default function ColorThemePage() {
  const [currentPalette, setCurrentPalette] = useState('default');
  const [isDark, setIsDark] = useState(false);

  // テーマ適用
  useEffect(() => {
    applyTheme(currentPalette, isDark);
  }, [currentPalette, isDark]);

  return (
    <div className="min-h-screen bg-background">
      <PublicLayout>
        {/* ヘッダーセクション */}
        <section className="py-24 surface-primary">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h1 className="text-4xl md:text-5xl font-bold">
                統合カラーシステム
              </h1>
              <p className="text-xl opacity-80 max-w-2xl mx-auto">
                シンプルで明示的な命名規則による統合カラーシステム
              </p>

              {/* テーマ切り替えコントロール */}
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <div className="flex gap-2">
                  {colorPalettes.map(palette => (
                    <Button
                      key={palette.name}
                      onClick={() => setCurrentPalette(palette.name)}
                      variant={
                        currentPalette === palette.name ? 'accent' : 'neutral'
                      }
                      size="sm"
                      className="gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: palette.colors.primary }}
                      />
                      {palette.name}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={() => setIsDark(!isDark)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {isDark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {isDark ? 'Light' : 'Dark'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ブランド色デモ */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-3xl font-bold text-center">
                🎨 ブランド色（固定・テーマ不変）
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-full h-20 bg-[#6F5091] rounded-lg"></div>
                  <code className="text-xs">brand-primary</code>
                  <p className="text-xs text-muted-foreground">#6F5091</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-full h-20 bg-[#101820] rounded-lg"></div>
                  <code className="text-xs">brand-secondary</code>
                  <p className="text-xs text-muted-foreground">#101820</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-full h-20 bg-[#4ECDC4] rounded-lg"></div>
                  <code className="text-xs">brand-success</code>
                  <p className="text-xs text-muted-foreground">#4ECDC4</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-full h-20 bg-[#FFE66D] rounded-lg"></div>
                  <code className="text-xs">brand-warning</code>
                  <p className="text-xs text-muted-foreground">#FFE66D</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-full h-20 bg-[#FF6B6B] rounded-lg"></div>
                  <code className="text-xs">brand-error</code>
                  <p className="text-xs text-muted-foreground">#FF6B6B</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-full h-20 bg-[#4D96FF] rounded-lg"></div>
                  <code className="text-xs">brand-info</code>
                  <p className="text-xs text-muted-foreground">#4D96FF</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">ブランド色の使用例</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="brand-primary text-2xl font-bold">
                      ShutterHub
                    </span>
                    <code className="text-xs px-2 py-1 rounded">
                      brand-primary
                    </code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="brand-success font-medium">
                      予約完了しました
                    </span>
                    <code className="text-xs px-2 py-1 rounded">
                      brand-success
                    </code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="brand-warning font-medium">
                      注意が必要です
                    </span>
                    <code className="text-xs px-2 py-1 rounded">
                      brand-warning
                    </code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="brand-error font-medium">
                      エラーが発生
                    </span>
                    <code className="text-xs px-2 py-1 rounded">
                      brand-error
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* サーフェース色デモ */}
        <section className="py-16 surface-accent">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-3xl font-bold text-center">
                🎨 サーフェース色（テーマ対応・シンプル）
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="surface-primary p-6 rounded-lg text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    surface-primary
                  </h3>
                  <p className="opacity-90 mb-4">
                    メインボタン・重要なカード・ヘッダー背景
                  </p>
                  <Button variant="primary" size="sm">
                    メインボタン
                  </Button>
                </div>

                <div className="surface-accent p-6 rounded-lg text-center">
                  <h3 className="text-lg font-semibold mb-2">surface-accent</h3>
                  <p className="opacity-90 mb-4">
                    アクションボタン・強調要素・通知
                  </p>
                  <Button variant="accent" size="sm">
                    アクションボタン
                  </Button>
                </div>

                <div className="surface-neutral p-6 rounded-lg text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    surface-neutral
                  </h3>
                  <p className="opacity-90 mb-4">
                    サブボタン・カード背景・フッター
                  </p>
                  <Button variant="neutral" size="sm">
                    サブボタン
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 実用例セクション */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-3xl font-bold text-center">実用例</h2>

              {/* カード例 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="surface-neutral p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">撮影会カード例</h3>
                  <div className="space-y-3">
                    <h4 className="font-medium">ポートレート撮影会</h4>
                    <p className="opacity-80 text-sm">
                      プロカメラマンによる個人撮影
                    </p>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm">
                        予約する
                      </Button>
                      <span className="brand-success text-sm">空きあり</span>
                    </div>
                  </div>
                </div>

                <div className="surface-primary p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">重要なお知らせ</h3>
                  <div className="space-y-3">
                    <p className="opacity-90 text-sm">
                      システムメンテナンスのお知らせ
                    </p>
                    <div className="flex gap-2">
                      <Button variant="accent" size="sm">
                        詳細を見る
                      </Button>
                      <span className="brand-warning text-sm">要確認</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* コード例 */}
              <div className="surface-neutral p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">新しい記述方法</h3>
                <div className="space-y-4 font-mono text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">{`// ブランド色（固定）`}</div>
                    <div>{`<span className="brand-primary">ShutterHub</span>`}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">{`// ボタン（テーマ対応）`}</div>
                    <div>{`<Button variant="primary">ボタン</Button>`}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">{`// 背景カード`}</div>
                    <div>{`<div className="surface-neutral">カード</div>`}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* テーマ切り替えテスト */}
        <section className="py-16 surface-accent">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl font-bold">テーマ切り替えテスト</h2>
              <p className="opacity-90">
                右上のパレットボタンでテーマを切り替えて、
                サーフェース色の変化を確認してください
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="primary" size="lg">
                  プライマリボタン
                </Button>
                <Button variant="accent" size="lg">
                  アクセントボタン
                </Button>
                <Button variant="neutral" size="lg">
                  ニュートラルボタン
                </Button>
              </div>
              <p className="text-sm opacity-70">
                ブランド色（下記）はテーマに関係なく固定されます
              </p>
              <div className="flex justify-center gap-4">
                <span className="brand-primary font-bold">ShutterHub</span>
                <span className="brand-success font-medium">成功</span>
                <span className="brand-warning font-medium">警告</span>
                <span className="brand-error font-medium">エラー</span>
              </div>
            </div>
          </div>
        </section>
      </PublicLayout>
    </div>
  );
}
