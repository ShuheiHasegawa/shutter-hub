'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LocationPermissionCheck } from './LocationPermissionCheck';
import { QuickRequestForm } from './QuickRequestForm';
import { HowItWorks } from './HowItWorks';
import { PricingDisplay } from './PricingDisplay';
import { TestimonialCarousel } from './TestimonialCarousel';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Camera, MapPin, Clock, Shield, Star, Users } from 'lucide-react';

export function InstantPhotoLanding() {
  const [step, setStep] = useState<'permission' | 'form' | 'info'>(
    'permission'
  );
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { location, error, isLoading, isSupported } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000, // 5分間キャッシュ
    watch: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (location && hasRequestedLocation) {
      setStep('form');
    }
  }, [location, hasRequestedLocation]);

  const handleLocationRequest = () => {
    setHasRequestedLocation(true);
  };

  const handleSkipLocation = () => {
    setStep('info');
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10" />

        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Badge
                variant="secondary"
                className="text-sm font-medium px-3 py-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                撮影業界のUber
              </Badge>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              今いる場所で
              <br />
              <span className="text-shutter-info">即座に撮影</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              旅行先や外出先で、プロのカメラマンに撮影を依頼。
              <br />
              たった数分で素敵な思い出を残しませんか？
            </p>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="flex items-center justify-center gap-3 p-4 bg-card rounded-lg">
                <MapPin className="h-6 w-6 text-shutter-info" />
                <span className="font-medium text-card-foreground">
                  位置ベースマッチング
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 bg-card rounded-lg">
                <Clock className="h-6 w-6 text-shutter-success" />
                <span className="font-medium text-card-foreground">
                  平均応答時間5分
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 bg-card rounded-lg">
                <Shield className="h-6 w-6 text-shutter-primary" />
                <span className="font-medium text-card-foreground">
                  認証不要で簡単
                </span>
              </div>
            </div>

            {/* Location Permission / Form */}
            <div className="mx-auto">
              {!isMounted ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="flex items-center justify-center gap-2 py-4">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-shutter-primary border-t-transparent" />
                      <span className="text-sm text-muted-foreground">
                        読み込み中...
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {step === 'permission' && (
                    <LocationPermissionCheck
                      isSupported={isSupported}
                      isLoading={isLoading}
                      error={error?.message || null}
                      onRequestLocation={handleLocationRequest}
                      onSkip={handleSkipLocation}
                    />
                  )}

                  {step === 'form' && location && (
                    <QuickRequestForm location={location} />
                  )}

                  {step === 'info' && (
                    <Card>
                      <CardContent className="pt-6">
                        <Alert>
                          <MapPin className="h-4 w-4" />
                          <AlertDescription>
                            位置情報を有効にすると、より正確な検索結果が得られます。
                            <Button
                              variant="link"
                              size="sm"
                              className="ml-2 p-0 h-auto"
                              onClick={handleLocationRequest}
                            >
                              位置情報を有効にする
                            </Button>
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-card-foreground mb-4">
              多くの方にご利用いただいています
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              旅行者、カップル、家族、インスタグラマーなど、
              様々な方々が即座撮影サービスを活用しています。
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-shutter-info mb-2">
                500+
              </div>
              <div className="text-muted-foreground">登録カメラマン</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-shutter-success mb-2">
                98%
              </div>
              <div className="text-muted-foreground">満足度</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-shutter-primary mb-2">
                5分
              </div>
              <div className="text-muted-foreground">平均応答時間</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-shutter-warning mb-2">
                24/7
              </div>
              <div className="text-muted-foreground">サポート対応</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted">
        <HowItWorks />
      </section>

      {/* Pricing */}
      <section className="py-16 bg-card">
        <PricingDisplay />
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <TestimonialCarousel />
      </section>

      {/* Popular Areas */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-card-foreground mb-4">
              人気の撮影エリア
            </h2>
            <p className="text-muted-foreground">
              これらのエリアでは特にカメラマンが豊富にいます
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: '渋谷・原宿', count: '50+', image: '🗼' },
              { name: '浅草・上野', count: '40+', image: '🏮' },
              { name: '新宿・代々木', count: '35+', image: '🏢' },
              { name: '六本木・赤坂', count: '30+', image: '🌃' },
              { name: '銀座・日比谷', count: '25+', image: '🏪' },
              { name: 'お台場・豊洲', count: '20+', image: '🌉' },
              { name: '横浜・みなとみらい', count: '30+', image: '🎡' },
              { name: '鎌倉・江ノ島', count: '15+', image: '⛩️' },
            ].map(area => (
              <Card
                key={area.name}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{area.image}</div>
                  <div className="font-medium text-sm text-card-foreground mb-1">
                    {area.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {area.count} カメラマン
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            今すぐ撮影を依頼してみませんか？
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            ゲストとして月3回まで無料でご利用いただけます。
            アカウント登録は不要です。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              variant="default"
              onClick={() => {
                document.getElementById('quick-request')?.scrollIntoView({
                  behavior: 'smooth',
                });
              }}
              className="min-w-[200px]"
            >
              <Camera className="h-5 w-5 mr-2" />
              今すぐ撮影依頼
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm">
                月3回まで無料 • 認証不要 • 2分で完了
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              ShutterHubの特徴
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <MapPin className="h-8 w-8 text-shutter-info mb-2" />
                <CardTitle className="text-xl">位置ベースマッチング</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  現在地から半径1km以内のプロカメラマンを即座に検索。
                  観光地でも街中でも、どこでもマッチング可能。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-shutter-success mb-2" />
                <CardTitle className="text-xl">高速レスポンス</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  平均5分以内でカメラマンから返答。
                  「今すぐ」「30分以内」「1時間以内」から緊急度を選択可能。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-shutter-primary mb-2" />
                <CardTitle className="text-xl">安心・安全</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  全カメラマンは身元確認済み。
                  撮影前の事前確認、明確な料金体系で安心してご利用いただけます。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-shutter-warning mb-2" />
                <CardTitle className="text-xl">多様な撮影タイプ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ポートレート、カップル、家族、グループ、風景撮影など、
                  様々なニーズに対応したプロが在籍。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Camera className="h-8 w-8 text-shutter-accent mb-2" />
                <CardTitle className="text-xl">プロ品質</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  プロ仕様の機材を使用し、編集済みの高品質な写真を配信。
                  撮影後2時間以内にオンラインで受け取り可能。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Star className="h-8 w-8 text-shutter-warning mb-2" />
                <CardTitle className="text-xl">評価システム</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  相互評価システムにより品質を保証。
                  過去の評価やレビューを参考に安心してカメラマンを選択できます。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
