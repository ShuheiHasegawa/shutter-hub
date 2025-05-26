import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

export function TestimonialCarousel() {
  const testimonials = [
    {
      name: '田中 美咲',
      location: '渋谷',
      rating: 5,
      comment:
        '旅行先で素敵な写真を撮ってもらえました！カメラマンさんもとても親切で、緊張せずに撮影できました。',
      type: 'カップル撮影',
    },
    {
      name: '佐藤 健太',
      location: '浅草',
      rating: 5,
      comment:
        '家族写真をお願いしましたが、子供たちも楽しそうに撮影していて、自然な表情を残してもらえました。',
      type: 'ファミリー撮影',
    },
    {
      name: 'Emily Johnson',
      location: '新宿',
      rating: 5,
      comment:
        '観光で東京に来た際に利用しました。英語での対応も問題なく、日本での思い出を素敵に残せました。',
      type: 'ポートレート撮影',
    },
  ];

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">お客様の声</h2>
        <p className="text-gray-600">
          実際にご利用いただいたお客様からのレビューです
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((testimonial, index) => (
          <Card key={index} className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {testimonial.type}
                </span>
              </div>

              <p className="text-gray-700 mb-4 italic">
                &ldquo;{testimonial.comment}&rdquo;
              </p>

              <div className="text-sm">
                <div className="font-medium">{testimonial.name}</div>
                <div className="text-gray-500">
                  {testimonial.location}で撮影
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">4.9</div>
            <div className="text-sm text-gray-600">平均評価</div>
            <div className="flex justify-center mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 text-yellow-400 fill-current"
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
            <div className="text-sm text-gray-600">リピート率</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              2,000+
            </div>
            <div className="text-sm text-gray-600">撮影実績</div>
          </div>
        </div>
      </div>
    </div>
  );
}
