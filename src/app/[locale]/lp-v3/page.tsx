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
  Sparkles,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LPVariant3() {
  const t = useTranslations('home');
  const [mounted, setMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timelineRef = useRef<HTMLElement>(null);
  const showcaseRef = useRef<HTMLElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mouse tracking for 3D effects
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePosition({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mounted, handleMouseMove]);

  // Animated blob following cursor
  useEffect(() => {
    if (!mounted || !blobRef.current) return;

    gsap.to(blobRef.current, {
      x: mousePosition.x * window.innerWidth - 200,
      y: mousePosition.y * window.innerHeight - 200,
      duration: 1.5,
      ease: 'power2.out',
    });
  }, [mounted, mousePosition]);

  // GSAP Animations
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      const container = containerRef.current;
      if (!container) return;

      // Hero entrance animation
      if (heroRef.current && titleRef.current) {
        const chars = titleRef.current.querySelectorAll('.char');

        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        // Stagger character reveal
        tl.fromTo(
          '.hero-sparkle',
          { scale: 0, opacity: 0, rotation: -180 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.8 }
        )
          .fromTo(
            chars,
            { y: 150, opacity: 0, rotateX: 90 },
            { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.02 },
            '-=0.3'
          )
          .fromTo(
            '.hero-subtitle',
            { y: 50, opacity: 0, filter: 'blur(10px)' },
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1 },
            '-=0.6'
          )
          .fromTo(
            '.hero-cta',
            { y: 40, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1 },
            '-=0.4'
          )
          .fromTo(
            '.hero-stats',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
            '-=0.4'
          );
      }

      // Timeline section cards
      if (timelineRef.current) {
        const cards = timelineRef.current.querySelectorAll('.timeline-card');

        cards.forEach((card, i) => {
          const isLeft = i % 2 === 0;

          gsap.fromTo(
            card,
            {
              x: isLeft ? -100 : 100,
              opacity: 0,
              rotateY: isLeft ? 15 : -15,
            },
            {
              x: 0,
              opacity: 1,
              rotateY: 0,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                scroller: container,
                start: 'top 80%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        });

        // Timeline line animation
        gsap.fromTo(
          '.timeline-line',
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: timelineRef.current,
              scroller: container,
              start: 'top 50%',
              end: 'bottom 50%',
              scrub: true,
            },
          }
        );
      }

      // Showcase 3D tilt
      if (showcaseRef.current) {
        gsap.fromTo(
          '.showcase-3d',
          { rotateY: 30, rotateX: -15, opacity: 0, scale: 0.8 },
          {
            rotateY: 0,
            rotateX: 0,
            opacity: 1,
            scale: 1,
            duration: 1.5,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: showcaseRef.current,
              scroller: container,
              start: 'top 70%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, [mounted]);

  const features = [
    {
      icon: Calendar,
      titleKey: 'features.booking.title',
      descKey: 'features.booking.description',
      featuresKey: 'features.booking.features',
      color: '#f59e0b',
    },
    {
      icon: Zap,
      titleKey: 'features.instant.title',
      descKey: 'features.instant.description',
      featuresKey: 'features.instant.features',
      color: '#ef4444',
    },
    {
      icon: MapPin,
      titleKey: 'features.wiki.title',
      descKey: 'features.wiki.description',
      featuresKey: 'features.wiki.features',
      color: '#10b981',
    },
    {
      icon: Users,
      titleKey: 'features.platform.title',
      descKey: 'features.platform.description',
      featuresKey: 'features.platform.features',
      color: '#3b82f6',
    },
    {
      icon: Star,
      titleKey: 'features.review.title',
      descKey: 'features.review.description',
      featuresKey: 'features.review.features',
      color: '#8b5cf6',
    },
    {
      icon: Camera,
      titleKey: 'features.professional.title',
      descKey: 'features.professional.description',
      featuresKey: 'features.professional.features',
      color: '#ec4899',
    },
  ];

  // Split text into characters
  const splitText = (text: string) => {
    return text.split('').map((char, i) => (
      <span
        key={i}
        className="char inline-block"
        style={{ perspective: '1000px' }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#030303]">
      {/* Animated background blob */}
      <div
        ref={blobRef}
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none z-0 opacity-30 blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(251,191,36,0) 70%)',
        }}
      />

      <div className="flex-1 min-h-0 overflow-hidden relative z-10">
        <div ref={containerRef} className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ===== HERO - 3D Title ===== */}
            <section
              ref={heroRef}
              className="relative min-h-[100svh] flex items-center justify-center overflow-hidden"
            >
              {/* Animated mesh gradient */}
              <div
                className="absolute inset-0 transition-all duration-1000"
                style={{
                  background: `
                    radial-gradient(ellipse 100% 80% at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(251,191,36,0.12) 0%, transparent 50%),
                    radial-gradient(ellipse 60% 60% at ${100 - mousePosition.x * 50}% ${100 - mousePosition.y * 50}%, rgba(168,85,247,0.08) 0%, transparent 40%),
                    radial-gradient(ellipse 80% 40% at 50% 100%, rgba(251,191,36,0.05) 0%, transparent 40%)
                  `,
                }}
              />

              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                  `,
                  backgroundSize: '80px 80px',
                }}
              />

              <div className="container relative z-10 py-32">
                <div className="max-w-5xl mx-auto text-center">
                  {/* Badge */}
                  <div className="hero-sparkle inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/20 rounded-full mb-10">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">
                      Photography Platform
                    </span>
                  </div>

                  {/* 3D Title with character animation */}
                  <h1
                    ref={titleRef}
                    className="mb-10"
                    style={{
                      perspective: '2000px',
                      transform: `rotateY(${(mousePosition.x - 0.5) * 5}deg) rotateX(${(mousePosition.y - 0.5) * -5}deg)`,
                      transition: 'transform 0.3s ease-out',
                    }}
                  >
                    <div
                      className="text-[clamp(3.5rem,14vw,10rem)] font-serif font-bold leading-[0.85] tracking-[-0.04em] mb-4"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                      }}
                    >
                      <span className="text-white block">
                        {splitText(t('hero.title'))}
                      </span>
                    </div>
                    <div
                      className="text-[clamp(3.5rem,14vw,10rem)] font-serif italic font-bold leading-[0.85] tracking-[-0.04em]"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                        background:
                          'linear-gradient(135deg, #fcd34d 0%, #f59e0b 30%, #d97706 60%, #fbbf24 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 80px rgba(251,191,36,0.5)',
                      }}
                    >
                      {splitText(t('hero.titleHighlight'))}
                    </div>
                  </h1>

                  {/* Subtitle */}
                  <p className="hero-subtitle text-xl md:text-2xl text-white/40 leading-relaxed max-w-2xl mx-auto mb-14">
                    {t('hero.subtitle')}
                  </p>

                  {/* CTA Buttons with glow */}
                  <div className="flex flex-wrap justify-center gap-5 mb-16">
                    <Button
                      asChild
                      className="hero-cta group relative h-16 px-12 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0a0a] hover:from-amber-300 hover:to-amber-400 rounded-2xl text-base font-bold tracking-wide transition-all duration-500 overflow-hidden"
                      style={{
                        boxShadow:
                          '0 0 60px rgba(251,191,36,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                      }}
                    >
                      <Link href="/photo-sessions">
                        <span className="relative z-10 flex items-center">
                          {t('hero.findSessions')}
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Shine effect */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="hero-cta h-16 px-12 bg-white/[0.03] text-white border-2 border-white/20 hover:bg-white/10 hover:border-white/40 rounded-2xl text-base font-medium tracking-wide transition-all duration-500 backdrop-blur-sm"
                    >
                      <Link href="/instant">{t('hero.requestInstant')}</Link>
                    </Button>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap justify-center gap-12 md:gap-16">
                    {[
                      { value: '1,000+', label: 'Photographers' },
                      { value: '50,000+', label: 'Sessions' },
                      { value: '4.9', label: 'Rating' },
                    ].map((stat, i) => (
                      <div key={i} className="hero-stats text-center">
                        <div
                          className="text-3xl md:text-4xl font-serif text-white mb-1"
                          style={{
                            fontFamily: 'var(--font-playfair-display), serif',
                          }}
                        >
                          {stat.value}
                        </div>
                        <div className="text-xs text-white/30 uppercase tracking-widest">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ===== TIMELINE FEATURES ===== */}
            <section
              ref={timelineRef}
              className="py-32 md:py-48 relative overflow-hidden"
            >
              {/* Section header */}
              <div className="container text-center mb-24">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-amber-400 text-sm font-medium mb-8">
                  <Sparkles className="w-4 h-4" />
                  Services
                </span>
                <h2
                  className="text-4xl md:text-5xl lg:text-6xl font-serif text-white"
                  style={{ fontFamily: 'var(--font-playfair-display), serif' }}
                >
                  {t('features.title')}
                </h2>
              </div>

              {/* Timeline */}
              <div className="container relative">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden lg:block overflow-hidden">
                  <div
                    className="timeline-line w-full h-full origin-top"
                    style={{
                      background:
                        'linear-gradient(to bottom, transparent, rgba(251,191,36,0.5) 10%, rgba(251,191,36,0.5) 90%, transparent)',
                    }}
                  />
                </div>

                <div className="space-y-16 lg:space-y-0">
                  {features.map((feature, index) => {
                    const isLeft = index % 2 === 0;
                    const IconComponent = feature.icon;

                    return (
                      <div
                        key={index}
                        className={`timeline-card relative lg:grid lg:grid-cols-2 lg:gap-16 ${index > 0 ? 'lg:mt-[-100px]' : ''}`}
                        style={{ perspective: '1000px' }}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-1/2 top-10 -translate-x-1/2 z-20 hidden lg:flex items-center justify-center">
                          <div
                            className="w-5 h-5 rounded-full border-2 transition-all duration-500"
                            style={{
                              borderColor: feature.color,
                              backgroundColor: `${feature.color}40`,
                              boxShadow: `0 0 20px ${feature.color}60`,
                            }}
                          />
                        </div>

                        {/* Card */}
                        <div
                          className={`${isLeft ? 'lg:col-start-1 lg:pr-20' : 'lg:col-start-2 lg:pl-20'}`}
                        >
                          <div
                            className="group relative bg-gradient-to-b from-white/[0.06] to-transparent border border-white/10 rounded-3xl p-10 transition-all duration-500 hover:border-white/20"
                            style={{
                              transform: `perspective(1000px) rotateY(${(mousePosition.x - 0.5) * (isLeft ? 5 : -5)}deg) rotateX(${(mousePosition.y - 0.5) * -3}deg)`,
                              transition:
                                'transform 0.3s ease-out, border-color 0.5s',
                            }}
                          >
                            {/* Gradient glow */}
                            <div
                              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                              style={{
                                background: `radial-gradient(circle at ${isLeft ? '0%' : '100%'} 0%, ${feature.color}15 0%, transparent 50%)`,
                              }}
                            />

                            <div className="relative">
                              <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-300 group-hover:scale-110"
                                style={{
                                  backgroundColor: `${feature.color}15`,
                                }}
                              >
                                <IconComponent
                                  className="w-8 h-8"
                                  style={{ color: feature.color }}
                                  strokeWidth={1.5}
                                />
                              </div>

                              <h3 className="text-2xl font-semibold text-white mb-4">
                                {t(feature.titleKey)}
                              </h3>
                              <p className="text-white/40 leading-relaxed mb-8">
                                {t(feature.descKey)}
                              </p>

                              <ul className="space-y-3">
                                {[0, 1, 2].map(i => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-3 text-sm text-white/30"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                      style={{ backgroundColor: feature.color }}
                                    />
                                    {t(`${feature.featuresKey}.${i}`)}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Number */}
                            <div
                              className="absolute top-8 right-10 text-7xl font-serif font-bold opacity-5"
                              style={{
                                fontFamily:
                                  'var(--font-playfair-display), serif',
                              }}
                            >
                              {String(index + 1).padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ===== SHOWCASE - 3D Card ===== */}
            <section
              ref={showcaseRef}
              className="py-32 md:py-48 relative overflow-hidden"
            >
              {/* Gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(251,191,36,0.08) 0%, transparent 50%)',
                }}
              />

              <div className="container relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  {/* 3D Image */}
                  <div
                    className="showcase-3d relative max-w-lg mx-auto"
                    style={{
                      perspective: '2000px',
                      transform: `rotateY(${(mousePosition.x - 0.5) * 10}deg) rotateX(${(mousePosition.y - 0.5) * -5}deg)`,
                      transition: 'transform 0.3s ease-out',
                    }}
                  >
                    {/* Shadow layer */}
                    <div
                      className="absolute inset-8 rounded-3xl"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(251,191,36,0.3) 0%, transparent 70%)',
                        filter: 'blur(40px)',
                        transform: 'translateZ(-100px)',
                      }}
                    />

                    {/* Main image */}
                    <div
                      className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl"
                      style={{ transform: 'translateZ(0)' }}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url('/images/lp/showcase.jpg')`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent opacity-70" />
                    </div>

                    {/* Floating badge */}
                    <div
                      className="absolute -bottom-6 -right-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl"
                      style={{ transform: 'translateZ(80px)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                          <Star className="w-7 h-7 text-white fill-white" />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-white">
                            4.9
                          </div>
                          <div className="text-xs text-white/40">平均評価</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-amber-400 text-sm font-medium mb-10">
                      <Sparkles className="w-4 h-4" />
                      Experience
                    </span>
                    <h2
                      className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-10"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                      }}
                    >
                      プロの手で、
                      <br />
                      <span
                        className="italic"
                        style={{
                          background:
                            'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        特別な一枚を。
                      </span>
                    </h2>
                    <p className="text-lg text-white/40 leading-relaxed mb-12 max-w-md">
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
                        <div
                          key={i}
                          className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                        >
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 mt-2.5 shrink-0" />
                          <div>
                            <div className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                              {item.label}
                            </div>
                            <div className="text-white/30 text-sm mt-1">
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
            <section className="py-40 md:py-56 relative overflow-hidden">
              {/* Radial glow */}
              <div
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(ellipse 100% 100% at 50% 100%, rgba(251,191,36,0.15) 0%, transparent 50%),
                    radial-gradient(ellipse 60% 40% at 20% 50%, rgba(251,191,36,0.05) 0%, transparent 40%),
                    radial-gradient(ellipse 60% 40% at 80% 50%, rgba(168,85,247,0.03) 0%, transparent 40%)
                  `,
                }}
              />

              <div className="container relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                  <h2
                    className="text-5xl md:text-6xl lg:text-8xl font-serif text-white leading-[1] mb-10"
                    style={{
                      fontFamily: 'var(--font-playfair-display), serif',
                    }}
                  >
                    {t('cta.title')}
                  </h2>
                  <p className="text-xl md:text-2xl text-white/40 mb-16 leading-relaxed max-w-2xl mx-auto">
                    {t('cta.subtitle')}
                  </p>

                  <Button
                    asChild
                    className="group relative h-20 px-16 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0a0a] hover:from-amber-300 hover:to-amber-400 rounded-2xl text-lg font-bold tracking-wide transition-all duration-500 overflow-hidden"
                    style={{
                      boxShadow:
                        '0 0 80px rgba(251,191,36,0.5), inset 0 2px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    <Link href="/auth/signup">
                      <span className="relative z-10 flex items-center">
                        {t('cta.getStarted')}
                        <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                      </span>
                      {/* Shine effect */}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </Link>
                  </Button>

                  <p className="mt-10 text-sm text-white/25">
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
