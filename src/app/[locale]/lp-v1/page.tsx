'use client';

import { useTranslations } from 'next-intl';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';

export default function LPVariant1() {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <PublicHeader />
      <main className="flex-1">
        <section className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-serif text-white mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-white/60">{t('hero.subtitle')}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
