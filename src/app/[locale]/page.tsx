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
            {/* ヒーローセクション */}
            <section className="relative surface-neutral">
              <div className="container py-24 md:py-32">
                <div className="max-w-3xl mx-auto text-center space-y-8">
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                    {t('hero.title')}
                    <br />
                    <span className="brand-primary">
                      {t('hero.titleHighlight')}
                    </span>
                  </h1>
                  <p className="text-xl md:text-2xl opacity-90">
                    {t('hero.subtitle')}
                    <br />
                    {t('hero.subtitleSecond')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" variant="accent">
                      <Link href="/photo-sessions">
                        {t('hero.findSessions')}
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="primary">
                      <Link href="/instant">{t('hero.requestInstant')}</Link>
                    </Button>
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
                  <Card className="text-center surface-accent">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 surface-neutral rounded-lg flex items-center justify-center mb-4">
                        <Calendar className="h-6 w-6" />
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

                  <Card className="text-center surface-accent">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 surface-neutral rounded-lg flex items-center justify-center mb-4">
                        <Zap className="h-6 w-6" />
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

                  <Card className="text-center surface-accent">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 surface-neutral rounded-lg flex items-center justify-center mb-4">
                        <MapPin className="h-6 w-6" />
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

                  <Card className="text-center surface-accent">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 surface-neutral rounded-lg flex items-center justify-center mb-4">
                        <Users className="h-6 w-6" />
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

                  <Card className="text-center surface-accent">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 surface-neutral rounded-lg flex items-center justify-center mb-4">
                        <Star className="h-6 w-6" />
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

                  <Card className="text-center surface-accent">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 surface-neutral rounded-lg flex items-center justify-center mb-4">
                        <Camera className="h-6 w-6" />
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
                    <Button asChild size="lg" variant="cta">
                      <Link href="/auth/signup">{t('cta.getStarted')}</Link>
                    </Button>
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
