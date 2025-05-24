import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Camera, Users, Zap, MapPin, Star, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <MainLayout>
      {/* ヒーローセクション */}
      <section className="relative bg-gradient-to-br from-shutter-primary to-shutter-primary-dark text-white">
        <div className="container py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              撮影業界をつなぐ
              <br />
              <span className="text-shutter-warning">統合プラットフォーム</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              モデル、カメラマン、運営者が出会う場所。
              <br />
              撮影会の予約から即座撮影まで、すべてがここに。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-shutter-primary hover:bg-white/90"
              >
                <Link href="/photo-sessions">撮影会を探す</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-shutter-primary"
              >
                <Link href="/instant">即座撮影を依頼</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-24">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">ShutterHubの特徴</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              撮影業界のすべてのニーズに応える、包括的なプラットフォーム
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-shutter-primary" />
                </div>
                <CardTitle>撮影会予約システム</CardTitle>
                <CardDescription>
                  先着順から抽選まで、多様な予約方式に対応
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• リアルタイム在庫管理</li>
                  <li>• 公平な抽選システム</li>
                  <li>• 優先予約・キャンセル待ち</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-shutter-accent" />
                </div>
                <CardTitle>即座撮影リクエスト</CardTitle>
                <CardDescription>
                  撮影業界のUber - 今すぐ撮影したい時に
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 位置ベースマッチング</li>
                  <li>• 15分から対応可能</li>
                  <li>• 透明な料金システム</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-info/10 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-shutter-info" />
                </div>
                <CardTitle>StudioWiki</CardTitle>
                <CardDescription>
                  コミュニティが作るスタジオ情報データベース
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 詳細なスタジオ情報</li>
                  <li>• 実際の利用者レビュー</li>
                  <li>• 役割別評価システム</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-success/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-shutter-success" />
                </div>
                <CardTitle>三者統合プラットフォーム</CardTitle>
                <CardDescription>
                  モデル・カメラマン・運営者が一つの場所で
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 統一されたプロフィール</li>
                  <li>• 相互評価システム</li>
                  <li>• 安全な決済システム</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-warning/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-shutter-warning" />
                </div>
                <CardTitle>評価・レビューシステム</CardTitle>
                <CardDescription>
                  透明性の高い評価で信頼関係を構築
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 5段階評価システム</li>
                  <li>• 詳細なレビュー機能</li>
                  <li>• ユーザーランクシステム</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-shutter-primary" />
                </div>
                <CardTitle>プロフェッショナル対応</CardTitle>
                <CardDescription>
                  業界のプロフェッショナルニーズに特化
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 高品質画像対応</li>
                  <li>• 著作権・肖像権管理</li>
                  <li>• 業界標準の機能</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-24 bg-muted">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              今すぐShutterHubを始めよう
            </h2>
            <p className="text-xl text-muted-foreground">
              撮影業界の新しいスタンダードを体験してください
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/signup">無料で始める</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">詳しく見る</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
