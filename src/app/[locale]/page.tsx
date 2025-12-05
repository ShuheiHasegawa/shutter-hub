'use client';

import { useTranslations } from 'next-intl';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Camera, Users, Zap, MapPin, Star, Calendar } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ヒーローセクション - エディトリアルデザイン */}
            <section className="relative min-h-[90vh] flex items-center overflow-hidden noise-texture">
              {/* グラデーションメッシュ背景 */}
              <div className="absolute inset-0 gradient-mesh opacity-60" />

              {/* 対角線アクセント */}
              <div className="absolute inset-0 diagonal-accent" />

              <div className="container relative z-10 py-24 md:py-32">
                <div className="asymmetric-grid">
                  {/* 非対称レイアウト: 左側に余白、右側にコンテンツ */}
                  <div className="col-span-12 lg:col-span-8 lg:col-start-3">
                    <div className="space-y-10">
                      {/* タイトル - 特徴的なフォント使用 */}
                      <div className="stagger-reveal">
                        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1]">
                          <span className="block">{t('hero.title')}</span>
                          <span className="block brand-primary whitespace-nowrap">
                            {t('hero.titleHighlight')}
                          </span>
                        </h1>
                      </div>

                      {/* サブタイトル - スタガードアニメーション */}
                      <div className="stagger-reveal stagger-reveal-delay-1 space-y-4">
                        <p className="text-xl md:text-2xl lg:text-3xl opacity-90 leading-relaxed max-w-2xl">
                          {t('hero.subtitle')}
                        </p>
                        <p className="text-lg md:text-xl opacity-75 max-w-xl">
                          {t('hero.subtitleSecond')}
                        </p>
                      </div>

                      {/* CTAボタン - スタガードアニメーション */}
                      <div className="stagger-reveal stagger-reveal-delay-2 flex flex-col sm:flex-row gap-4 pt-4">
                        <Button
                          asChild
                          size="lg"
                          variant="accent"
                          className="group relative overflow-hidden transition-all duration-300 hover:scale-105"
                        >
                          <Link href="/photo-sessions">
                            <span className="relative z-10">
                              {t('hero.findSessions')}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="lg"
                          variant="primary"
                          className="group relative overflow-hidden transition-all duration-300 hover:scale-105"
                        >
                          <Link href="/instant">
                            <span className="relative z-10">
                              {t('hero.requestInstant')}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 特徴セクション - 非対称グリッドレイアウト */}
            <section className="relative py-32 surface-primary noise-texture">
              <div className="container">
                {/* セクションタイトル - 非中央配置 */}
                <div className="asymmetric-grid mb-20">
                  <div className="col-span-12 md:col-span-8 md:col-start-2 lg:col-span-6 lg:col-start-3">
                    <div className="stagger-reveal stagger-reveal-delay-1">
                      <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
                        {t('features.title')}
                      </h2>
                      <p className="text-xl opacity-80 leading-relaxed">
                        {t('features.subtitle')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* カードグリッド - 3列シンプルグリッド */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* カード1 */}
                  <div className="stagger-reveal stagger-reveal-delay-2">
                    <Card className="h-full surface-accent group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 flex flex-col overflow-hidden">
                      <CardHeader className="pb-6 pt-8 px-8">
                        <div className="relative mx-auto w-20 h-20 brand-primary rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                          <div className="absolute inset-0 brand-primary rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
                          <Calendar className="h-10 w-10 text-white relative z-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-4 text-center">
                          {t('features.booking.title')}
                        </CardTitle>
                        <CardDescription className="leading-relaxed text-center text-base">
                          {t('features.booking.description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 pb-8 px-8">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.booking.features.0')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.booking.features.1')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.booking.features.2')}
                            </span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* カード2 */}
                  <div className="stagger-reveal stagger-reveal-delay-3">
                    <Card className="h-full surface-accent group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 flex flex-col overflow-hidden">
                      <CardHeader className="pb-6 pt-8 px-8">
                        <div className="relative mx-auto w-20 h-20 brand-primary rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                          <div className="absolute inset-0 brand-primary rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
                          <Zap className="h-10 w-10 text-white relative z-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-4 text-center">
                          {t('features.instant.title')}
                        </CardTitle>
                        <CardDescription className="leading-relaxed text-center text-base">
                          {t('features.instant.description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 pb-8 px-8">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.instant.features.0')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.instant.features.1')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.instant.features.2')}
                            </span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* カード3 */}
                  <div className="stagger-reveal stagger-reveal-delay-4">
                    <Card className="h-full surface-accent group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 flex flex-col overflow-hidden">
                      <CardHeader className="pb-6 pt-8 px-8">
                        <div className="relative mx-auto w-20 h-20 brand-primary rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                          <div className="absolute inset-0 brand-primary rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
                          <MapPin className="h-10 w-10 text-white relative z-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-4 text-center">
                          {t('features.wiki.title')}
                        </CardTitle>
                        <CardDescription className="leading-relaxed text-center text-base">
                          {t('features.wiki.description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 pb-8 px-8">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.wiki.features.0')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.wiki.features.1')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.wiki.features.2')}
                            </span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* カード4 */}
                  <div className="stagger-reveal stagger-reveal-delay-5">
                    <Card className="h-full surface-accent group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 flex flex-col overflow-hidden">
                      <CardHeader className="pb-6 pt-8 px-8">
                        <div className="relative mx-auto w-20 h-20 brand-primary rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                          <div className="absolute inset-0 brand-primary rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
                          <Users className="h-10 w-10 text-white relative z-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-4 text-center">
                          {t('features.platform.title')}
                        </CardTitle>
                        <CardDescription className="leading-relaxed text-center text-base">
                          {t('features.platform.description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 pb-8 px-8">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.platform.features.0')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.platform.features.1')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.platform.features.2')}
                            </span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* カード5 */}
                  <div className="stagger-reveal stagger-reveal-delay-6">
                    <Card className="h-full surface-accent group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 flex flex-col overflow-hidden">
                      <CardHeader className="pb-6 pt-8 px-8">
                        <div className="relative mx-auto w-20 h-20 brand-primary rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                          <div className="absolute inset-0 brand-primary rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
                          <Star className="h-10 w-10 text-white relative z-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-4 text-center">
                          {t('features.review.title')}
                        </CardTitle>
                        <CardDescription className="leading-relaxed text-center text-base">
                          {t('features.review.description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 pb-8 px-8">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.review.features.0')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.review.features.1')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.review.features.2')}
                            </span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* カード6 */}
                  <div className="stagger-reveal stagger-reveal-delay-6">
                    <Card className="h-full surface-accent group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 flex flex-col overflow-hidden">
                      <CardHeader className="pb-6 pt-8 px-8">
                        <div className="relative mx-auto w-20 h-20 brand-primary rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                          <div className="absolute inset-0 brand-primary rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
                          <Camera className="h-10 w-10 text-white relative z-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-4 text-center">
                          {t('features.professional.title')}
                        </CardTitle>
                        <CardDescription className="leading-relaxed text-center text-base">
                          {t('features.professional.description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 pb-8 px-8">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.professional.features.0')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.professional.features.1')}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-3 mt-1 text-lg">•</span>
                            <span className="leading-relaxed">
                              {t('features.professional.features.2')}
                            </span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* CTAセクション - エディトリアルスタイル */}
            <section className="relative py-32 surface-accent noise-texture overflow-hidden">
              {/* グラデーションメッシュ背景 */}
              <div className="absolute inset-0 gradient-mesh opacity-40" />

              <div className="container relative z-10">
                <div className="asymmetric-grid">
                  {/* 非中央配置 */}
                  <div className="col-span-12 md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3">
                    <div className="space-y-10 stagger-reveal stagger-reveal-delay-1">
                      <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                        {t('cta.title')}
                      </h2>
                      <p className="text-xl md:text-2xl opacity-90 leading-relaxed">
                        {t('cta.subtitle')}
                      </p>
                      <div className="pt-6">
                        <Button
                          asChild
                          size="lg"
                          variant="cta"
                          className="group relative overflow-hidden transition-all duration-300 hover:scale-105 text-lg px-8 py-6"
                        >
                          <Link href="/auth/signup">
                            <span className="relative z-10">
                              {t('cta.getStarted')}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          </Link>
                        </Button>
                      </div>
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
