'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import type { GeolocationError } from '@/types/instant-photo';

interface LocationPermissionCheckProps {
  isSupported: boolean;
  isLoading: boolean;
  error: GeolocationError | null;
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          位置情報の許可
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              お使いのブラウザは位置情報をサポートしていません。
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              位置情報の取得に失敗しました: {error.message}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-sm text-gray-600">
          近くのカメラマンを検索するために位置情報が必要です。
          正確な位置は共有されず、プライバシーは保護されます。
        </p>

        <div className="flex flex-col gap-2">
          <Button
            onClick={onRequestLocation}
            disabled={!isSupported || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                位置情報を取得中...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                位置情報を許可
              </>
            )}
          </Button>

          <Button variant="outline" onClick={onSkip} className="w-full">
            スキップして続行
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          位置情報は撮影マッチングにのみ使用され、保存されません。
        </p>
      </CardContent>
    </Card>
  );
}
