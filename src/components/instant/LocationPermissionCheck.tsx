'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertTriangle, Loader2, Navigation } from 'lucide-react';

interface LocationPermissionCheckProps {
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  onRequestLocation: () => void;
  onSkip: () => void;
  onRetryWithLowAccuracy?: () => void;
}

export function LocationPermissionCheck({
  isSupported,
  isLoading,
  error,
  onRequestLocation,
  onSkip,
  onRetryWithLowAccuracy,
}: LocationPermissionCheckProps) {
  if (!isSupported) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              お使いのブラウザは位置情報をサポートしていません。
              手動で場所を入力してください。
            </AlertDescription>
          </Alert>
          <Button onClick={onSkip} className="w-full mt-4">
            手動で場所を入力
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || '位置情報の取得に失敗しました'}
            </AlertDescription>
          </Alert>

          <div className="mt-3 p-3 bg-muted rounded-md">
            <h4 className="text-sm font-medium mb-2">対処法:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• ブラウザのアドレスバーで位置情報を許可してください</li>
              {error &&
                (error.includes('kCLErrorLocationUnknown') ||
                  error.includes('CoreLocationProvider') ||
                  error.includes('iOS設定')) && (
                  <>
                    <li>
                      • <strong>iOS端末の場合：</strong>
                    </li>
                    <li>
                      {' '}
                      → 「設定」アプリ &gt; 「プライバシーとセキュリティ」
                    </li>
                    <li> → 「位置情報サービス」を有効にする</li>
                    <li> → 「Safari」を探してアクセス許可を確認</li>
                    <li>• 端末を再起動してから再試行してください</li>
                  </>
                )}
              <li>• GPS機能がオンになっているか確認してください</li>
              <li>• 屋外や窓の近くで再試行してください</li>
              <li>• Wi-Fi接続が安定していることを確認してください</li>
            </ul>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex gap-2">
              <Button onClick={onRequestLocation} className="flex-1">
                再試行
              </Button>
              <Button onClick={onSkip} variant="outline" className="flex-1">
                スキップ
              </Button>
            </div>

            {error &&
              (error.includes('kCLErrorLocationUnknown') ||
                error.includes('CoreLocationProvider') ||
                error.includes('iOS設定')) &&
              onRetryWithLowAccuracy && (
                <Button
                  onClick={onRetryWithLowAccuracy}
                  variant="secondary"
                  className="w-full text-xs"
                >
                  低精度モードで再試行（バッテリー節約）
                </Button>
              )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="mb-4">
          <Navigation className="h-12 w-12 mx-auto text-shutter-info mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            位置情報を許可してください
          </h3>
          <p className="text-muted-foreground text-sm">
            近くのカメラマンを見つけるために、現在地の情報が必要です。
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">位置情報を取得中...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={onRequestLocation} className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              位置情報を許可
            </Button>
            <Button onClick={onSkip} variant="outline" className="w-full">
              手動で場所を入力
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          位置情報は撮影マッチングにのみ使用され、保存されません。
        </p>
      </CardContent>
    </Card>
  );
}
