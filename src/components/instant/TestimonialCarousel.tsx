'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      name: '田中 美咲',
      location: '渋谷',
      rating: 5,
      comment:
        '旅行先で急に撮影をお願いしたのですが、5分で素敵なカメラマンさんが見つかりました！写真も期待以上の仕上がりで大満足です。',
      type: 'カップル撮影',
      avatar: '👩',
    },
    {
      name: '佐藤 健太',
      location: '浅草',
      rating: 5,
      comment:
        'インスタ用の写真が欲しくて利用しました。プロの技術で撮影してもらった写真は、いいねがいつもの3倍つきました！',
      type: 'ポートレート',
      avatar: '👨',
    },
    {
      name: '山田 家族',
      location: '上野',
      rating: 5,
      comment:
        '家族旅行の記念写真をお願いしました。子供たちも楽しそうに撮影に参加でき、素敵な思い出になりました。',
      type: 'ファミリー撮影',
      avatar: '👨‍👩‍👧‍👦',
    },
    {
      name: 'Emily Johnson',
      location: '新宿',
      rating: 5,
      comment:
        '日本旅行中に利用しました。英語でのコミュニケーションも問題なく、東京の美しい写真をたくさん撮ってもらえました！',
      type: '観光撮影',
      avatar: '👩‍🦱',
    },
    {
      name: '鈴木 友美',
      location: '六本木',
      rating: 5,
      comment:
        '友達の誕生日サプライズで利用。夜景をバックにした写真が本当に綺麗で、友達も大喜びでした！',
      type: 'グループ撮影',
      avatar: '👭',
    },
  ];

  // 自動スライド
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prevIndex =>
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  const goToPrevious = () => {
    setCurrentIndex(
      currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(
      currentIndex === testimonials.length - 1 ? 0 : currentIndex + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">お客様の声</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          実際にご利用いただいたお客様から、たくさんの嬉しいお声をいただいています。
        </p>
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* メインカルーセル */}
        <div className="overflow-hidden rounded-lg">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {testimonials.map((testimonial, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <Card className="mx-2 bg-white shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-2xl">
                          {testimonial.avatar}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">
                            {testimonial.name}
                          </h4>
                          <span className="text-sm text-gray-500">
                            • {testimonial.location}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star
                                key={i}
                                className="h-4 w-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                          <span className="text-sm text-blue-600 font-medium">
                            {testimonial.type}
                          </span>
                        </div>

                        <div className="relative">
                          <Quote className="absolute -top-2 -left-2 h-6 w-6 text-blue-200" />
                          <p className="text-gray-700 leading-relaxed pl-4">
                            {testimonial.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* ナビゲーションボタン */}
        <Button
          variant="outline"
          size="sm"
          className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 rounded-full w-10 h-10 p-0"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 rounded-full w-10 h-10 p-0"
          onClick={goToNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* インジケーター */}
        <div className="flex justify-center mt-6 gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* 統計情報 */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div>
          <div className="text-3xl font-bold text-blue-600 mb-2">4.9/5</div>
          <div className="text-gray-600">平均評価</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-green-600 mb-2">1,200+</div>
          <div className="text-gray-600">満足したお客様</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
          <div className="text-gray-600">リピート率</div>
        </div>
      </div>
    </div>
  );
}
