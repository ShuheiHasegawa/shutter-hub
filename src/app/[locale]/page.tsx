'use client';

import { useTranslations } from 'next-intl';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Users,
  Zap,
  MapPin,
  Star,
  Calendar,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEffect, useState, useRef } from 'react';

export default function HomePage() {
  const t = useTranslations('home');
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0a]">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto scroll-smooth">
          <PublicHeader />
          <main>
            {/* ===== HERO ===== */}
            <section
              ref={heroRef}
              className="relative min-h-[100svh] flex flex-col justify-end pb-16 md:pb-24 overflow-hidden"
            >
              {/* 背景画像プレースホルダー（将来的に実画像に置換） */}
              <div className="absolute inset-0">
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url('/images/lp/hero-main.jpg')`,
                  }}
                />
                {/* オーバーレイ */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent" />
              </div>

              <div className="container relative z-10">
                <div className="max-w-4xl">
                  {/* 小さなラベル */}
                  <div
                    className={`mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    <span className="inline-block text-[11px] tracking-[0.3em] uppercase text-amber-500 font-medium">
                      Photography Platform
                    </span>
                  </div>

                  {/* メインタイトル - エディトリアルスタイル */}
                  <h1
                    className={`mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    <span
                      className="block text-[clamp(2.5rem,8vw,7rem)] font-serif font-normal text-white leading-[0.95] tracking-[-0.02em]"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                      }}
                    >
                      {t('hero.title')}
                    </span>
                    <span
                      className="block text-[clamp(2.5rem,8vw,7rem)] font-serif italic text-amber-400 leading-[0.95] tracking-[-0.02em] mt-1"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                      }}
                    >
                      {t('hero.titleHighlight')}
                    </span>
                  </h1>

                  {/* サブタイトル */}
                  <p
                    className={`text-lg md:text-xl text-white/70 leading-relaxed max-w-xl mb-10 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    {t('hero.subtitle')}
                  </p>

                  {/* CTAボタン - ミニマル */}
                  <div
                    className={`flex flex-wrap gap-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    <Button
                      asChild
                      className="h-12 px-8 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-none text-sm font-medium tracking-wide transition-all duration-200"
                    >
                      <Link href="/photo-sessions">
                        {t('hero.findSessions')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-12 px-8 bg-transparent text-white border-white/30 hover:bg-white/10 hover:border-white/50 rounded-none text-sm font-medium tracking-wide transition-all duration-200"
                    >
                      <Link href="/instant">{t('hero.requestInstant')}</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* スクロールヒント */}
              <div className="absolute bottom-8 right-8 hidden md:flex items-center gap-3 text-white/40 text-xs tracking-widest uppercase">
                <span>Scroll</span>
                <div className="w-px h-8 bg-white/20" />
              </div>
            </section>

            {/* ===== INTRO SECTION ===== */}
            <section className="py-24 md:py-32 bg-[#0a0a0a] border-t border-white/5">
              <div className="container">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
                  {/* 左カラム - テキスト */}
                  <div className="lg:col-span-5">
                    <span className="text-[11px] tracking-[0.3em] uppercase text-amber-500 font-medium">
                      About
                    </span>
                    <h2
                      className="mt-6 text-3xl md:text-4xl lg:text-5xl font-serif text-white leading-[1.1]"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                      }}
                    >
                      写真で残す、
                      <br />
                      <span className="italic text-white/60">
                        かけがえのない瞬間
                      </span>
                    </h2>
                  </div>

                  {/* 右カラム - 説明文 */}
                  <div className="lg:col-span-6 lg:col-start-7">
                    <p className="text-white/60 text-lg leading-relaxed mb-8">
                      ShutterHubは、プロフェッショナルなカメラマンと撮影機会を求める人々をつなぐプラットフォームです。撮影会の予約から、今すぐカメラマンを呼べる「即座撮影」まで。あなたの大切な瞬間を、最高のクオリティで残します。
                    </p>
                    <div className="flex gap-12">
                      <div>
                        <div
                          className="text-3xl md:text-4xl font-serif text-white"
                          style={{
                            fontFamily: 'var(--font-playfair-display), serif',
                          }}
                        >
                          1,000+
                        </div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mt-1">
                          Photographers
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-3xl md:text-4xl font-serif text-white"
                          style={{
                            fontFamily: 'var(--font-playfair-display), serif',
                          }}
                        >
                          50,000+
                        </div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mt-1">
                          Sessions
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-3xl md:text-4xl font-serif text-white"
                          style={{
                            fontFamily: 'var(--font-playfair-display), serif',
                          }}
                        >
                          4.9
                        </div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mt-1">
                          Rating
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== FEATURES - 非対称グリッド ===== */}
            <section className="py-24 md:py-32 bg-[#f5f4f0]">
              <div className="container">
                <div className="mb-16">
                  <span className="text-[11px] tracking-[0.3em] uppercase text-amber-600 font-medium">
                    Services
                  </span>
                  <h2
                    className="mt-4 text-3xl md:text-4xl font-serif text-[#0a0a0a]"
                    style={{
                      fontFamily: 'var(--font-playfair-display), serif',
                    }}
                  >
                    {t('features.title')}
                  </h2>
                </div>

                {/* 非対称レイアウト */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
                  {[
                    {
                      icon: Calendar,
                      titleKey: 'features.booking.title',
                      descKey: 'features.booking.description',
                      featuresKey: 'features.booking.features',
                    },
                    {
                      icon: Zap,
                      titleKey: 'features.instant.title',
                      descKey: 'features.instant.description',
                      featuresKey: 'features.instant.features',
                    },
                    {
                      icon: MapPin,
                      titleKey: 'features.wiki.title',
                      descKey: 'features.wiki.description',
                      featuresKey: 'features.wiki.features',
                    },
                    {
                      icon: Users,
                      titleKey: 'features.platform.title',
                      descKey: 'features.platform.description',
                      featuresKey: 'features.platform.features',
                    },
                    {
                      icon: Star,
                      titleKey: 'features.review.title',
                      descKey: 'features.review.description',
                      featuresKey: 'features.review.features',
                    },
                    {
                      icon: Camera,
                      titleKey: 'features.professional.title',
                      descKey: 'features.professional.description',
                      featuresKey: 'features.professional.features',
                    },
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="group bg-[#f5f4f0] p-8 md:p-10 transition-colors duration-300 hover:bg-white"
                    >
                      <feature.icon
                        className="w-6 h-6 text-[#0a0a0a]/40 mb-6"
                        strokeWidth={1.5}
                      />
                      <h3 className="text-lg font-medium text-[#0a0a0a] mb-3">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="text-[#0a0a0a]/60 text-sm leading-relaxed mb-6">
                        {t(feature.descKey)}
                      </p>
                      <ul className="space-y-2">
                        {[0, 1, 2].map(i => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-[#0a0a0a]/50"
                          >
                            <span className="w-1 h-1 rounded-full bg-amber-500 mt-2 shrink-0" />
                            {t(`${feature.featuresKey}.${i}`)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ===== SHOWCASE - 写真重視 ===== */}
            <section className="py-24 md:py-32 bg-[#0a0a0a]">
              <div className="container">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  {/* 左：ビジュアル */}
                  <div className="relative aspect-[4/5] bg-[#1a1a1a]">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url('/images/lp/showcase.jpg')`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />

                    {/* フローティングカード */}
                    <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-[#0a0a0a]">
                            次回の撮影を予約
                          </div>
                          <div className="text-xs text-[#0a0a0a]/50 mt-1">
                            1,000+のカメラマンが待っています
                          </div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-[#0a0a0a]" />
                      </div>
                    </div>
                  </div>

                  {/* 右：コンテンツ */}
                  <div>
                    <span className="text-[11px] tracking-[0.3em] uppercase text-amber-500 font-medium">
                      Experience
                    </span>
                    <h2
                      className="mt-6 text-3xl md:text-4xl lg:text-5xl font-serif text-white leading-[1.1] mb-8"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                      }}
                    >
                      プロの手で、
                      <br />
                      <span className="italic text-white/60">
                        特別な一枚を。
                      </span>
                    </h2>
                    <p className="text-white/60 leading-relaxed mb-10 max-w-md">
                      ポートレート、カップルフォト、家族写真、イベント撮影。どんなシーンでも、経験豊富なカメラマンが最高の瞬間を切り取ります。
                    </p>

                    <div className="space-y-6">
                      {[
                        {
                          label: '安心の料金システム',
                          desc: '明確な料金表示、追加料金なし',
                        },
                        {
                          label: '即日対応可能',
                          desc: '今すぐカメラマンを呼べる「即座撮影」',
                        },
                        {
                          label: '高品質な納品',
                          desc: 'プロ品質の編集済み写真データを受け取り',
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-8 h-px bg-amber-500 mt-3" />
                          <div>
                            <div className="text-white font-medium">
                              {item.label}
                            </div>
                            <div className="text-white/40 text-sm mt-1">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== CTA ===== */}
            <section className="relative py-32 md:py-40 overflow-hidden">
              {/* 背景 */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('/images/lp/cta-background.jpg')`,
                }}
              />
              <div className="absolute inset-0 bg-[#0a0a0a]/85" />

              <div className="container relative z-10">
                <div className="max-w-2xl mx-auto text-center">
                  <h2
                    className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-6"
                    style={{
                      fontFamily: 'var(--font-playfair-display), serif',
                    }}
                  >
                    {t('cta.title')}
                  </h2>
                  <p className="text-lg text-white/60 mb-10 leading-relaxed">
                    {t('cta.subtitle')}
                  </p>

                  <Button
                    asChild
                    className="h-14 px-10 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-none text-sm font-medium tracking-wide transition-all duration-200"
                  >
                    <Link href="/auth/signup">
                      {t('cta.getStarted')}
                      <ArrowRight className="w-4 h-4 ml-3" />
                    </Link>
                  </Button>

                  <p className="mt-6 text-xs text-white/40">
                    無料で始められます。クレジットカードは不要です。
                  </p>
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
