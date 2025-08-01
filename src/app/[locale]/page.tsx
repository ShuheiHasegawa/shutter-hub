'use client';

import { useTranslations } from 'next-intl';
import { PublicLayout } from '@/components/layout/public-layout';

import { ThemeButton, ThemeButtonPreview } from '@/components/ui/theme-button';
import { SurfaceDemo, ComparisonDemo } from '@/components/ui/surface-demo';
import { ThemePreview } from '@/components/ui/theme-selector';
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
    <div className="min-h-screen surface-neutral-0">
      <PublicLayout>
        {/* ヒーローセクション */}
        <section className="relative surface-primary">
          <div className="container py-24 md:py-32">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                {t('hero.title')}
                <br />
                <span className="text-surface-accent">
                  {t('hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-xl md:text-2xl opacity-90">
                {t('hero.subtitle')}
                <br />
                {t('hero.subtitleSecond')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <ThemeButton asChild size="lg" variant="secondary">
                  <Link href="/photo-sessions">{t('hero.findSessions')}</Link>
                </ThemeButton>
                <ThemeButton asChild size="lg" variant="secondary">
                  <Link href="/instant">{t('hero.requestInstant')}</Link>
                </ThemeButton>
              </div>
            </div>
          </div>
        </section>

        {/* テーマプレビューセクション */}
        <section className="py-24 surface-accent border-t border-surface-primary/20">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                テーマカラーデモ
              </h2>
              <p className="text-xl opacity-80 max-w-2xl mx-auto">
                右上のボタンでテーマを切り替えて、リアルタイムでカラーパレットの変化をご確認ください
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-12">
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

        {/* 特徴セクション */}
        <section className="py-24 surface-primary">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                {t('features.title')}
              </h2>
              <p className="text-xl opacity-80 max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="text-center surface-primary-0 border border-theme-primary-2 backdrop-blur-sm hover:border-theme-primary-3 hover:surface-primary transition-colors">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-theme-primary-2 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-theme-primary" />
                  </div>
                  <CardTitle>{t('features.booking.title')}</CardTitle>
                  <CardDescription className="opacity-80">
                    {t('features.booking.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm opacity-70 space-y-2">
                    <li>• {t('features.booking.features.0')}</li>
                    <li>• {t('features.booking.features.1')}</li>
                    <li>• {t('features.booking.features.2')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center surface-accent-0 border border-theme-accent-2 backdrop-blur-sm hover:border-theme-accent-3 transition-colors">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-theme-accent-2 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-theme-accent" />
                  </div>
                  <CardTitle>{t('features.instant.title')}</CardTitle>
                  <CardDescription className="opacity-80">
                    {t('features.instant.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm opacity-70 space-y-2">
                    <li>• {t('features.instant.features.0')}</li>
                    <li>• {t('features.instant.features.1')}</li>
                    <li>• {t('features.instant.features.2')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center surface-neutral border border-theme-neutral-3 backdrop-blur-sm hover:border-theme-neutral-4 transition-colors">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-theme-neutral-2 rounded-lg flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-theme-neutral" />
                  </div>
                  <CardTitle>{t('features.wiki.title')}</CardTitle>
                  <CardDescription className="opacity-80">
                    {t('features.wiki.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm opacity-70 space-y-2">
                    <li>• {t('features.wiki.features.0')}</li>
                    <li>• {t('features.wiki.features.1')}</li>
                    <li>• {t('features.wiki.features.2')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center surface-primary-0 border border-theme-primary-2 backdrop-blur-sm hover:border-theme-primary-3 transition-colors">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-theme-primary-2 rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-theme-primary" />
                  </div>
                  <CardTitle>{t('features.platform.title')}</CardTitle>
                  <CardDescription className="opacity-80">
                    {t('features.platform.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm opacity-70 space-y-2">
                    <li>• {t('features.platform.features.0')}</li>
                    <li>• {t('features.platform.features.1')}</li>
                    <li>• {t('features.platform.features.2')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center surface-accent-0 border border-theme-accent-2 backdrop-blur-sm hover:border-theme-accent-3 transition-colors">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-theme-accent-2 rounded-lg flex items-center justify-center mb-4">
                    <Star className="h-6 w-6 text-theme-accent" />
                  </div>
                  <CardTitle>{t('features.review.title')}</CardTitle>
                  <CardDescription className="opacity-80">
                    {t('features.review.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm opacity-70 space-y-2">
                    <li>• {t('features.review.features.0')}</li>
                    <li>• {t('features.review.features.1')}</li>
                    <li>• {t('features.review.features.2')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center surface-neutral border border-theme-neutral-3 backdrop-blur-sm hover:border-theme-neutral-4 transition-colors">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-theme-neutral-2 rounded-lg flex items-center justify-center mb-4">
                    <Camera className="h-6 w-6 text-theme-neutral" />
                  </div>
                  <CardTitle>{t('features.professional.title')}</CardTitle>
                  <CardDescription className="opacity-80">
                    {t('features.professional.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm opacity-70 space-y-2">
                    <li>• {t('features.professional.features.0')}</li>
                    <li>• {t('features.professional.features.1')}</li>
                    <li>• {t('features.professional.features.2')}</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTAセクション */}
        <section className="py-24 surface-accent">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">
                {t('cta.title')}
              </h2>
              <p className="text-xl opacity-90">{t('cta.subtitle')}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <ThemeButton asChild size="lg" variant="primary">
                  <Link href="/auth/signup">{t('cta.getStarted')}</Link>
                </ThemeButton>
                <ThemeButton asChild size="lg" variant="secondary">
                  <Link href="/about">{t('cta.learnMore')}</Link>
                </ThemeButton>
              </div>
            </div>
          </div>
        </section>
      </PublicLayout>
    </div>
  );
}
