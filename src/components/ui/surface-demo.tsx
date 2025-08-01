'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * セマンティックサーフェースのデモコンポーネント
 * 新しいサーフェースクラスの使用例を表示
 */
export function SurfaceDemo() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-theme-text-primary">
          🎨 セマンティックサーフェースデモ
        </h3>
        <p className="text-theme-text-secondary">
          <code className="bg-muted px-2 py-1 rounded text-sm">surface-*</code>{' '}
          クラスで背景色とテキスト色が自動ペア
        </p>
      </div>

      {/* プライマリサーフェース */}
      <div className="space-y-4">
        <h4 className="font-semibold text-theme-text-primary">
          プライマリサーフェース
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="surface-primary p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-primary</h5>
            <p className="text-sm opacity-90">
              メインブランド色 + 最適なテキスト
            </p>
            <div className="mt-3 px-3 py-1 bg-black/10 rounded text-xs">
              自動コントラスト
            </div>
          </div>
          <div className="surface-primary-0 p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-primary-0</h5>
            <p className="text-sm opacity-90">明るいプライマリ</p>
            <div className="mt-3 px-3 py-1 bg-black/10 rounded text-xs">
              ライトレベル
            </div>
          </div>
          <div className="surface-primary-1 p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-primary-1</h5>
            <p className="text-sm opacity-90">暗いプライマリ</p>
            <div className="mt-3 px-3 py-1 bg-white/10 rounded text-xs">
              ダークレベル
            </div>
          </div>
        </div>
      </div>

      {/* アクセントサーフェース */}
      <div className="space-y-4">
        <h4 className="font-semibold text-theme-text-primary">
          アクセントサーフェース
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="surface-accent p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-accent</h5>
            <p className="text-sm opacity-90">強調・アクション用</p>
            <button className="mt-3 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors">
              アクションボタン
            </button>
          </div>
          <div className="surface-accent-0 p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-accent-0</h5>
            <p className="text-sm opacity-90">明るいアクセント</p>
            <div className="mt-3 px-3 py-1 bg-black/10 rounded text-xs">
              通知バッジ
            </div>
          </div>
          <div className="surface-accent-1 p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-accent-1</h5>
            <p className="text-sm opacity-90">暗いアクセント</p>
            <div className="mt-3 px-3 py-1 bg-white/10 rounded text-xs">
              重要な警告
            </div>
          </div>
        </div>
      </div>

      {/* ニュートラルサーフェース */}
      <div className="space-y-4">
        <h4 className="font-semibold text-theme-text-primary">
          ニュートラルサーフェース
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="surface-neutral p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-neutral</h5>
            <p className="text-sm opacity-90">控えめ・背景用</p>
            <div className="mt-3 px-3 py-1 bg-black/5 rounded text-xs">
              サブテキスト
            </div>
          </div>
          <div className="surface-neutral-0 p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-neutral-0</h5>
            <p className="text-sm opacity-90">明るいニュートラル</p>
            <div className="mt-3 px-3 py-1 bg-black/5 rounded text-xs">
              カード背景
            </div>
          </div>
          <div className="surface-neutral-1 p-6 rounded-lg text-center">
            <h5 className="font-medium mb-2">surface-neutral-1</h5>
            <p className="text-sm opacity-90">暗いニュートラル</p>
            <div className="mt-3 px-3 py-1 bg-white/10 rounded text-xs">
              フッター
            </div>
          </div>
        </div>
      </div>

      {/* 実用例 */}
      <div className="space-y-4">
        <h4 className="font-semibold text-theme-text-primary">実用例</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* カード例1 */}
          <Card className="surface-primary border-0">
            <CardHeader>
              <CardTitle className="text-inherit">重要なお知らせ</CardTitle>
              <CardDescription className="text-inherit opacity-80">
                プライマリサーフェースを使用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-inherit opacity-90 mb-4">
                このカードは surface-primary
                クラス1つで背景色とテキスト色が自動設定されています。
              </p>
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded transition-colors">
                詳細を見る
              </button>
            </CardContent>
          </Card>

          {/* カード例2 */}
          <Card className="surface-accent-0 border-0">
            <CardHeader>
              <CardTitle className="text-inherit">アクション推奨</CardTitle>
              <CardDescription className="text-inherit opacity-80">
                明るいアクセントサーフェース
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-inherit opacity-90 mb-4">
                アクション促進に最適な明るいアクセント色です。
              </p>
              <button className="px-4 py-2 bg-black/10 hover:bg-black/20 rounded transition-colors">
                今すぐ始める
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* コード例 */}
      <div className="space-y-4">
        <h4 className="font-semibold text-theme-text-primary">
          使用例（コード）
        </h4>
        <div className="surface-neutral-1 p-4 rounded-lg font-mono text-sm space-y-2">
          <div className="text-inherit opacity-60">{`// 従来の記述（2つのクラス）`}</div>
          <div className="text-inherit">{`<div className="bg-theme-primary text-theme-primary-foreground">`}</div>

          <div className="text-inherit opacity-60 mt-4">{`// 新システム（1つのクラス）`}</div>
          <div className="text-inherit">{`<div className="surface-primary">`}</div>

          <div className="text-inherit opacity-60 mt-4">{`// レベル指定も可能`}</div>
          <div className="text-inherit">{`<div className="surface-accent-0">  <!-- 明るめ -->`}</div>
          <div className="text-inherit">{`<div className="surface-accent-1">  <!-- 暗め -->`}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 従来システムとの比較デモ
 */
export function ComparisonDemo() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-theme-text-primary">
          ⚡ 従来システムとの比較
        </h3>
        <p className="text-theme-text-secondary">記述量の削減と保守性の向上</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 従来システム */}
        <div className="space-y-4">
          <h4 className="font-semibold text-red-600">❌ 従来の記述</h4>
          <div className="bg-theme-primary text-theme-primary-foreground p-4 rounded-lg">
            <p className="mb-2">複数クラスが必要</p>
            <code className="text-xs bg-black/20 px-2 py-1 rounded">
              bg-theme-primary text-theme-primary-foreground
            </code>
          </div>
          <div className="bg-theme-accent text-theme-accent-foreground p-4 rounded-lg">
            <p className="mb-2">組み合わせを覚える必要</p>
            <code className="text-xs bg-black/20 px-2 py-1 rounded">
              bg-theme-accent text-theme-accent-foreground
            </code>
          </div>
        </div>

        {/* 新システム */}
        <div className="space-y-4">
          <h4 className="font-semibold text-green-600">✅ 新システム</h4>
          <div className="surface-primary p-4 rounded-lg">
            <p className="mb-2">1つのクラスで完結</p>
            <code className="text-xs bg-white/20 px-2 py-1 rounded">
              surface-primary
            </code>
          </div>
          <div className="surface-accent p-4 rounded-lg">
            <p className="mb-2">直感的でシンプル</p>
            <code className="text-xs bg-white/20 px-2 py-1 rounded">
              surface-accent
            </code>
          </div>
        </div>
      </div>

      {/* ホバー効果デモ */}
      <div className="surface-neutral-0 p-6 rounded-lg">
        <h4 className="font-semibold mb-4">🎯 ホバー効果の適用</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <h5 className="font-medium">基本（ホバー効果なし）</h5>
            <div className="surface-primary p-3 rounded cursor-pointer">
              基本のsurface-primary
            </div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
              surface-primary
            </code>
          </div>
          <div className="space-y-3">
            <h5 className="font-medium">ホバー効果あり</h5>
            <div className="surface-primary hover:surface-primary p-3 rounded cursor-pointer transition-colors">
              hover:surface-primaryを追加
            </div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
              surface-primary hover:surface-primary
            </code>
          </div>
        </div>
        <p className="text-sm opacity-80">
          上記のカードにカーソルを合わせて違いを確認してください。
          <code className="bg-gray-100 px-1 rounded">hover:</code>
          プレフィックスを明示的に追加した場合のみホバー効果が適用されます。
        </p>
      </div>

      {/* メリット */}
      <div className="surface-neutral-0 p-6 rounded-lg">
        <h4 className="font-semibold mb-4">🚀 新システムのメリット</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>記述量が50%削減（2つのクラス → 1つのクラス）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>自動コントラスト計算でアクセシビリティ向上</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>セマンティックな命名で意図が明確</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>
              必要に応じて{' '}
              <code className="bg-gray-200 px-1 rounded text-sm">
                hover:surface-*
              </code>{' '}
              でホバー効果追加
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>テーマ切り替え時の色組み合わせミスを防止</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
