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
}

export function LocationPermissionCheck({
  isSupported,
  isLoading,
  error,
  onRequestLocation,
  onSkip,
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
              位置情報の取得に失敗しました: {error}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 mt-4">
            <Button onClick={onRequestLocation} className="flex-1">
              再試行
            </Button>
            <Button onClick={onSkip} variant="outline" className="flex-1">
              スキップ
            </Button>
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
