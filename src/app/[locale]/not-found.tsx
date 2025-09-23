'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Camera } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '@/hooks/useAuth';

export default function NotFound() {
  const filmStripRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const filmStrip = filmStripRef.current;
    const content = contentRef.current;

    if (!filmStrip || !content) return;

    // 初期状態設定
    gsap.set(content, { opacity: 0, y: 20 });

    // フィルムストリップの無限スクロール
    const filmAnimation = gsap.to(filmStrip, {
      x: '-50%',
      duration: 30,
      ease: 'none',
      repeat: -1,
    });

    // ページロード時のアニメーション
    const tl = gsap.timeline();

    tl.to(content, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 0.3,
    });

    // ホバー時にフィルムストリップの速度を変更
    const handleMouseEnter = () => {
      gsap.to(filmAnimation, { timeScale: 0.1, duration: 0.8 });
    };

    const handleMouseLeave = () => {
      gsap.to(filmAnimation, { timeScale: 1, duration: 0.8 });
    };

    const filmStripElement = filmStrip;
    filmStripElement.addEventListener('mouseenter', handleMouseEnter);
    filmStripElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      filmAnimation.kill();
      tl.kill();
      filmStripElement.removeEventListener('mouseenter', handleMouseEnter);
      filmStripElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // フィルムフレームのデータ
  const filmFrames = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    isSpecialFrame: i === 3, // 404フレーム
    imageType: ['landscape', 'portrait', 'cityscape', 'nature'][i % 4],
  }));

  return (
    <div className="min-h-screen surface-neutral relative">
      {/* メインコンテンツエリア */}
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8" ref={contentRef}>
            <div className="text-center">
              <div className="mb-8">
                {/* 404の直上にフィルムストリップ */}
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    {/* フィルムストリップの影 */}
                    <div className="absolute inset-0 bg-black/30 blur-lg transform translate-y-1" />

                    {/* メインフィルムストリップ - 画像のような本格的デザイン */}
                    <div className="relative w-80 md:w-96 h-14 md:h-18 overflow-hidden bg-black rounded-sm">
                      {/* フィルムベースの質感 */}
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900">
                        {/* 上下のエッジラインを強調 */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gray-600" />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-600" />
                      </div>

                      {/* 上下のスプロケット穴（画像と同じ四角いグレー等間隔） */}
                      <div className="absolute top-0 left-0 right-0 h-2 md:h-3 flex">
                        {[...Array(24)].map((_, i) => (
                          <div
                            key={`top-${i}`}
                            className="flex-1 flex justify-center items-center"
                          >
                            <div className="w-2 h-1.5 md:w-3 md:h-2 bg-gray-600" />
                          </div>
                        ))}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 h-2 md:h-3 flex">
                        {[...Array(24)].map((_, i) => (
                          <div
                            key={`bottom-${i}`}
                            className="flex-1 flex justify-center items-center"
                          >
                            <div className="w-2 h-1.5 md:w-3 md:h-2 bg-gray-600" />
                          </div>
                        ))}
                      </div>

                      {/* 動くフィルムフレーム */}
                      <div
                        ref={filmStripRef}
                        className="film-strip flex absolute top-3 md:top-4 bottom-3 md:bottom-4 left-0"
                        style={{ width: '200%' }}
                      >
                        {/* フィルムストリップを2セット作成（無限ループ用） */}
                        {[...filmFrames, ...filmFrames].map((frame, index) => (
                          <div
                            key={`${frame.id}-${Math.floor(index / 8)}`}
                            className="film-frame relative flex-shrink-0 h-full"
                          >
                            {/* 個別フレーム */}
                            <div className="w-8 md:w-10 h-full relative mx-px">
                              {/* フレーム境界線 */}
                              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-700" />
                              <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-700" />

                              {/* 画像エリア */}
                              <div className="absolute inset-px bg-gray-300 overflow-hidden">
                                {frame.isSpecialFrame ? (
                                  // 404フレーム - ノイズ風エラー
                                  <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center relative">
                                    {/* エラーノイズ */}
                                    <div className="absolute inset-0 opacity-60">
                                      <div className="absolute top-0 left-0 w-full h-px bg-red-400" />
                                      <div className="absolute top-1 left-0 w-2 h-px bg-red-400" />
                                      <div className="absolute bottom-1 right-0 w-1 h-px bg-red-400" />
                                      <div className="absolute bottom-0 left-1 w-3 h-px bg-red-400" />
                                    </div>
                                    {/* ... 表示 */}
                                    <div className="text-center text-white">
                                      <div className="text-xs font-mono">
                                        ...
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // 通常フレーム - リアルな写真風
                                  <div className="w-full h-full relative">
                                    {/* よりリアルな写真風景 */}
                                    {frame.imageType === 'landscape' && (
                                      <div className="w-full h-full bg-gradient-to-b from-sky-400 via-green-400 to-green-600">
                                        {/* 雲 */}
                                        <div className="absolute top-0 left-1 w-2 h-1 bg-white/90 rounded-full" />
                                        <div className="absolute top-0 right-1 w-1 h-1 bg-white/80 rounded-full" />
                                        {/* 地平線 */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-800" />
                                      </div>
                                    )}
                                    {frame.imageType === 'portrait' && (
                                      <div className="w-full h-full bg-gradient-to-br from-rose-300 to-purple-500">
                                        {/* 人物シルエット */}
                                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-800/70 rounded-full" />
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-gray-800/70 rounded-t-full" />
                                      </div>
                                    )}
                                    {frame.imageType === 'cityscape' && (
                                      <div className="w-full h-full bg-gradient-to-t from-orange-400 via-yellow-400 to-blue-500">
                                        {/* ビル群 */}
                                        <div className="absolute bottom-0 left-0 w-1 h-2 bg-gray-900" />
                                        <div className="absolute bottom-0 left-2 w-1 h-3 bg-gray-900" />
                                        <div className="absolute bottom-0 right-1 w-1 h-2 bg-gray-900" />
                                        <div className="absolute bottom-0 right-3 w-1 h-1 bg-gray-900" />
                                      </div>
                                    )}
                                    {frame.imageType === 'nature' && (
                                      <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-700">
                                        {/* 木々 */}
                                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-green-900 rounded-t-full" />
                                        <div className="absolute bottom-0 right-1 w-1 h-1 bg-green-900 rounded-t-full" />
                                        {/* 太陽 */}
                                        <div className="absolute top-0 right-0 w-1 h-1 bg-yellow-300 rounded-full" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* フィルム表面の光沢効果 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/2 to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>

                <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold brand-primary mb-4">
                  404
                </h1>
                <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                  ページが見つかりません
                </h2>
                <p className="text-base md:text-lg leading-relaxed">
                  お探しのページは存在しないか、
                  <br className="hidden sm:inline" />
                  移動した可能性があります。
                </p>
              </div>

              <div className="space-y-4">
                <Button asChild variant="primary" className="w-full">
                  <Link href={user ? '/dashboard' : '/'}>
                    <Home className="h-4 w-4 mr-2" />
                    {user ? 'ダッシュボードに戻る' : 'ホームに戻る'}
                  </Link>
                </Button>

                <Button asChild variant="primary" className="w-full">
                  <Link href="/photo-sessions">
                    <Camera className="h-4 w-4 mr-2" />
                    撮影会を探す
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 背景の微細な装飾 */}
      <div className="absolute top-32 right-16 opacity-20">
        <div className="w-3 h-3 border border-muted rounded-full" />
      </div>
      <div className="absolute bottom-32 left-16 opacity-15">
        <div className="w-2 h-2 bg-muted/50 rounded-full" />
      </div>
    </div>
  );
}
