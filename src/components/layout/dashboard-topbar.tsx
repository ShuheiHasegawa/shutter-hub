'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';

// ページタイトルのマッピング
const getPageTitle = (pathname: string): string => {
  // ロケールプレフィックスを除去
  const cleanPath = pathname.replace(/^\/[a-z]{2}/, '');

  const titleMap: Record<string, string> = {
    '/dashboard': 'ダッシュボード',
    '/dashboard/my-sessions': 'マイ撮影会',
    '/photo-sessions': '撮影会一覧',
    '/photo-sessions/create': '撮影会作成',
    '/bookings': '予約管理',
    '/messages': 'メッセージ',
    '/profile': 'プロフィール',
    '/profile/edit': 'プロフィール編集',
    '/settings': '設定',
    '/timeline': 'タイムライン',
    '/analytics': 'アナリティクス',
    '/users/search': 'ユーザー検索',
    '/photobooks': 'フォトブック',
    '/admin': '管理画面',
  };

  // 動的ルートの処理
  if (cleanPath.includes('/photo-sessions/') && cleanPath.includes('/edit')) {
    return '撮影会編集';
  }
  if (
    cleanPath.includes('/photo-sessions/') &&
    cleanPath.includes('/analytics')
  ) {
    return '撮影会分析';
  }
  if (
    cleanPath.includes('/photo-sessions/') &&
    cleanPath.includes('/participants')
  ) {
    return '参加者管理';
  }
  if (
    cleanPath.includes('/photo-sessions/') &&
    cleanPath.includes('/duplicate')
  ) {
    return '撮影会複製';
  }
  if (
    cleanPath.startsWith('/photo-sessions/') &&
    !cleanPath.includes('/create')
  ) {
    return '撮影会詳細';
  }
  if (cleanPath.includes('/messages/') && cleanPath !== '/messages') {
    return 'チャット';
  }
  if (cleanPath.includes('/profile/') && !cleanPath.includes('/edit')) {
    return 'ユーザープロフィール';
  }
  if (cleanPath.includes('/photobooks/') && cleanPath.includes('/edit')) {
    return 'フォトブック編集';
  }
  if (cleanPath.includes('/photobooks/') && cleanPath.includes('/create')) {
    return 'フォトブック作成';
  }
  if (
    cleanPath.includes('/photobooks/') &&
    !cleanPath.includes('/create') &&
    !cleanPath.includes('/edit')
  ) {
    return 'フォトブック詳細';
  }
  if (cleanPath.includes('/admin/')) {
    if (cleanPath.includes('/users')) return 'ユーザー管理';
    if (cleanPath.includes('/disputes')) return '争議管理';
    if (cleanPath.includes('/analytics')) return 'システム分析';
    if (cleanPath.includes('/invite')) return '管理者招待';
    return '管理画面';
  }

  return titleMap[cleanPath] || 'ダッシュボード';
};

export function DashboardTopbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayName = user.user_metadata?.full_name || user.email || 'ユーザー';
  const avatarUrl = user.user_metadata?.avatar_url;
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold md:text-2xl">{pageTitle}</h1>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/ja/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>プロフィール</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/ja/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>設定</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="cursor-pointer"
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            <span>ログアウト</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
