import { useTranslations } from 'next-intl';
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
import { Link } from '@/i18n/routing';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <MainLayout>
      {/* ヒーローセクション */}
      <section className="relative bg-gradient-to-br from-shutter-primary to-shutter-primary-dark text-white">
        <div className="container py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              {t('hero.title')}
              <br />
              <span className="text-shutter-warning">
                {t('hero.titleHighlight')}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              {t('hero.subtitle')}
              <br />
              {t('hero.subtitleSecond')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-shutter-primary hover:bg-white/90"
              >
                <Link href="/photo-sessions">{t('hero.findSessions')}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-shutter-primary"
              >
                <Link href="/instant">{t('hero.requestInstant')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-24">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              {t('features.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-shutter-primary" />
                </div>
                <CardTitle>{t('features.booking.title')}</CardTitle>
                <CardDescription>
                  {t('features.booking.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• {t('features.booking.features.0')}</li>
                  <li>• {t('features.booking.features.1')}</li>
                  <li>• {t('features.booking.features.2')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-shutter-accent" />
                </div>
                <CardTitle>{t('features.instant.title')}</CardTitle>
                <CardDescription>
                  {t('features.instant.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• {t('features.instant.features.0')}</li>
                  <li>• {t('features.instant.features.1')}</li>
                  <li>• {t('features.instant.features.2')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-info/10 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-shutter-info" />
                </div>
                <CardTitle>{t('features.wiki.title')}</CardTitle>
                <CardDescription>
                  {t('features.wiki.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• {t('features.wiki.features.0')}</li>
                  <li>• {t('features.wiki.features.1')}</li>
                  <li>• {t('features.wiki.features.2')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-success/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-shutter-success" />
                </div>
                <CardTitle>{t('features.platform.title')}</CardTitle>
                <CardDescription>
                  {t('features.platform.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• {t('features.platform.features.0')}</li>
                  <li>• {t('features.platform.features.1')}</li>
                  <li>• {t('features.platform.features.2')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-warning/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-shutter-warning" />
                </div>
                <CardTitle>{t('features.review.title')}</CardTitle>
                <CardDescription>
                  {t('features.review.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• {t('features.review.features.0')}</li>
                  <li>• {t('features.review.features.1')}</li>
                  <li>• {t('features.review.features.2')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-shutter-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-shutter-primary" />
                </div>
                <CardTitle>{t('features.professional.title')}</CardTitle>
                <CardDescription>
                  {t('features.professional.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
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
      <section className="py-24 bg-muted">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">{t('cta.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('cta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/signup">{t('cta.getStarted')}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">{t('cta.learnMore')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
