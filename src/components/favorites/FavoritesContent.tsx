'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Building2, Camera, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudioCard } from '@/components/studio/StudioCard';
import { PhotoSessionCard } from '@/components/photo-sessions/PhotoSessionCard';
import { FavoritesLoading } from './FavoritesLoading';
import { EmptyFavorites } from './EmptyFavorites';
import { getUserFavoritesAction } from '@/app/actions/favorites';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  UserFavoriteWithDetails,
  StudioWithStats,
  PhotoSessionWithOrganizer,
} from '@/types/database';
import Logger from '@/lib/logger';

export function FavoritesContent() {
  const t = useTranslations('favorites');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'studio' | 'photo_session'>(
    'studio'
  );
  const [studioFavorites, setStudioFavorites] = useState<
    UserFavoriteWithDetails[]
  >([]);
  const [photoSessionFavorites, setPhotoSessionFavorites] = useState<
    UserFavoriteWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // 認証状態
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // お気に入りデータの取得
  const fetchFavorites = async (type?: 'studio' | 'photo_session') => {
    try {
      setLoading(true);
      const result = await getUserFavoritesAction(type, 1, 50);

      if (!result.isAuthenticated) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      if (result.success) {
        const favorites = result.favorites || [];

        if (type === 'studio') {
          setStudioFavorites(favorites as UserFavoriteWithDetails[]);
        } else if (type === 'photo_session') {
          setPhotoSessionFavorites(favorites as UserFavoriteWithDetails[]);
        }
      } else {
        toast.error(result.error || 'お気に入り一覧の取得に失敗しました');
      }
    } catch (error) {
      Logger.error('Failed to fetch favorites:', error);
      toast.error('システムエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 初期データ取得（スタジオのみ）
  useEffect(() => {
    fetchFavorites('studio');
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
        if (item.favorite_type === 'studio') {
          const studio = item.studio;
          return (
            studio?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            studio?.address?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        } else {
          const session = item.photo_session;
          return (
            session?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session?.description
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            session?.location?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      });
    }

    // ソート
    filtered.sort((a, b) => {
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
          const nameA =
            a.favorite_type === 'studio'
              ? a.studio?.name
              : a.photo_session?.title;
          const nameB =
            b.favorite_type === 'studio'
              ? b.studio?.name
              : b.photo_session?.title;
          return (nameA || '').localeCompare(nameB || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  // タブ変更時の処理
  const handleTabChange = (value: string) => {
    const newTab = value as 'studio' | 'photo_session';
    setActiveTab(newTab);

    // 必要に応じて個別にデータを再取得
    if (newTab === 'studio' && studioFavorites.length === 0) {
      fetchFavorites('studio');
    } else if (
      newTab === 'photo_session' &&
      photoSessionFavorites.length === 0
    ) {
      fetchFavorites('photo_session');
    }
  };

  // 未認証時の表示
  if (isAuthenticated === false) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-theme-text-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-theme-text-primary mb-2">
            ログインが必要です
          </h2>
          <p className="text-theme-text-secondary mb-6">
            お気に入り機能を利用するには、ログインしてください
          </p>
          <Button onClick={() => router.push('/auth/signin')}>
            ログインする
          </Button>
        </div>
      </div>
    );
  }

  // 読み込み中
  if (loading) {
    return <FavoritesLoading />;
  }

  // お気に入りの合計数
  const totalFavorites = studioFavorites.length + photoSessionFavorites.length;

  // タブに表示する内容を取得
  const getTabContent = (tab: 'studio' | 'photo_session') => {
    let items: UserFavoriteWithDetails[] = [];

    switch (tab) {
      case 'studio':
        items = studioFavorites;
        break;
      case 'photo_session':
        items = photoSessionFavorites;
        break;
    }

    return filterAndSortItems(items, searchTerm, sortBy);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-8 w-8 text-pink-600" />
          <div>
            <h1 className="text-3xl font-bold text-theme-text-primary">
              {t('title')}
            </h1>
            <p className="text-theme-text-secondary">{t('subtitle')}</p>
          </div>
        </div>

        {/* 統計 */}
        <div className="flex gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600" />
                <div>
                  <p className="text-2xl font-bold text-theme-text-primary">
                    {totalFavorites}
                  </p>
                  <p className="text-sm text-theme-text-secondary">
                    {t('stats.total')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-theme-text-primary">
                    {studioFavorites.length}
                  </p>
                  <p className="text-sm text-theme-text-secondary">
                    {t('stats.studios')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-theme-text-primary">
                    {photoSessionFavorites.length}
                  </p>
                  <p className="text-sm text-theme-text-secondary">
                    {t('stats.photoSessions')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 検索・フィルター */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-text-muted" />
            <Input
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
              <SelectValue placeholder={t('sort.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('sort.newest')}</SelectItem>
              <SelectItem value="oldest">{t('sort.oldest')}</SelectItem>
              <SelectItem value="name">{t('sort.name')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* タブコンテンツ */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="studio" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('tabs.studios')}
            <Badge variant="secondary" className="ml-1">
              {studioFavorites.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="photo_session"
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            {t('tabs.photoSessions')}
            <Badge variant="secondary" className="ml-1">
              {photoSessionFavorites.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="space-y-6">
          <FavoritesTabContent
            items={getTabContent('studio')}
            type="studio"
            searchTerm={searchTerm}
            emptyMessage={t('empty.studios')}
          />
        </TabsContent>

        <TabsContent value="photo_session" className="space-y-6">
          <FavoritesTabContent
            items={getTabContent('photo_session')}
            type="photo_session"
            searchTerm={searchTerm}
            emptyMessage={t('empty.photoSessions')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// タブコンテンツコンポーネント
interface FavoritesTabContentProps {
  items: UserFavoriteWithDetails[];
  type: 'studio' | 'photo_session';
  searchTerm: string;
  emptyMessage: string;
}

function FavoritesTabContent({
  items,
  type,
  searchTerm,
  emptyMessage,
}: FavoritesTabContentProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <EmptyFavorites
        type={type}
        message={emptyMessage}
        searchTerm={searchTerm}
      />
    );
  }

  return (
    <div className="space-y-3 md:space-y-4 pb-8">
      {items.map(item => {
        if (
          item.favorite_type === 'studio' &&
          item.studio &&
          item.studio.id &&
          item.studio.name
        ) {
          return (
            <StudioCard
              key={`studio-${item.favorite_id}`}
              studio={item.studio as StudioWithStats}
              onSelect={() => router.push(`/studios/${item.studio!.id}`)}
            />
          );
        } else if (
          item.favorite_type === 'photo_session' &&
          item.photo_session &&
          item.photo_session.id &&
          item.photo_session.start_time
        ) {
          return (
            <PhotoSessionCard
              key={`session-${item.favorite_id}`}
              session={item.photo_session as PhotoSessionWithOrganizer}
              onViewDetails={id => router.push(`/photo-sessions/${id}`)}
              layoutMode="card"
            />
          );
        }
        // 不正なデータの場合はログに記録
        if (item.favorite_type === 'studio' && !item.studio?.id) {
          Logger.error('Invalid studio data in favorites:', item);
        } else if (
          item.favorite_type === 'photo_session' &&
          !item.photo_session?.id
        ) {
          Logger.error('Invalid photo_session data in favorites:', item);
        }
        return null;
      })}
    </div>
  );
}
