'use client';

import { useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Star,
  MessageCircle,
  Users,
  Camera,
  Inbox,
  Search,
  Heart,
  Building2,
  Plus,
} from 'lucide-react';
export default function EmptyStateDemoPage() {
  const [selectedVariant, setSelectedVariant] = useState<
    'default' | 'search' | 'minimal'
  >('default');
  const [wrapped, setWrapped] = useState(true);

  // デモ用の空状態コンポーネント（仮実装）
  const EmptyStateDemo = ({
    icon: Icon = Inbox,
    title = 'データがありません',
    description = '表示するデータがありません。',
    action,
    searchTerm,
    variant = 'default',
    wrapped = true,
  }: {
    icon?: typeof Inbox;
    title?: string;
    description?: string;
    action?: {
      label: string;
      onClick?: () => void;
    };
    searchTerm?: string;
    variant?: 'default' | 'search' | 'minimal';
    wrapped?: boolean;
  }) => {
    // 検索結果が空の場合
    if (variant === 'search' && searchTerm) {
      const content = (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            「{searchTerm}」の検索結果が見つかりませんでした
          </h3>
          <p className="text-muted-foreground mb-4">
            別のキーワードで検索してみてください
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• スペルを確認してください</p>
            <p>• 別のキーワードを試してください</p>
            <p>• すべての項目を閲覧する</p>
          </div>
          {action && (
            <Button className="mt-6" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      );

      return wrapped ? (
        <Card>
          <CardContent>{content}</CardContent>
        </Card>
      ) : (
        content
      );
    }

    // 最小限の表示
    if (variant === 'minimal') {
      const content = (
        <div className="text-center py-8">
          <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{title}</p>
        </div>
      );

      return wrapped ? (
        <Card>
          <CardContent>{content}</CardContent>
        </Card>
      ) : (
        content
      );
    }

    // デフォルト表示
    const content = (
      <div className="text-center py-16">
        <div className="inline-flex p-4 rounded-full bg-primary/10 mb-6">
          <Icon className="h-16 w-16 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        {action && (
          <Button
            onClick={action.onClick}
            className="flex items-center gap-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        )}
      </div>
    );

    return wrapped ? (
      <Card>
        <CardContent>{content}</CardContent>
      </Card>
    ) : (
      content
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DevToolsNavigation />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ヘッダーセクション */}
            <section className="py-12 bg-background">
              <div className="container">
                <div className="text-center space-y-4 mb-8">
                  <h1 className="text-4xl md:text-5xl font-bold">
                    空状態表示デモ
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    統一的な空状態（Empty
                    State）表示コンポーネントのデザインパターン
                  </p>
                </div>

                {/* コントロール */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedVariant('default')}
                      variant={
                        selectedVariant === 'default' ? 'default' : 'outline'
                      }
                      size="sm"
                    >
                      デフォルト
                    </Button>
                    <Button
                      onClick={() => setSelectedVariant('search')}
                      variant={
                        selectedVariant === 'search' ? 'default' : 'outline'
                      }
                      size="sm"
                    >
                      検索結果なし
                    </Button>
                    <Button
                      onClick={() => setSelectedVariant('minimal')}
                      variant={
                        selectedVariant === 'minimal' ? 'default' : 'outline'
                      }
                      size="sm"
                    >
                      最小限
                    </Button>
                  </div>
                  <Button
                    onClick={() => setWrapped(!wrapped)}
                    variant={wrapped ? 'default' : 'outline'}
                    size="sm"
                  >
                    {wrapped ? 'Cardでラップ' : 'Cardなし'}
                  </Button>
                </div>
              </div>
            </section>

            {/* デモセクション */}
            <section className="py-12 bg-muted/30">
              <div className="container">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* パターン1: レビューリスト */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">レビューリスト</h3>
                    <EmptyStateDemo
                      icon={Star}
                      title="レビューがありません"
                      description="この撮影会にはまだレビューがありません。最初のレビューを書いてみませんか？"
                      action={{
                        label: 'レビューを書く',
                        onClick: () => alert('レビューを書く'),
                      }}
                      variant={selectedVariant}
                      wrapped={wrapped}
                    />
                  </div>

                  {/* パターン2: メッセージ */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">メッセージ</h3>
                    <EmptyStateDemo
                      icon={MessageCircle}
                      title="会話がありません"
                      description="まだ会話がありません。新しい会話を始めてみましょう。"
                      action={{
                        label: '会話を始める',
                        onClick: () => alert('会話を始める'),
                      }}
                      variant={selectedVariant}
                      wrapped={wrapped}
                    />
                  </div>

                  {/* パターン3: ユーザー検索 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">ユーザー検索</h3>
                    <EmptyStateDemo
                      icon={Users}
                      title="ユーザーが見つかりません"
                      description={
                        selectedVariant === 'search'
                          ? undefined
                          : '検索条件に一致するユーザーが見つかりませんでした。'
                      }
                      searchTerm={
                        selectedVariant === 'search' ? 'テスト' : undefined
                      }
                      variant={selectedVariant}
                      wrapped={wrapped}
                    />
                  </div>

                  {/* パターン4: 撮影会 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">撮影会</h3>
                    <EmptyStateDemo
                      icon={Camera}
                      title="撮影会がありません"
                      description="まだ撮影会がありません。最初の撮影会を作成してみましょう。"
                      action={{
                        label: '撮影会を作成',
                        onClick: () => alert('撮影会を作成'),
                      }}
                      variant={selectedVariant}
                      wrapped={wrapped}
                    />
                  </div>

                  {/* パターン5: お気に入り（スタジオ） */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      お気に入り（スタジオ）
                    </h3>
                    <EmptyStateDemo
                      icon={Building2}
                      title="お気に入りのスタジオがありません"
                      description="気に入ったスタジオをお気に入りに追加すると、ここに表示されます。"
                      action={{
                        label: 'スタジオを探す',
                        onClick: () => alert('スタジオを探す'),
                      }}
                      variant={selectedVariant}
                      wrapped={wrapped}
                    />
                  </div>

                  {/* パターン6: お気に入り（撮影会） */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      お気に入り（撮影会）
                    </h3>
                    <EmptyStateDemo
                      icon={Heart}
                      title="お気に入りの撮影会がありません"
                      description="気に入った撮影会をお気に入りに追加すると、ここに表示されます。"
                      action={{
                        label: '撮影会を探す',
                        onClick: () => alert('撮影会を探す'),
                      }}
                      variant={selectedVariant}
                      wrapped={wrapped}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 既存実装との比較 */}
            <section className="py-12 bg-background">
              <div className="container">
                <h2 className="text-2xl font-bold mb-8 text-center">
                  既存実装との比較
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 既存: ReviewList */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">既存: ReviewList</h3>
                    <Card>
                      <CardContent className="text-center py-8">
                        <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          レビューがありません
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          この撮影会にはまだレビューがありません。
                        </p>
                        <Button>
                          <Star className="mr-2 h-4 w-4" />
                          最初のレビューを書く
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 統一後: ReviewList */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      統一後: ReviewList
                    </h3>
                    <EmptyStateDemo
                      icon={Star}
                      title="レビューがありません"
                      description="この撮影会にはまだレビューがありません。最初のレビューを書いてみませんか？"
                      action={{
                        label: 'レビューを書く',
                        onClick: () => {},
                      }}
                      variant="default"
                      wrapped={true}
                    />
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
