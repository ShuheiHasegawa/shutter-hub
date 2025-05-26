'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Search, Camera, Download } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: <MapPin className="h-8 w-8 text-blue-600" />,
      title: '1. 位置情報を許可',
      description: '現在地を共有して、近くのカメラマンを検索します。',
    },
    {
      icon: <Search className="h-8 w-8 text-green-600" />,
      title: '2. 撮影を依頼',
      description: '撮影タイプ、予算、緊急度を選択してリクエストを送信。',
    },
    {
      icon: <Camera className="h-8 w-8 text-purple-600" />,
      title: '3. 撮影実施',
      description: 'マッチしたカメラマンが現地で撮影を行います。',
    },
    {
      icon: <Download className="h-8 w-8 text-orange-600" />,
      title: '4. 写真受け取り',
      description: '編集済みの高品質な写真を2時間以内にお届け。',
    },
  ];

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          使い方はとても簡単
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          たった4ステップで、プロの撮影サービスをご利用いただけます。
          アカウント登録は不要で、今すぐ始められます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <Card
            key={index}
            className="text-center hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex justify-center mb-4">{step.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-700 font-medium">
            平均マッチング時間: 5分以内
          </span>
        </div>
      </div>
    </div>
  );
}
