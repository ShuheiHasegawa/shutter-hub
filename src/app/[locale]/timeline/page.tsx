'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreatePostForm } from '@/components/social/CreatePostForm';
import { PostCard } from '@/components/social/PostCard';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  Search,
  Filter,
  Loader2,
  Plus,
  Hash,
  Users,
  Globe,
  Star,
  Calendar,
} from 'lucide-react';
import {
  getTimelinePosts,
  searchPosts,
  getTrendingHashtags,
} from '@/app/actions/posts';
import { TimelinePost, TrendingTopic, PostSearchFilters } from '@/types/social';
import { toast } from 'sonner';

export default function TimelinePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingTopic[]>([]);
  const [currentTab, setCurrentTab] = useState<
    'timeline' | 'trending' | 'search'
  >('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<PostSearchFilters>({});
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // 初期データ読み込み - userが変更された時に実行
  useEffect(() => {
    if (user) {
      loadInitialData();
      loadTrendingHashtags();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await getTimelinePosts(1, 20);
      if (result.success && result.data) {
        setPosts(result.data);
        setCurrentPage(1);
        setHasNextPage(result.data.length === 20);
      } else {
        toast.error(result.message || 'タイムラインの読み込みに失敗しました');
      }
    } catch {
      toast.error('タイムラインの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingHashtags = async () => {
    try {
      const result = await getTrendingHashtags(10);
      if (result.success && result.data) {
        setTrendingHashtags(result.data);
      }
    } catch {
      // トレンドの読み込みエラーは無視
    }
  };

  const handleRefresh = async () => {
    await loadInitialData();
    await loadTrendingHashtags();
    toast.success('タイムラインを更新しました');
  };

  const handleLoadMore = async () => {
    if (!hasNextPage || isLoading) return;

    setIsLoading(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getTimelinePosts(nextPage, 20);
      if (result.success && result.data) {
        setPosts(prev => [...prev, ...result.data!]);
        setCurrentPage(nextPage);
        setHasNextPage(result.data.length === 20);
      }
    } catch {
      toast.error('追加の投稿読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const filters: PostSearchFilters = {
        ...searchFilters,
        query: searchQuery,
      };

      const result = await searchPosts(filters, 1, 20);
      if (result.success && result.data) {
        setPosts(result.data);
        setCurrentTab('search');
      } else {
        toast.error(result.message || '検索に失敗しました');
      }
    } catch {
      toast.error('検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = async (tab: 'timeline' | 'trending' | 'search') => {
    setCurrentTab(tab);
    if (tab === 'timeline') {
      await loadInitialData();
    } else if (tab === 'trending') {
      // TODO: トレンド投稿の実装
      await loadInitialData();
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            タイムラインを見るにはログインが必要です
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                投稿作成
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新しい投稿</DialogTitle>
              </DialogHeader>
              <CreatePostForm
                onSuccess={() => {
                  setIsCreatePostOpen(false);
                  handleRefresh();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-3 space-y-6">
            {/* タブナビゲーション */}
            <Tabs
              value={currentTab}
              onValueChange={value =>
                handleTabChange(value as 'timeline' | 'trending' | 'search')
              }
            >
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger
                    value="timeline"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    タイムライン
                  </TabsTrigger>
                  <TabsTrigger
                    value="trending"
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    トレンド
                  </TabsTrigger>
                  <TabsTrigger
                    value="search"
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    検索
                  </TabsTrigger>
                </TabsList>

                {currentTab === 'search' && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="投稿を検索..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSearch()}
                      className="w-64"
                    />
                    <Button onClick={handleSearch} size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="timeline" className="space-y-4">
                {/* 投稿作成フォーム（コンパクト版） */}
                <Card>
                  <CardContent className="p-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => setIsCreatePostOpen(true)}
                    >
                      今何をしていますか？
                    </Button>
                  </CardContent>
                </Card>

                {/* 投稿リスト */}
                {isLoading && posts.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">読み込み中...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      投稿がありません
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      まだフォローしているユーザーの投稿がないか、投稿がありません
                    </p>
                    <Button onClick={() => setIsCreatePostOpen(true)}>
                      最初の投稿を作成
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onUpdate={handleRefresh}
                      />
                    ))}

                    {/* さらに読み込みボタン */}
                    {hasNextPage && (
                      <div className="text-center">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              読み込み中...
                            </>
                          ) : (
                            'さらに読み込む'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trending" className="space-y-4">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">トレンド投稿</h3>
                  <p className="text-muted-foreground">実装予定の機能です</p>
                </div>
              </TabsContent>

              <TabsContent value="search" className="space-y-4">
                {/* 検索フィルター */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      検索フィルター
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          投稿タイプ
                        </label>
                        <Select
                          value={searchFilters.post_type || 'all'}
                          onValueChange={value =>
                            setSearchFilters(prev => ({
                              ...prev,
                              post_type:
                                value === 'all'
                                  ? undefined
                                  : (value as
                                      | 'text'
                                      | 'image'
                                      | 'photo_session'),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="text">テキスト</SelectItem>
                            <SelectItem value="image">画像</SelectItem>
                            <SelectItem value="photo_session">
                              撮影会
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">ソート</label>
                        <Select
                          value={searchFilters.sort_by || 'newest'}
                          onValueChange={value =>
                            setSearchFilters(prev => ({
                              ...prev,
                              sort_by: value as
                                | 'newest'
                                | 'oldest'
                                | 'most_liked'
                                | 'most_commented',
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">新しい順</SelectItem>
                            <SelectItem value="oldest">古い順</SelectItem>
                            <SelectItem value="most_liked">
                              いいね数順
                            </SelectItem>
                            <SelectItem value="most_commented">
                              コメント数順
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">画像</label>
                        <Select
                          value={searchFilters.has_images ? 'yes' : 'all'}
                          onValueChange={value =>
                            setSearchFilters(prev => ({
                              ...prev,
                              has_images: value === 'yes',
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="yes">画像あり</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 検索結果 */}
                {posts.length === 0 && currentTab === 'search' && !isLoading ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      検索結果がありません
                    </h3>
                    <p className="text-muted-foreground">
                      別のキーワードで検索してみてください
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onUpdate={handleRefresh}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* トレンドハッシュタグ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  トレンド
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {trendingHashtags.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">
                        トレンドデータがありません
                      </p>
                    ) : (
                      trendingHashtags.map((trend, index) => (
                        <div
                          key={trend.hashtag}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-blue-600">
                                #{trend.hashtag}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {trend.posts_count}件の投稿
                              </p>
                            </div>
                          </div>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* おすすめユーザー */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  おすすめユーザー
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    実装予定の機能です
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 最近のイベント */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  最近のイベント
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    実装予定の機能です
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
