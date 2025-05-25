'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoSessionCard } from './PhotoSessionCard';
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
import { PlusIcon, SearchIcon } from 'lucide-react';
import { getPhotoSessions, searchPhotoSessions } from '@/lib/photo-sessions';
import { useAuth } from '@/hooks/useAuth';
import type { PhotoSessionWithOrganizer } from '@/types/database';

interface PhotoSessionListProps {
  showCreateButton?: boolean;
  organizerId?: string;
  title?: string;
}

export function PhotoSessionList({
  showCreateButton = false,
  organizerId,
  title = '撮影会一覧',
}: PhotoSessionListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<PhotoSessionWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'start_time' | 'price' | 'created_at'>(
    'start_time'
  );

  useEffect(() => {
    loadSessions();
  }, [organizerId, searchQuery, locationFilter, sortBy]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      let result;

      if (searchQuery || locationFilter) {
        // 検索モード
        result = await searchPhotoSessions({
          query: searchQuery || undefined,
          location: locationFilter || undefined,
          limit: 20,
        });
      } else {
        // 通常の一覧取得
        result = await getPhotoSessions({
          published: organizerId ? undefined : true, // 自分の撮影会の場合は非公開も含む
          organizerId,
          limit: 20,
        });
      }

      if (result.data) {
        // ソート処理
        const sortedSessions = [...result.data].sort((a, b) => {
          switch (sortBy) {
            case 'start_time':
              return (
                new Date(a.start_time).getTime() -
                new Date(b.start_time).getTime()
              );
            case 'price':
              return a.price_per_person - b.price_per_person;
            case 'created_at':
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              );
            default:
              return 0;
          }
        });
        setSessions(sortedSessions);
      }
    } catch (error) {
      console.error('撮影会一覧取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (sessionId: string) => {
    router.push(`/photo-sessions/${sessionId}`);
  };

  const handleEdit = (sessionId: string) => {
    router.push(`/photo-sessions/${sessionId}/edit`);
  };

  const handleCreate = () => {
    router.push('/photo-sessions/create');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showCreateButton && (
          <Button onClick={handleCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            撮影会を作成
          </Button>
        )}
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">検索・フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="キーワード検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Input
              placeholder="場所で絞り込み..."
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
            />

            <Select
              value={sortBy}
              onValueChange={(value: 'start_time' | 'price' | 'created_at') =>
                setSortBy(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start_time">開始日時順</SelectItem>
                <SelectItem value="price">料金順</SelectItem>
                <SelectItem value="created_at">作成日順</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setLocationFilter('');
                setSortBy('start_time');
              }}
            >
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 撮影会一覧 */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery || locationFilter
                ? '検索条件に一致する撮影会が見つかりませんでした。'
                : '撮影会がまだありません。'}
            </p>
            {showCreateButton && !searchQuery && !locationFilter && (
              <Button onClick={handleCreate}>
                <PlusIcon className="h-4 w-4 mr-2" />
                最初の撮影会を作成
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(session => (
            <PhotoSessionCard
              key={session.id}
              session={session}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              isOwner={user?.id === session.organizer_id}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* ページネーション（将来的に追加） */}
      {sessions.length >= 20 && (
        <div className="flex justify-center">
          <Button variant="outline">さらに読み込む</Button>
        </div>
      )}
    </div>
  );
}
