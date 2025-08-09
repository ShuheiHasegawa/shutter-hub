'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StudiosList } from '@/components/studio/StudiosList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudioSearchFilters } from '@/types/database';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PREFECTURES } from '@/constants/japan';
import { STUDIO_SORT_OPTIONS, DEFAULT_STUDIO_SEARCH } from '@/constants/studio';
import Link from 'next/link';

export default function StudiosPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<StudioSearchFilters>({
    query: searchParams.get('q') || '',
    prefecture: searchParams.get('prefecture') || '',
    sort_by: DEFAULT_STUDIO_SEARCH.sort_by,
    sort_order: DEFAULT_STUDIO_SEARCH.sort_order,
  });

  const handleSearchChange = (
    field: keyof StudioSearchFilters,
    value: string | number | boolean
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleReset = () => {
    setFilters({
      query: '',
      prefecture: '',
      sort_by: DEFAULT_STUDIO_SEARCH.sort_by,
      sort_order: DEFAULT_STUDIO_SEARCH.sort_order,
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">スタジオ一覧</h1>
            <p className="text-gray-600 mt-1">
              撮影に最適なスタジオを見つけましょう
            </p>
          </div>
          <Link href="/studios/create">
            <Button className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              新しいスタジオを追加
            </Button>
          </Link>
        </div>

        {/* 検索・フィルター */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MagnifyingGlassIcon className="w-5 h-5" />
              検索・フィルター
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* キーワード検索 */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  キーワード
                </label>
                <Input
                  placeholder="スタジオ名、住所で検索"
                  value={filters.query || ''}
                  onChange={e => handleSearchChange('query', e.target.value)}
                />
              </div>

              {/* 都道府県 */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  都道府県
                </label>
                <Select
                  value={filters.prefecture || ''}
                  onValueChange={value =>
                    handleSearchChange('prefecture', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="都道府県を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {PREFECTURES.map(prefecture => (
                      <SelectItem key={prefecture} value={prefecture}>
                        {prefecture}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ソート */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  並び順
                </label>
                <Select
                  value={`${filters.sort_by}_${filters.sort_order}`}
                  onValueChange={value => {
                    const [sort_by, sort_order] = value.split('_');
                    setFilters(prev => ({
                      ...prev,
                      sort_by: sort_by as
                        | 'name'
                        | 'rating'
                        | 'price'
                        | 'distance'
                        | 'created_at',
                      sort_order: sort_order as 'asc' | 'desc',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDIO_SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* リセットボタン */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full"
                >
                  リセット
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* スタジオ一覧 */}
        <StudiosList filters={filters} />
      </div>
    </DashboardLayout>
  );
}
