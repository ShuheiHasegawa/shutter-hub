'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Camera, Star } from 'lucide-react';

export function PricingDisplay() {
  const pricingPlans = [
    {
      type: 'ポートレート',
      duration: '15分',
      price: '¥3,000',
      description: '個人撮影に最適',
      features: ['5-10枚の編集済み写真', '基本的なレタッチ', '2時間以内配信'],
      icon: <Camera className="h-6 w-6 text-blue-600" />,
      popular: false,
    },
    {
      type: 'カップル・友人',
      duration: '30分',
      price: '¥5,000',
      description: '2-3名での撮影',
      features: ['10-15枚の編集済み写真', 'プロレタッチ', '複数ポーズ対応'],
      icon: <Users className="h-6 w-6 text-green-600" />,
      popular: true,
    },
    {
      type: 'ファミリー・グループ',
      duration: '60分',
      price: '¥8,000',
      description: '4名以上のグループ撮影',
      features: ['20-30枚の編集済み写真', '高品質レタッチ', '複数シーン撮影'],
      icon: <Star className="h-6 w-6 text-purple-600" />,
      popular: false,
    },
  ];

  const additionalFees = [
    { condition: '今すぐ撮影', fee: '+¥2,000', icon: '⚡' },
    { condition: '30分以内', fee: '+¥1,000', icon: '🕐' },
    { condition: '休日料金', fee: '+¥1,500', icon: '📅' },
    { condition: '夜間料金（18時以降）', fee: '+¥2,000', icon: '🌙' },
  ];

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          明確で分かりやすい料金体系
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          追加料金なし（緊急時除く）の明確な料金設定。
          プロ品質の写真を手頃な価格でお届けします。
        </p>
      </div>

      {/* 基本料金プラン */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {pricingPlans.map((plan, index) => (
          <Card
            key={index}
            className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">人気</Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">{plan.icon}</div>
              <CardTitle className="text-xl">{plan.type}</CardTitle>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{plan.duration}</span>
              </div>
            </CardHeader>

            <CardContent className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {plan.price}
                <span className="text-sm font-normal text-gray-500">〜</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

              <ul className="space-y-2 text-sm text-gray-600">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center justify-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 追加料金 */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-center">追加料金について</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {additionalFees.map((fee, index) => (
              <div key={index} className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl mb-2">{fee.icon}</div>
                <div className="text-sm font-medium text-gray-900">
                  {fee.condition}
                </div>
                <div className="text-sm text-orange-600 font-semibold">
                  {fee.fee}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ※ 基本料金に追加される場合があります。事前に総額をお知らせします。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 特典 */}
      <div className="mt-12 text-center">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ゲスト特典
            </h3>
            <p className="text-gray-700 mb-4">
              アカウント登録不要で、月3回まで無料でご利用いただけます
            </p>
            <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>登録不要</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>月3回まで無料</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>即日利用可能</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
