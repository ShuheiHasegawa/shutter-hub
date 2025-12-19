'use client';

import { useTranslations } from 'next-intl';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Users, // Used in features
  Zap, // Used in features
  MapPin, // Used in features, hero visual
  Star, // Used in features, hero visual
  Calendar, // Used in features
  ArrowRight, // Used in hero CTA, horizontal card link, CTA section
  // ArrowUpRight, // Not used
  // Play, // Not used
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LPVariant2() {
  const t = useTranslations('home');
  const [mounted, setMounted] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const horizontalRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const magnetRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Magnetic button effect
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    magnetRefs.current.forEach(el => {
      if (!el) return;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(el, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.3,
          ease: 'power2.out',
        });
      };

      const handleMouseLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.3)',
        });
      };

      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('mouseleave', handleMouseLeave);
    });
  }, [mounted]);

  // GSAP Horizontal Scroll
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      const container = containerRef.current;
      const horizontal = horizontalRef.current;
      const cards = cardsRef.current;

      if (!container || !horizontal || !cards) return;

      // Hero animations
      if (heroRef.current) {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        tl.fromTo(
          '.hero-badge',
          { y: 40, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 1 }
        )
          .fromTo(
            '.hero-title-word',
            { y: 120, opacity: 0, rotateX: 45 },
            { y: 0, opacity: 1, rotateX: 0, duration: 1.4, stagger: 0.08 },
            '-=0.6'
          )
          .fromTo(
            '.hero-desc',
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 1 },
            '-=0.8'
          )
          .fromTo(
            '.hero-cta-btn',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 },
            '-=0.6'
          )
          .fromTo(
            '.hero-visual',
            { x: 100, opacity: 0, scale: 0.9 },
            { x: 0, opacity: 1, scale: 1, duration: 1.2 },
            '-=1'
          );
      }

      // Horizontal scroll section with pinning
      const cardElements = cards.querySelectorAll('.horizontal-card');
      const totalWidth = cards.scrollWidth - window.innerWidth;

      ScrollTrigger.create({
        trigger: horizontal,
        scroller: container,
        start: 'top top',
        end: () => `+=${totalWidth}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        onUpdate: self => {
          const progress = self.progress;
          const cardIndex = Math.floor(progress * cardElements.length);
          setActiveCard(Math.min(cardIndex, cardElements.length - 1));
        },
      });

      gsap.to(cards, {
        x: -totalWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: horizontal,
          scroller: container,
          start: 'top top',
          end: () => `+=${totalWidth}`,
          scrub: 1,
        },
      });

      // Card reveal animations
      cardElements.forEach((card, _i) => {
        // Changed 'i' to '_i'
        gsap.fromTo(
          card,
          { opacity: 0.5, scale: 0.95 },
          {
            opacity: 1,
            scale: 1,
            scrollTrigger: {
              trigger: card,
              scroller: container,
              containerAnimation: gsap.to(cards, { x: -totalWidth }),
              start: 'left 80%',
              end: 'left 20%',
              scrub: true,
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, [mounted]);

  const features = [
    {
      icon: Calendar,
      titleKey: 'features.booking.title',
      descKey: 'features.booking.description',
      color: '#f59e0b',
      image: '/images/lp/feature-booking.png',
    },
    {
      icon: Zap,
      titleKey: 'features.instant.title',
      descKey: 'features.instant.description',
      color: '#ef4444',
      image: '/images/lp/feature-instant.png',
    },
    {
      icon: MapPin,
      titleKey: 'features.wiki.title',
      descKey: 'features.wiki.description',
      color: '#10b981',
      image: '/images/lp/showcase.jpg',
    },
    {
      icon: Users,
      titleKey: 'features.platform.title',
      descKey: 'features.platform.description',
      color: '#3b82f6',
      image: '/images/lp/hero-main.jpg',
    },
    {
      icon: Star,
      titleKey: 'features.review.title',
      descKey: 'features.review.description',
      color: '#8b5cf6',
      image: '/images/lp/hero-secondary.jpg',
    },
    {
      icon: Camera,
      titleKey: 'features.professional.title',
      descKey: 'features.professional.description',
      color: '#ec4899',
      image: '/images/lp/cta-background.jpg',
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0a]">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div ref={containerRef} className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ===== HERO - Asymmetric Split ===== */}
            <section
              ref={heroRef}
              className="relative min-h-[100svh] flex items-center overflow-hidden"
            >
              {/* Background gradient mesh */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[#0a0a0a]" />
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: `
                      radial-gradient(ellipse 80% 50% at 70% 50%, rgba(251,191,36,0.15) 0%, transparent 50%),
                      radial-gradient(ellipse 60% 60% at 10% 90%, rgba(251,191,36,0.08) 0%, transparent 40%)
                    `,
                  }}
                />
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                  }}
                />
              </div>

              <div className="container relative z-10 py-20">
                <div className="grid lg:grid-cols-12 gap-12 items-center">
                  {/* Left content */}
                  <div className="lg:col-span-6 xl:col-span-5">
                    {/* Badge */}
                    <div className="hero-badge inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs tracking-widest uppercase text-white/70">
                        Photography Platform
                      </span>
                    </div>

                    {/* Title with word split */}
                    <h1
                      className="mb-8 overflow-hidden"
                      style={{ perspective: '1000px' }}
                    >
                      <div className="overflow-hidden">
                        <span
                          className="hero-title-word block text-[clamp(3rem,8vw,6.5rem)] font-serif font-normal text-white leading-[0.95] tracking-[-0.03em]"
                          style={{
                            fontFamily: 'var(--font-playfair-display), serif',
                          }}
                        >
                          {t('hero.title')}
                        </span>
                      </div>
                      <div className="overflow-hidden">
                        <span
                          className="hero-title-word block text-[clamp(3rem,8vw,6.5rem)] font-serif italic leading-[0.95] tracking-[-0.03em] mt-2"
                          style={{
                            fontFamily: 'var(--font-playfair-display), serif',
                            background:
                              'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {t('hero.titleHighlight')}
                        </span>
                      </div>
                    </h1>

                    <p className="hero-desc text-lg md:text-xl text-white/50 leading-relaxed max-w-lg mb-10">
                      {t('hero.subtitle')}
                    </p>

                    {/* CTA with magnetic effect */}
                    <div className="flex flex-wrap gap-4">
                      <Button
                        asChild
                        ref={el => {
                          if (el) magnetRefs.current[0] = el;
                        }}
                        className="hero-cta-btn group magnetic-btn h-16 px-10 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0a0a] hover:from-amber-300 hover:to-amber-400 rounded-full text-base font-semibold tracking-wide transition-all duration-300 shadow-lg shadow-amber-500/25"
                      >
                        <Link href="/photo-sessions">
                          {t('hero.findSessions')}
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        ref={el => {
                          if (el) magnetRefs.current[1] = el;
                        }}
                        variant="outline"
                        className="hero-cta-btn magnetic-btn h-16 px-10 bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/40 rounded-full text-base font-medium tracking-wide transition-all duration-300 backdrop-blur-sm"
                      >
                        <Link href="/instant">
                          {/* <Play className="w-4 h-4 mr-2 fill-current" /> */}{' '}
                          {/* Play icon removed as per instruction */}
                          {t('hero.requestInstant')}
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Right - Floating images */}
                  <div className="lg:col-span-6 xl:col-span-7 hero-visual relative h-[500px] hidden lg:block">
                    {/* Main image */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[420px] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 z-20">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url('/images/lp/showcase.jpg')`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    {/* Floating cards */}
                    <div className="absolute top-4 left-0 w-[180px] h-[240px] rounded-2xl overflow-hidden shadow-xl z-10 rotate-[-8deg]">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url('/images/lp/hero-main.jpg')`,
                        }}
                      />
                    </div>
                    <div className="absolute bottom-4 right-0 w-[200px] h-[260px] rounded-2xl overflow-hidden shadow-xl z-10 rotate-[6deg]">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url('/images/lp/hero-secondary.jpg')`,
                        }}
                      />
                    </div>

                    {/* Stats badge */}
                    <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 z-30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                          <Star className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">
                            4.9
                          </div>
                          <div className="text-xs text-white/50">
                            50K+ reviews
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== HORIZONTAL SCROLL FEATURES ===== */}
            <section
              ref={horizontalRef}
              className="relative min-h-screen bg-[#0a0a0a]"
            >
              {/* Progress indicators */}
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
                {features.map((_, i) => (
                  <button
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeCard === i
                        ? 'bg-amber-500 w-8'
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>

              {/* Section header */}
              <div className="absolute top-0 left-0 right-0 pt-8 px-8 z-30">
                <div className="container flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="w-12 h-px bg-amber-500" />
                    <span className="text-xs tracking-[0.3em] uppercase text-amber-500 font-semibold">
                      Services
                    </span>
                  </div>
                  <span className="text-sm text-white/30">
                    {String(activeCard + 1).padStart(2, '0')} /{' '}
                    {String(features.length).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Horizontal cards */}
              <div
                ref={cardsRef}
                className="flex items-center h-screen pl-[10vw]"
                style={{ width: `${features.length * 85 + 20}vw` }}
              >
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="horizontal-card flex-shrink-0 w-[80vw] md:w-[70vw] lg:w-[55vw] h-[70vh] mr-[5vw] relative"
                  >
                    <div className="absolute inset-0 rounded-[2rem] overflow-hidden group">
                      {/* Background image */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url('${feature.image}')` }}
                      />
                      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-500" />

                      {/* Gradient overlay */}
                      <div
                        className="absolute inset-0 opacity-60"
                        style={{
                          background: `linear-gradient(135deg, ${feature.color}33 0%, transparent 60%)`,
                        }}
                      />

                      {/* Content */}
                      <div className="relative h-full flex flex-col justify-end p-10 md:p-14">
                        {/* Icon */}
                        <div
                          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `${feature.color}20` }}
                        >
                          <feature.icon
                            className="w-10 h-10"
                            style={{ color: feature.color }}
                            strokeWidth={1.5}
                          />
                        </div>

                        <h3
                          className="text-4xl md:text-5xl font-serif text-white mb-4"
                          style={{
                            fontFamily: 'var(--font-playfair-display), serif',
                          }}
                        >
                          {t(feature.titleKey)}
                        </h3>
                        <p className="text-lg text-white/60 max-w-md leading-relaxed">
                          {t(feature.descKey)}
                        </p>

                        {/* Learn more link */}
                        <div className="mt-8 flex items-center gap-2 text-white/80 group-hover:text-amber-400 transition-colors">
                          <span className="text-sm font-medium">
                            詳細を見る
                          </span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>

                      {/* Card number */}
                      <div
                        className="absolute top-10 right-10 text-[8rem] font-serif font-bold leading-none opacity-10"
                        style={{
                          fontFamily: 'var(--font-playfair-display), serif',
                          color: feature.color,
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ===== SHOWCASE ===== */}
            <section className="py-32 md:py-48 bg-[#f8f7f4] overflow-hidden">
              <div className="container">
                <div className="grid lg:grid-cols-12 gap-16 items-center">
                  {/* Image */}
                  <div className="lg:col-span-7 relative">
                    <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url('/images/lp/showcase.jpg')`,
                        }}
                      />
                    </div>

                    {/* Badge */}
                    <div className="absolute -bottom-8 -right-8 lg:bottom-8 lg:-right-8 bg-gradient-to-br from-amber-400 to-amber-600 text-[#0a0a0a] p-8 rounded-2xl shadow-xl">
                      <div
                        className="text-4xl font-serif font-bold"
                        style={{
                          fontFamily: 'var(--font-playfair-display), serif',
                        }}
                      >
                        4.9
                      </div>
                      <div className="text-sm font-medium mt-1 opacity-80">
                        Average Rating
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:col-span-5">
                    <span className="inline-flex items-center gap-4 text-[11px] tracking-[0.4em] uppercase text-amber-600 font-semibold mb-8">
                      <span className="w-8 h-px bg-amber-600" />
                      Experience
                    </span>
                    <h2
                      className="text-4xl md:text-5xl font-serif text-[#0a0a0a] leading-[1.1] mb-8"
                      style={{
                        fontFamily: 'var(--font-playfair-display), serif',
                      }}
                    >
                      プロの手で、
                      <br />
                      <span className="italic text-[#0a0a0a]/50">
                        特別な一枚を。
                      </span>
                    </h2>
                    <p className="text-lg text-[#0a0a0a]/60 leading-relaxed mb-12">
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
                        <div key={i} className="flex items-start gap-4 group">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#0a0a0a] font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-[#0a0a0a] group-hover:text-amber-600 transition-colors">
                              {item.label}
                            </div>
                            <div className="text-sm text-[#0a0a0a]/50 mt-1">
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
            <section className="py-32 md:py-48 bg-[#0a0a0a] relative overflow-hidden">
              {/* Decorative elements */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `
                    radial-gradient(circle at 20% 50%, rgba(251,191,36,0.15) 0%, transparent 40%),
                    radial-gradient(circle at 80% 50%, rgba(251,191,36,0.1) 0%, transparent 40%)
                  `,
                }}
              />

              <div className="container relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                  <h2
                    className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-8"
                    style={{
                      fontFamily: 'var(--font-playfair-display), serif',
                    }}
                  >
                    {t('cta.title')}
                  </h2>
                  <p className="text-xl text-white/50 mb-14 leading-relaxed max-w-xl mx-auto">
                    {t('cta.subtitle')}
                  </p>

                  <Button
                    asChild
                    ref={el => {
                      if (el) magnetRefs.current[2] = el;
                    }}
                    className="magnetic-btn h-18 px-16 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0a0a] hover:from-amber-300 hover:to-amber-400 rounded-full text-lg font-bold tracking-wide transition-all duration-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105"
                  >
                    <Link href="/auth/signup">
                      {t('cta.getStarted')}
                      <ArrowRight className="w-5 h-5 ml-3" />
                    </Link>
                  </Button>

                  <p className="mt-8 text-sm text-white/30">
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
