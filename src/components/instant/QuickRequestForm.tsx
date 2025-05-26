'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import type { LocationData } from '@/types/instant-photo';

interface QuickRequestFormProps {
  location: LocationData;
}

export function QuickRequestForm({ location }: QuickRequestFormProps) {
  return (
    <Card id="quick-request">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          撮影リクエスト
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            位置情報:{' '}
            {location.address || `${location.latitude}, ${location.longitude}`}
          </p>
          <p className="text-center text-gray-500">
            撮影リクエストフォームは準備中です
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
