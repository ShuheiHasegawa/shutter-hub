'use client';

import { useState } from 'react';
import { Building2, Camera, User, CalendarIcon, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyImage } from '@/components/ui/empty-image';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function EmptyImageDemoPage() {
  const [selectedIcon, setSelectedIcon] = useState<
    'Building2' | 'Camera' | 'User' | 'CalendarIcon' | 'Image'
  >('Building2');
  const [selectedSize, setSelectedSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(
    'md'
  );
  const [hasImage, setHasImage] = useState(false);

  const iconMap = {
    Building2,
    Camera,
    User,
    CalendarIcon,
    Image,
  };

  const Icon = iconMap[selectedIcon];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">EmptyImage デモ</h1>
        <p className="text-muted-foreground">
          画像フォールバック表示のバリエーションを確認できます
        </p>
      </div>

      {/* コントロール */}
      <Card>
        <CardHeader>
          <CardTitle>設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>アイコン</Label>
            <RadioGroup
              value={selectedIcon}
              onValueChange={value =>
                setSelectedIcon(
                  value as
                    | 'Building2'
                    | 'Camera'
                    | 'User'
                    | 'CalendarIcon'
                    | 'Image'
                )
              }
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Building2" id="icon-building2" />
                <Label htmlFor="icon-building2">Building2（スタジオ）</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Camera" id="icon-camera" />
                <Label htmlFor="icon-camera">Camera（撮影会）</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="User" id="icon-user" />
                <Label htmlFor="icon-user">User（ユーザー）</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CalendarIcon" id="icon-calendar" />
                <Label htmlFor="icon-calendar">CalendarIcon（撮影会）</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Image" id="icon-image" />
                <Label htmlFor="icon-image">Image（汎用）</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>アイコンサイズ</Label>
            <RadioGroup
              value={selectedSize}
              onValueChange={value =>
                setSelectedSize(value as 'sm' | 'md' | 'lg' | 'xl')
              }
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sm" id="size-sm" />
                <Label htmlFor="size-sm">Small (h-8 w-8)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="md" id="size-md" />
                <Label htmlFor="size-md">Medium (h-12 w-12)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lg" id="size-lg" />
                <Label htmlFor="size-lg">Large (h-16 w-16)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xl" id="size-xl" />
                <Label htmlFor="size-xl">Extra Large (h-24 w-24)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>画像の有無</Label>
            <RadioGroup
              value={hasImage ? 'true' : 'false'}
              onValueChange={value => setHasImage(value === 'true')}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="no-image" />
                <Label htmlFor="no-image">画像なし（フォールバック表示）</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="has-image" />
                <Label htmlFor="has-image">画像あり</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* プレビュー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* fillプロパティ使用 */}
        <Card>
          <CardHeader>
            <CardTitle>fillプロパティ（アスペクト比4:3）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] relative rounded-lg overflow-hidden">
              <EmptyImage
                src={hasImage ? '/images/sample.png' : undefined}
                alt="デモ画像"
                fallbackIcon={Icon}
                fallbackIconSize={selectedSize}
                fill
                className="object-cover"
              />
            </div>
          </CardContent>
        </Card>

        {/* width/height指定 */}
        <Card>
          <CardHeader>
            <CardTitle>width/height指定（400x300）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <EmptyImage
                src={hasImage ? '/images/sample.png' : undefined}
                alt="デモ画像"
                fallbackIcon={Icon}
                fallbackIconSize={selectedSize}
                width={400}
                height={300}
                className="rounded-lg object-cover"
              />
            </div>
          </CardContent>
        </Card>

        {/* 小さいサイズ（アバター風） */}
        <Card>
          <CardHeader>
            <CardTitle>小さいサイズ（80x80、丸型）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <EmptyImage
                src={hasImage ? '/images/sample.png' : undefined}
                alt="デモ画像"
                fallbackIcon={User}
                fallbackIconSize="sm"
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 使用例 */}
      <Card>
        <CardHeader>
          <CardTitle>使用例</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">スタジオカード</h3>
            <div className="aspect-video relative rounded-lg overflow-hidden">
              <EmptyImage
                src={undefined}
                alt="スタジオ名"
                fallbackIcon={Building2}
                fallbackIconSize="lg"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">撮影会カード</h3>
            <div className="aspect-video relative rounded-lg overflow-hidden">
              <EmptyImage
                src={undefined}
                alt="撮影会タイトル"
                fallbackIcon={Camera}
                fallbackIconSize="lg"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">ユーザーアバター</h3>
            <div className="flex gap-4">
              <EmptyImage
                src={undefined}
                alt="ユーザー名"
                fallbackIcon={User}
                fallbackIconSize="sm"
                width={40}
                height={40}
                className="rounded-full"
              />
              <EmptyImage
                src={undefined}
                alt="ユーザー名"
                fallbackIcon={User}
                fallbackIconSize="md"
                width={80}
                height={80}
                className="rounded-full"
              />
              <EmptyImage
                src={undefined}
                alt="ユーザー名"
                fallbackIcon={User}
                fallbackIconSize="lg"
                width={120}
                height={120}
                className="rounded-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
