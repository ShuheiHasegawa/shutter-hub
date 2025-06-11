'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  ArrowLeft,
  MessageCircle,
  Users,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getFollowingUsers, getFollowerUsers } from '@/app/actions/follow';
import { createOrGetConversation } from '@/app/actions/message';
import { UserWithFollowInfo } from '@/types/social';

export default function UserSearchPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    'followers'
  );
  const [followers, setFollowers] = useState<UserWithFollowInfo[]>([]);
  const [following, setFollowing] = useState<UserWithFollowInfo[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithFollowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState<
    string | null
  >(null);

  // ユーザーデータを読み込み
  useEffect(() => {
    const loadUsers = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const [followersResult, followingResult] = await Promise.all([
          getFollowerUsers(user.id),
          getFollowingUsers(user.id),
        ]);

        if (followersResult.success && followersResult.data) {
          setFollowers(followersResult.data);
        }

        if (followingResult.success && followingResult.data) {
          setFollowing(followingResult.data);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        toast.error('ユーザーの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [user]);

  // 検索フィルタリング
  useEffect(() => {
    const currentUsers = activeTab === 'followers' ? followers : following;

    if (!searchQuery.trim()) {
      setFilteredUsers(currentUsers);
      return;
    }

    const filtered = currentUsers.filter(userData => {
      const displayName = userData.display_name || '';
      const bio = userData.bio || '';
      return (
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bio.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    setFilteredUsers(filtered);
  }, [searchQuery, activeTab, followers, following]);

  // タブ変更処理
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'followers' | 'following');
    setSearchQuery(''); // 検索クエリをリセット
  };

  // 会話作成・開始
  const handleStartConversation = async (targetUserId: string) => {
    if (!user || creatingConversation) return;

    setCreatingConversation(targetUserId);
    try {
      const result = await createOrGetConversation(targetUserId);

      if (result.success && result.data) {
        // 作成された会話に遷移
        router.push(`/messages/${result.data.id}`);
        toast.success('会話を開始しました');
      } else {
        toast.error(result.message || '会話の作成に失敗しました');
      }
    } catch (error) {
      console.error('Create conversation error:', error);
      toast.error('会話の作成に失敗しました');
    } finally {
      setCreatingConversation(null);
    }
  };

  // 戻る処理
  const handleBack = () => {
    router.push('/messages');
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p>ログインが必要です</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">ユーザー検索</h1>
          <p className="text-muted-foreground">
            フォロワーやフォロー中のユーザーと新しい会話を開始します
          </p>
        </div>

        <div className="max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  新しい会話を開始
                </CardTitle>
              </div>

              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ユーザーを検索..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>

            <CardContent>
              {/* タブ */}
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="followers"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    フォロワー ({followers.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="following"
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    フォロー中 ({following.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="followers" className="mt-6">
                  <UserList
                    users={filteredUsers}
                    loading={loading}
                    searchQuery={searchQuery}
                    creatingConversation={creatingConversation}
                    onStartConversation={handleStartConversation}
                    emptyMessage="フォロワーがいません"
                    noSearchResultsMessage="検索条件に一致するフォロワーが見つかりません"
                  />
                </TabsContent>

                <TabsContent value="following" className="mt-6">
                  <UserList
                    users={filteredUsers}
                    loading={loading}
                    searchQuery={searchQuery}
                    creatingConversation={creatingConversation}
                    onStartConversation={handleStartConversation}
                    emptyMessage="フォロー中のユーザーがいません"
                    noSearchResultsMessage="検索条件に一致するユーザーが見つかりません"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ユーザーリストコンポーネント
interface UserListProps {
  users: UserWithFollowInfo[];
  loading: boolean;
  searchQuery: string;
  creatingConversation: string | null;
  onStartConversation: (userId: string) => void;
  emptyMessage: string;
  noSearchResultsMessage: string;
}

function UserList({
  users,
  loading,
  searchQuery,
  creatingConversation,
  onStartConversation,
  emptyMessage,
  noSearchResultsMessage,
}: UserListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {searchQuery ? noSearchResultsMessage : emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {users.map(userData => (
          <div
            key={userData.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userData.avatar_url || undefined} />
                <AvatarFallback>
                  {userData.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {userData.display_name || 'Unknown User'}
                  </p>

                  {/* ユーザータイプバッジ */}
                  <Badge variant="secondary" className="text-xs">
                    {userData.user_type === 'model' && 'モデル'}
                    {userData.user_type === 'photographer' &&
                      'フォトグラファー'}
                    {userData.user_type === 'organizer' && '主催者'}
                  </Badge>

                  {/* 相互フォローバッジ */}
                  {userData.is_following && userData.is_followed_by && (
                    <Badge variant="outline" className="text-xs">
                      相互フォロー
                    </Badge>
                  )}
                </div>

                {userData.bio && (
                  <p className="text-sm text-muted-foreground truncate">
                    {userData.bio}
                  </p>
                )}
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => onStartConversation(userData.id)}
              disabled={creatingConversation === userData.id}
              className="flex items-center gap-2"
            >
              {creatingConversation === userData.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              {creatingConversation === userData.id
                ? '作成中...'
                : 'メッセージ'}
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
