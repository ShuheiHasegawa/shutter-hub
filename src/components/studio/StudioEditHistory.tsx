'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, Edit } from 'lucide-react';
import { getStudioEditHistoryAction } from '@/app/actions/studio';
import { StudioEditHistory as StudioEditHistoryType } from '@/types/database';
import {
  FormattedDateTime,
  FormattedPrice,
} from '@/components/ui/formatted-display';

interface StudioEditHistoryProps {
  studioId: string;
}

export function StudioEditHistory({ studioId }: StudioEditHistoryProps) {
  const [history, setHistory] = useState<StudioEditHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getStudioEditHistoryAction(studioId);

        if (result.success) {
          setHistory(result.history || []);
        } else {
          setError(result.error || '履歴の取得に失敗しました');
        }
      } catch {
        setError('履歴の取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    if (studioId) {
      fetchHistory();
    }
  }, [studioId]);

  const getFieldLabel = (field: string): string => {
    const fieldLabels: Record<string, string> = {
      name: 'スタジオ名',
      description: '説明',
      address: '住所',
      prefecture: '都道府県',
      access_info: 'アクセス情報',
      hourly_rate_min: '最低料金',
      hourly_rate_max: '最高料金',
      max_capacity: '収容人数',
      parking_available: '駐車場',
      wifi_available: 'WiFi',
      phone: '電話番号',
      email: 'メールアドレス',
      website_url: 'ウェブサイト',
    };
    return fieldLabels[field] || field;
  };

  const formatValue = (value: unknown, field?: string): React.ReactNode => {
    if (value === null || value === undefined) return '未設定';
    if (typeof value === 'boolean') return value ? 'あり' : 'なし';
    if (typeof value === 'number') {
      // 通貨フィールドの場合はFormattedPriceを使用
      if (field === 'hourly_rate_min' || field === 'hourly_rate_max') {
        return <FormattedPrice value={value} format="simple" />;
      }
      // その他の数値は通常の数値表示
      return value.toLocaleString();
    }
    return String(value);
  };

  const renderChanges = (entry: StudioEditHistoryType) => {
    const oldValues = entry.old_values || {};
    const newValues = entry.new_values || {};

    return entry.changed_fields?.map((field: string) => {
      const oldValue = oldValues[field as keyof typeof oldValues];
      const newValue = newValues[field as keyof typeof newValues];

      return (
        <div key={field} className="text-sm">
          <span className="font-medium">{getFieldLabel(field)}:</span>{' '}
          <span className="text-red-600 line-through">
            {formatValue(oldValue, field)}
          </span>{' '}
          →{' '}
          <span className="text-green-600">{formatValue(newValue, field)}</span>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            編集履歴
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            編集履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="w-5 h-5" />
          編集履歴 ({history.length}件)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-theme-text-muted text-center py-8">
            編集履歴がありません
          </p>
        ) : (
          <div className="space-y-4">
            {history.map(entry => (
              <div key={entry.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-theme-text-muted" />
                    <span className="font-medium">
                      スタジオ情報が更新されました
                    </span>
                    <Badge variant="outline">
                      {entry.edit_type === 'create'
                        ? '作成'
                        : entry.edit_type === 'update'
                          ? '更新'
                          : entry.edit_type === 'delete'
                            ? '削除'
                            : '編集'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-theme-text-muted">
                    <Clock className="w-4 h-4" />
                    <FormattedDateTime
                      value={new Date(entry.created_at)}
                      format="datetime-short"
                    />
                  </div>
                </div>

                {entry.change_summary && (
                  <p className="text-theme-text-primary mb-3">
                    {entry.change_summary}
                  </p>
                )}

                {entry.changed_fields && entry.changed_fields.length > 0 && (
                  <div className="space-y-1 text-sm bg-gray-50 p-3 rounded">
                    <h5 className="font-medium text-theme-text-primary mb-2">
                      変更内容:
                    </h5>
                    {renderChanges(entry)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
