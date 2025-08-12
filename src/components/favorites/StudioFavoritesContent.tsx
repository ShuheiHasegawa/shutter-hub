'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Building2, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudioCard } from '@/components/studio/StudioCard';
import { FavoritesLoading } from './FavoritesLoading';
import { EmptyFavorites } from './EmptyFavorites';
import { getUserFavoritesAction } from '@/app/actions/favorites';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserFavoriteWithDetails, StudioWithStats } from '@/types/database';
import Logger from '@/lib/logger';

export function StudioFavoritesContent() {
  const t = useTranslations('favorites');
  const router = useRouter();

  const [studioFavorites, setStudioFavorites] = useState<
    UserFavoriteWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // 認証状態
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // お気に入りデータの取得
  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const result = await getUserFavoritesAction('studio', 1, 50);

      if (!result.isAuthenticated) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      if (result.success) {
        const favorites = (result.favorites || []) as UserFavoriteWithDetails[];
        setStudioFavorites(favorites);
      } else {
        toast.error(result.error || 'お気に入り一覧の取得に失敗しました');
      }
    } catch (error) {
      Logger.error('Failed to fetch studio favorites:', error);
      toast.error('システムエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 初期データ取得
  useEffect(() => {
    fetchFavorites();
  }, []);

  // フィルタリング・ソート機能
  const filterAndSortItems = (
    items: UserFavoriteWithDetails[],
    searchTerm: string,
    sortBy: string
  ) => {
    let filtered = items;

    // 検索フィルター
    if (searchTerm) {
      filtered = items.filter(item => {
        const studio = item.studio;
        return (
          studio?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          studio?.address?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // ソート
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case 'oldest':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case 'name':
          const nameA = a.studio?.name;
          const nameB = b.studio?.name;
          return (nameA || '').localeCompare(nameB || '');
        default:
          return 0;
      }
    });
  };

  // 未認証時の表示
  if (isAuthenticated === false) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-theme-text-primary mb-4">
            ログインが必要です
          </h3>
          <p className="text-theme-text-secondary mb-8">
            お気に入り機能を利用するにはログインしてください
          </p>
          <Button onClick={() => router.push('/login')}>ログイン</Button>
        </div>
      </div>
    );
  }

  // 読み込み中
  if (loading) {
    return <FavoritesLoading />;
  }

  const filteredItems = filterAndSortItems(studioFavorites, searchTerm, sortBy);

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-theme-accent" />
              <span className="font-semibold text-theme-text-primary">
                お気に入りスタジオ
              </span>
              <Badge variant="secondary" className="font-semibold">
                {studioFavorites.length}件
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={sortBy}
          onValueChange={(value: 'newest' | 'oldest' | 'name') =>
            setSortBy(value)
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sort.newest')}</SelectItem>
            <SelectItem value="oldest">{t('sort.oldest')}</SelectItem>
            <SelectItem value="name">{t('sort.name')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* コンテンツ */}
      {filteredItems.length === 0 ? (
        <EmptyFavorites
          type="studio"
          message={
            searchTerm
              ? `「${searchTerm}」に該当するスタジオが見つかりませんでした`
              : 'まだお気に入りのスタジオがありません'
          }
          searchTerm={searchTerm}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            // より厳密なnullチェック
            if (!item.studio || !item.studio.id || !item.studio.name) {
              Logger.error('Invalid studio data:', item);
              return null;
            }
            return (
              <StudioCard
                key={`studio-${item.favorite_id}`}
                studio={item.studio as StudioWithStats}
                showSelection={false}
                isSelected={false}
                onSelect={() => router.push(`/studios/${item.studio!.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
