'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { StudioCard } from '@/components/studio/StudioCard';
import { PhotoSessionCard } from '@/components/photo-sessions/PhotoSessionCard';
import { FavoritesLoading } from './FavoritesLoading';
import { EmptyFavorites } from './EmptyFavorites';
import { StickyHeader } from '@/components/ui/sticky-header';
import { getUserFavoritesAction } from '@/app/actions/favorites';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  UserFavoriteWithDetails,
  StudioWithStats,
  PhotoSessionWithOrganizer,
} from '@/types/database';
import Logger from '@/lib/logger';

interface FavoritesContentProps {
  initialTab?: 'studio' | 'photo_session';
}

export function FavoritesContent({
  initialTab = 'photo_session',
}: FavoritesContentProps) {
  const t = useTranslations('favorites');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'studio' | 'photo_session'>(
    initialTab
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
  const fetchFavorites = useCallback(
    async (type?: 'studio' | 'photo_session') => {
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

          // #region agent log
          if (type === 'studio' && favorites.length > 0) {
            const firstFavorite = favorites[0];
            type StudioWithPhotos = {
              studio?: StudioWithStats & {
                studio_photos?: Array<unknown>;
              };
            };
            const studioWithPhotos = firstFavorite as StudioWithPhotos;
            const photosCount =
              Array.isArray(studioWithPhotos?.studio?.studio_photos) &&
              studioWithPhotos.studio.studio_photos.length > 0
                ? studioWithPhotos.studio.studio_photos.length
                : 0;
            Logger.info('[FavoritesContent] Studio favorites data', {
              count: favorites.length,
              firstStudio: firstFavorite,
              hasPhotos: photosCount > 0,
              photosCount,
            });
          }
          // #endregion

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
    },
    []
  );

  // initialTabが変更されたときにactiveTabを更新
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // 初期データ取得（初期タブに応じて）
  useEffect(() => {
    fetchFavorites(initialTab);
  }, [initialTab, fetchFavorites]);

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

    // URLパラメータを更新
    const newUrl = new URL(window.location.href);
    if (newTab === 'studio') {
      newUrl.searchParams.set('tab', 'studio');
    } else {
      // photo_sessionの場合はパラメータを削除（デフォルトのため）
      newUrl.searchParams.delete('tab');
    }
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });

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
      <PageTitleHeader
        title={t('title')}
        description={t('subtitle')}
        icon={<Heart className="h-8 w-8" />}
      />

      {/* タブコンテンツ */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        {/* 検索・フィルターとタブを固定 */}
        <StickyHeader className="space-y-4 mb-6">
          {/* タブ */}
          <TabsList className="grid w-full grid-cols-2">
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
            <TabsTrigger value="studio" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('tabs.studios')}
              <Badge variant="secondary" className="ml-1">
                {studioFavorites.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* 検索・フィルター */}
          <div className="flex flex-col sm:flex-row gap-4">
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
        </StickyHeader>
        <TabsContent value="photo_session" className="space-y-6">
          <FavoritesTabContent
            items={getTabContent('photo_session')}
            type="photo_session"
            searchTerm={searchTerm}
            emptyMessage={t('empty.photoSessions')}
          />
        </TabsContent>

        <TabsContent value="studio" className="space-y-6">
          <FavoritesTabContent
            items={getTabContent('studio')}
            type="studio"
            searchTerm={searchTerm}
            emptyMessage={t('empty.studios')}
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
