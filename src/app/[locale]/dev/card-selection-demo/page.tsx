'use client';

import { useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  SelectableCardGroup,
  SelectableCardItem,
} from '@/components/ui/selectable-card';
import { Clock, Shuffle, UserCheck, Star, Info, Check } from 'lucide-react';
import type { BookingType } from '@/types/database';

const bookingTypes = [
  {
    value: 'first_come' as BookingType,
    title: '先着順',
    description: '予約開始と同時に先着順で予約を受け付けます',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    features: [
      '予約開始時刻に同時に予約可能',
      '早い者勝ちのシンプルな方式',
      '即座に予約確定',
    ],
  },
  {
    value: 'lottery' as BookingType,
    title: '抽選予約',
    description: '応募期間中に応募を受け付け、抽選で当選者を決定します',
    icon: Shuffle,
    color: 'bg-success/10 text-success border-success/30',
    features: [
      '応募期間中に応募可能',
      '抽選で公平に当選者を決定',
      '当選通知で予約確定',
    ],
  },
  {
    value: 'admin_lottery' as BookingType,
    title: '管理抽選',
    description: '応募を受け付け、運営が手動で当選者を選定します',
    icon: UserCheck,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    features: [
      '応募期間中に応募可能',
      '運営が手動で選定',
      '選定後に通知で予約確定',
    ],
  },
  {
    value: 'priority' as BookingType,
    title: '優先予約',
    description: 'ランクやチケットに応じて優先的に予約できます',
    icon: Star,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    features: [
      'ランクに応じた優先度設定',
      'チケット保有者は優先予約',
      '一般枠も同時に開放',
    ],
  },
];

export default function CardSelectionDemoPage() {
  const [variantA, setVariantA] = useState<BookingType>('first_come');
  const [variantB, setVariantB] = useState<BookingType>('first_come');
  const [variantC, setVariantC] = useState<BookingType>('first_come');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DevToolsNavigation />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ヘッダーセクション */}
            <section className="py-16 surface-primary">
              <div className="container">
                <div className="text-center space-y-4 mb-8">
                  <h1 className="text-4xl md:text-5xl font-bold">
                    カード選択UIプロトタイプ
                  </h1>
                  <p className="text-xl opacity-80 max-w-2xl mx-auto">
                    予約方式選択のUI改善案を3つのバリエーションで比較
                  </p>
                </div>
              </div>
            </section>

            {/* バリエーション A: オーバーレイ + 中央チェック */}
            <section className="py-12 bg-background">
              <div className="container">
                <div className="max-w-6xl mx-auto">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                      バリエーション A: オーバーレイ + 中央チェック
                    </h2>
                    <p className="text-muted-foreground">
                      選択時にカード全体に半透明のオーバーレイを表示し、中央に大きなチェックマークを表示します。
                    </p>
                  </div>

                  <SelectableCardGroup
                    value={variantA}
                    onValueChange={value => setVariantA(value as BookingType)}
                  >
                    {bookingTypes.map(type => (
                      <SelectableCardItem
                        key={type.value}
                        value={type.value}
                        icon={type.icon}
                        iconColor={type.color}
                        title={type.title}
                        description={type.description}
                        features={type.features}
                      />
                    ))}
                  </SelectableCardGroup>
                </div>
              </div>
            </section>

            {/* バリエーション B: 右上チェックバッジ + 暗いボーダー */}
            <section className="py-12 bg-muted/30">
              <div className="container">
                <div className="max-w-6xl mx-auto">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                      バリエーション B: 右上チェックバッジ + 暗いボーダー
                    </h2>
                    <p className="text-muted-foreground">
                      選択時にカードを暗くし、右上に大きなチェックバッジを表示します。
                    </p>
                  </div>

                  <RadioGroup
                    value={variantB}
                    onValueChange={value => setVariantB(value as BookingType)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {bookingTypes.map(type => {
                      const Icon = type.icon;
                      const isSelected = variantB === type.value;

                      return (
                        <div key={type.value} className="relative">
                          <RadioGroupItem
                            value={type.value}
                            id={`variant-b-${type.value}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`variant-b-${type.value}`}
                            className="block cursor-pointer transition-all duration-200"
                          >
                            <Card
                              className={`
                                relative transition-all duration-200 
                                hover:shadow-lg hover:-translate-y-0.5
                                active:scale-[0.98] active:shadow-sm
                                ${
                                  isSelected
                                    ? 'ring-2 ring-primary shadow-md bg-muted/50'
                                    : ''
                                }
                              `}
                            >
                              {/* 右上チェックバッジ */}
                              {isSelected && (
                                <div className="absolute top-4 right-4 z-10 animate-in zoom-in-50 duration-300">
                                  <div className="rounded-full bg-primary p-2 shadow-lg">
                                    <Check className="h-8 w-8 text-primary-foreground" />
                                  </div>
                                </div>
                              )}

                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`p-2 rounded-lg ${type.color}`}
                                    >
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <CardTitle
                                        className={`text-base transition-colors ${
                                          isSelected
                                            ? 'text-muted-foreground'
                                            : ''
                                        }`}
                                      >
                                        {type.title}
                                      </CardTitle>
                                      <p
                                        className={`text-sm mt-1 transition-colors ${
                                          isSelected
                                            ? 'text-muted-foreground/80'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {type.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  {type.features.map((feature, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start gap-2"
                                    >
                                      <Info
                                        className={`h-4 w-4 mt-0.5 flex-shrink-0 transition-colors ${
                                          isSelected
                                            ? 'text-muted-foreground/60'
                                            : 'text-muted-foreground'
                                        }`}
                                      />
                                      <span
                                        className={`text-sm transition-colors ${
                                          isSelected
                                            ? 'text-muted-foreground/70'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              </div>
            </section>

            {/* バリエーション C: コーナーチェック + グラデーション */}
            <section className="py-12 bg-background">
              <div className="container">
                <div className="max-w-6xl mx-auto">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                      バリエーション C: コーナーチェック + グラデーション
                    </h2>
                    <p className="text-muted-foreground">
                      選択時にグラデーションオーバーレイを表示し、右上コーナーにチェックマークを表示します。
                    </p>
                  </div>

                  <RadioGroup
                    value={variantC}
                    onValueChange={value => setVariantC(value as BookingType)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {bookingTypes.map(type => {
                      const Icon = type.icon;
                      const isSelected = variantC === type.value;

                      return (
                        <div key={type.value} className="relative">
                          <RadioGroupItem
                            value={type.value}
                            id={`variant-c-${type.value}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`variant-c-${type.value}`}
                            className="block cursor-pointer transition-all duration-200"
                          >
                            <Card
                              className={`
                                relative transition-all duration-200 overflow-hidden
                                hover:shadow-lg hover:-translate-y-0.5
                                active:scale-[0.98] active:shadow-sm
                                ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}
                              `}
                            >
                              {/* グラデーションオーバーレイ */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent z-10 animate-in fade-in duration-300" />
                              )}

                              {/* 右上コーナーチェック */}
                              {isSelected && (
                                <div className="absolute top-0 right-0 z-20 animate-in zoom-in-50 duration-300">
                                  <div className="relative">
                                    <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-primary" />
                                    <Check className="absolute top-1 right-1 h-5 w-5 text-primary-foreground" />
                                  </div>
                                </div>
                              )}

                              <CardHeader className="pb-3 relative z-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`p-2 rounded-lg ${type.color}`}
                                    >
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-base">
                                        {type.title}
                                      </CardTitle>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {type.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 relative z-0">
                                <div className="space-y-2">
                                  {type.features.map((feature, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start gap-2"
                                    >
                                      <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <span className="text-sm text-muted-foreground">
                                        {feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              </div>
            </section>

            {/* 比較セクション */}
            <section className="py-12 bg-muted/30">
              <div className="container">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-6 text-center">
                    各バリエーションの特徴
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-background p-6 rounded-lg border">
                      <h3 className="font-semibold mb-2">バリエーション A</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 中央チェックで明確</li>
                        <li>• オーバーレイで選択状態を強調</li>
                        <li>• シンプルで分かりやすい</li>
                      </ul>
                    </div>
                    <div className="bg-background p-6 rounded-lg border">
                      <h3 className="font-semibold mb-2">バリエーション B</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 右上バッジで視認性が高い</li>
                        <li>• カードを暗くして選択状態を表現</li>
                        <li>• コンテンツを邪魔しない</li>
                      </ul>
                    </div>
                    <div className="bg-background p-6 rounded-lg border">
                      <h3 className="font-semibold mb-2">バリエーション C</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• グラデーションで上品な印象</li>
                        <li>• コーナーチェックで洗練されたデザイン</li>
                        <li>• コンテンツの可読性を維持</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Footer />
          </main>
        </div>
      </div>
    </div>
  );
}
