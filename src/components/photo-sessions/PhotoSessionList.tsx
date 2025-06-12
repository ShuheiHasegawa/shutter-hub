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
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import type { PhotoSessionWithOrganizer, BookingType } from '@/types/database';
import { useTranslations } from 'next-intl';

interface FilterState {
  keyword: string;
  location: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  bookingTypes: BookingType[];
  participantsMin: string;
  participantsMax: string;
  onlyAvailable: boolean;
}

interface PhotoSessionListProps {
  showCreateButton?: boolean;
  organizerId?: string;
  title?: string;
  filters?: FilterState;
}

export function PhotoSessionList({
  showCreateButton = false,
  organizerId,
  title,
  filters,
}: PhotoSessionListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('photoSessions');
  const [sessions, setSessions] = useState<PhotoSessionWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'start_time' | 'price' | 'created_at'>(
    'start_time'
  );

  useEffect(() => {
    loadSessions();
  }, [organizerId, searchQuery, locationFilter, sortBy, filters]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from('photo_sessions').select(`
          *,
          organizer:profiles!photo_sessions_organizer_id_fkey(
            id,
            display_name,
            email,
            avatar_url
          )
        `);

      // フィルター条件を適用
      if (organizerId) {
        query = query.eq('organizer_id', organizerId);
      } else {
        query = query.eq('is_published', true);
      }

      // サイドバーフィルターを優先、なければ従来のフィルターを使用
      const keyword = filters?.keyword || searchQuery;
      const location = filters?.location || locationFilter;

      if (keyword) {
        query = query.or(
          `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
        );
      }

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      // 追加のフィルター条件（サイドバーから）
      if (filters) {
        // 料金フィルター
        if (filters.priceMin) {
          query = query.gte('price_per_person', parseInt(filters.priceMin));
        }
        if (filters.priceMax) {
          query = query.lte('price_per_person', parseInt(filters.priceMax));
        }

        // 日時フィルター
        if (filters.dateFrom) {
          query = query.gte('start_time', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('start_time', filters.dateTo + 'T23:59:59');
        }

        // 参加者数フィルター
        if (filters.participantsMin) {
          query = query.gte(
            'max_participants',
            parseInt(filters.participantsMin)
          );
        }
        if (filters.participantsMax) {
          query = query.lte(
            'max_participants',
            parseInt(filters.participantsMax)
          );
        }

        // 予約方式フィルター
        if (filters.bookingTypes.length > 0) {
          query = query.in('booking_type', filters.bookingTypes);
        }

        // 空きありフィルター
        if (filters.onlyAvailable) {
          query = query.lt(
            'current_participants',
            query.select('max_participants')
          );
        }
      }

      // ソート条件を適用
      switch (sortBy) {
        case 'start_time':
          query = query.order('start_time', { ascending: true });
          break;
        case 'price':
          query = query.order('price_per_person', { ascending: true });
          break;
        case 'created_at':
          query = query.order('created_at', { ascending: false });
          break;
      }

      query = query.limit(20);

      const { data, error } = await query;

      if (error) {
        console.error('撮影会一覧取得エラー:', error);
        return;
      }

      setSessions(data || []);
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
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex p-6">
                <div className="w-48 h-32 bg-gray-200 rounded-lg mr-6"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="w-32 space-y-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
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
        <h2 className="text-2xl font-bold">{title || t('list.title')}</h2>
        {showCreateButton && (
          <Button onClick={handleCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('createSession')}
          </Button>
        )}
      </div>

      {/* 検索・フィルター（サイドバーがない場合のみ表示） */}
      {!filters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('list.searchFilter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('list.keywordPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Input
                placeholder={t('list.locationPlaceholder')}
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
                  <SelectValue placeholder={t('list.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start_time">
                    {t('list.sortByStartTime')}
                  </SelectItem>
                  <SelectItem value="price">{t('list.sortByPrice')}</SelectItem>
                  <SelectItem value="created_at">
                    {t('list.sortByCreatedAt')}
                  </SelectItem>
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
                {t('list.reset')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 撮影会一覧 */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery || locationFilter
                ? t('list.noResults')
                : t('list.noSessions')}
            </p>
            {showCreateButton && !searchQuery && !locationFilter && (
              <Button onClick={handleCreate}>
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('list.createFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {sessions.map(session => (
            <PhotoSessionCard
              key={session.id}
              session={session}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              isOwner={user?.id === session.organizer_id}
              showActions={true}
              layoutMode="card"
            />
          ))}
        </div>
      )}

      {/* ページネーション（将来的に追加） */}
      {sessions.length >= 20 && (
        <div className="flex justify-center">
          <Button variant="outline">{t('list.loadMore')}</Button>
        </div>
      )}
    </div>
  );
}
