import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function PricingDisplay() {
  const pricingPlans = [
    {
      type: 'ポートレート',
      duration: '15分',
      price: '¥3,000',
      description: '個人撮影に最適',
      features: ['15分間の撮影', '10-15枚の写真', '基本的な編集込み'],
      popular: false,
    },
    {
      type: 'カップル',
      duration: '30分',
      price: '¥5,000',
      description: 'カップル・友人撮影',
      features: [
        '30分間の撮影',
        '20-30枚の写真',
        '複数ポーズ・アングル',
        '編集込み',
      ],
      popular: true,
    },
    {
      type: 'ファミリー',
      duration: '30分',
      price: '¥6,000',
      description: '家族・グループ撮影',
      features: [
        '30分間の撮影',
        '25-35枚の写真',
        '集合写真＋個別撮影',
        '編集込み',
      ],
      popular: false,
    },
  ];

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          明瞭な料金体系
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          プロによる撮影が、リーズナブルな価格で。
          追加料金は事前に明示され、安心してご利用いただけます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {pricingPlans.map(plan => (
          <Card
            key={plan.type}
            className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">人気</Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.type}</CardTitle>
              <div className="text-3xl font-bold text-blue-600 my-2">
                {plan.price}
              </div>
              <p className="text-sm text-gray-600">
                {plan.duration} • {plan.description}
              </p>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="bg-gray-50 rounded-lg p-6 max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">追加料金について</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <strong>緊急料金</strong>
              <br />
              30分以内: +¥1,000
            </div>
            <div>
              <strong>休日料金</strong>
              <br />
              土日祝日: +¥1,500
            </div>
            <div>
              <strong>夜間料金</strong>
              <br />
              18時以降: +¥2,000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
