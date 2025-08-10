'use client';

import { PublicLayout } from '@/components/layout/public-layout';
import { ThemeButtonPreview } from '@/components/ui/theme-button';
import { SurfaceDemo, ComparisonDemo } from '@/components/ui/surface-demo';
import { ThemePreview } from '@/components/ui/theme-selector';

export default function ColorThemePage() {
  return (
    <div className="min-h-screen surface-neutral-0">
      <PublicLayout>
        {/* ヘッダーセクション */}
        <section className="py-24 surface-primary">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h1 className="text-4xl md:text-5xl font-bold">
                テーマカラーデモ
              </h1>
              <p className="text-xl opacity-80 max-w-2xl mx-auto">
                ShutterHub v2のテーマ対応カラーシステムのデモページです。
                右上のボタンでテーマを切り替えて、リアルタイムでカラーパレットの変化をご確認ください。
              </p>
            </div>
          </div>
        </section>

        {/* テーマプレビューセクション */}
        <section className="py-24 surface-accent border-t border-surface-primary/20">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-12">
              {/* テーマセレクター */}
              <ThemePreview />

              {/* セマンティックサーフェースデモ */}
              <div className="surface-neutral backdrop-blur-sm rounded-lg border border-surface-primary/20 p-6">
                <SurfaceDemo />
              </div>

              {/* 比較デモ */}
              <div className="surface-neutral backdrop-blur-sm rounded-lg border border-surface-primary/20 p-6">
                <ComparisonDemo />
              </div>

              {/* テーマボタンプレビュー */}
              <div className="surface-neutral backdrop-blur-sm rounded-lg border border-surface-primary/20">
                <ThemeButtonPreview />
              </div>
            </div>
          </div>
        </section>

        {/* 開発者向け情報 */}
        <section className="py-24 surface-primary">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">開発者向け情報</h2>
              <p className="text-xl opacity-80">
                このページは開発用です。本番環境では表示されません。
              </p>
              <div className="surface-neutral-0 rounded-lg p-6 text-left">
                <h3 className="text-xl font-semibold mb-4">
                  実装されている機能
                </h3>
                <ul className="space-y-2 opacity-80">
                  <li>• 5つのテーマパレット（default, image1-4）</li>
                  <li>• ライト/ダークモード自動切り替え</li>
                  <li>• セマンティックサーフェース</li>
                  <li>• テーマ対応ボタンシステム</li>
                  <li>• CSS Variables による効率的な色管理</li>
                  <li>• 自動コントラスト調整</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </PublicLayout>
    </div>
  );
}
