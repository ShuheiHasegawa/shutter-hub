'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// SSRエラー回避のため動的インポート
const MapPicker = dynamic(
  () =>
    import('@/components/ui/map-picker').then(mod => ({
      default: mod.MapPicker,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        地図を読み込み中...
      </div>
    ),
  }
);
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MapTestPage() {
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const testAddresses = [
    '東京都渋谷区渋谷1-1-1',
    '大阪府大阪市北区梅田1-1-1',
    '神奈川県横浜市中区山下町',
    '愛知県名古屋市中村区名駅',
    '福岡県福岡市博多区博多駅前',
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">地図コンポーネントテスト</h1>

        {/* 機能概要 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>🗾 MapPicker 機能一覧</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              ✅ <strong>Leaflet + OpenStreetMap</strong> - フリーの地図API
            </p>
            <p>
              ✅ <strong>住所入力 → ピン配置</strong> -
              住所を検索してマーカー表示
            </p>
            <p>
              ✅ <strong>地図クリック → 住所自動入力</strong> -
              地図上をクリックして住所取得
            </p>
            <p>
              ✅ <strong>日本語住所対応</strong> - Nominatim API
              で日本語逆ジオコーディング
            </p>
            <p>
              ✅ <strong>レスポンシブ対応</strong> -
              モバイル・デスクトップ両対応
            </p>
            <p>
              ✅ <strong>エラーハンドリング</strong> -
              適切なエラーメッセージ表示
            </p>
          </CardContent>
        </Card>

        {/* 地図コンポーネント */}
        <Card>
          <CardHeader>
            <CardTitle>地図インタラクション</CardTitle>
          </CardHeader>
          <CardContent>
            <MapPicker
              address={address}
              onAddressChange={setAddress}
              onCoordinatesChange={(lat, lng) => setCoordinates({ lat, lng })}
              height="400px"
            />
          </CardContent>
        </Card>

        {/* テスト用住所ボタン */}
        <Card>
          <CardHeader>
            <CardTitle>テスト用住所</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {testAddresses.map((testAddress, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setAddress(testAddress)}
                  className="text-left justify-start"
                >
                  {testAddress}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 現在の値表示 */}
        <Card>
          <CardHeader>
            <CardTitle>現在の値</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>住所:</strong>
              <p className="mt-1 p-2 bg-gray-100 rounded text-sm">
                {address || '未設定'}
              </p>
            </div>
            <div>
              <strong>座標:</strong>
              <p className="mt-1 p-2 bg-gray-100 rounded text-sm">
                {coordinates
                  ? `緯度: ${coordinates.lat.toFixed(6)}, 経度: ${coordinates.lng.toFixed(6)}`
                  : '未設定'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 使用方法 */}
        <Card>
          <CardHeader>
            <CardTitle>🔧 使用方法</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">1. 住所から座標を取得</h3>
              <p className="text-sm text-gray-600">
                上記の「テスト用住所」ボタンをクリック、または住所フィールドに直接入力して検索ボタンを押してください。
              </p>
            </div>
            <div>
              <h3 className="font-semibold">2. 地図クリックで住所を取得</h3>
              <p className="text-sm text-gray-600">
                地図上の任意の場所をクリックすると、その位置の住所が自動的に住所フィールドに入力されます。
              </p>
            </div>
            <div>
              <h3 className="font-semibold">3. フォーム統合での使用</h3>
              <p className="text-sm text-gray-600">
                <code>onAddressChange</code> と <code>onCoordinatesChange</code>{' '}
                のコールバックを使用して、
                フォームのstateやフィールドと連携できます。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 技術詳細 */}
        <Card>
          <CardHeader>
            <CardTitle>🛠 技術詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>地図ライブラリ:</strong> Leaflet + React Leaflet
            </p>
            <p>
              <strong>タイル:</strong> OpenStreetMap (フリー)
            </p>
            <p>
              <strong>ジオコーディング:</strong> Nominatim API (OpenStreetMap)
            </p>
            <p>
              <strong>ライセンス:</strong> 完全無料・商用利用可
            </p>
            <p>
              <strong>制限:</strong> リクエスト制限あり（通常使用では問題なし）
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
