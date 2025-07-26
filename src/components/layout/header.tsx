'use client';

import { Camera, Menu, User, LogOut, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { NotificationCenter } from '@/components/instant/NotificationCenter';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

// ページタイトルのマッピング（DashboardTopbarから移行）
const getPageTitle = (pathname: string): string => {
  // ロケールプレフィックスを除去
  const cleanPath = pathname.replace(/^\/[a-z]{2}/, '');

  const titleMap: Record<string, string> = {
    '/dashboard': 'ダッシュボード',
    '/dashboard/my-sessions': '自分の撮影会',
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

interface AppHeaderProps {
  variant?: 'default' | 'authenticated' | 'public';
  showPageTitle?: boolean;
  pageTitle?: string;
  showNavigation?: boolean;
}

export function AppHeader({
  variant = 'default',
  showPageTitle = false,
  pageTitle,
  showNavigation = true,
}: AppHeaderProps) {
  const t = useTranslations('navigation');
  const { logout } = useAuth();
  const { user, avatarUrl, displayName } = useProfile();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await logout();
  };

  // ページタイトルを決定
  const resolvedPageTitle = pageTitle || getPageTitle(pathname);

  // authenticated variant (旧DashboardTopbar相当)
  if (variant === 'authenticated') {
    return (
      <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
        {showPageTitle && (
          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold md:text-2xl">
              {resolvedPageTitle}
            </h1>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {user && <NotificationCenter />}
          <LanguageToggle />
          <ThemeToggle />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || ''} alt={displayName} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{displayName}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('profile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <User className="mr-2 h-4 w-4" />
                    <span>設定</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('signout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    );
  }

  // default variant (元のHeader実装)
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center">
        {/* ロゴ */}
        <Link href="/" className="flex items-center space-x-2">
          <Camera className="h-6 w-6 text-shutter-primary" />
          <span className="font-bold text-xl">ShutterHub</span>
        </Link>

        {/* デスクトップナビゲーション */}
        {showNavigation && (
          <NavigationMenu className="hidden md:flex mx-6">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  {t('photoSessions')}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-6 w-[400px]">
                    <NavigationMenuLink asChild>
                      <Link
                        href="/photo-sessions"
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">
                          撮影会を探す
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          開催予定の撮影会を検索・予約
                        </p>
                      </Link>
                    </NavigationMenuLink>
                    {user && (
                      <NavigationMenuLink asChild>
                        <Link
                          href="/photo-sessions/create"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">
                            撮影会を開催
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            新しい撮影会を企画・開催
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    )}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/instant"
                    className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t('instant')}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/studios"
                    className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t('studios')}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        )}

        {/* 右側のアクション */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {user && <NotificationCenter />}
            {user && (
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <LanguageToggle />
            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || ''} alt={displayName} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{displayName}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('profile')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookings">
                      <span className="mr-2">📅</span>
                      <span>{t('bookings')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('signout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/auth/signin">{t('signin')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">{t('signup')}</Link>
                </Button>
              </>
            )}
          </nav>
        </div>

        {/* モバイルメニュー */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden"
              size="icon"
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>メニュー</SheetTitle>
              <SheetDescription>ShutterHub v2のナビゲーション</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Link href="/photo-sessions" className="block px-2 py-1 text-lg">
                撮影会を探す
              </Link>
              {user && (
                <Link
                  href="/photo-sessions/create"
                  className="block px-2 py-1 text-lg"
                >
                  撮影会を開催
                </Link>
              )}
              <Link href="/instant" className="block px-2 py-1 text-lg">
                {t('instant')}
              </Link>
              <Link href="/studios" className="block px-2 py-1 text-lg">
                {t('studios')}
              </Link>
              {user ? (
                <>
                  <Link href="/profile" className="block px-2 py-1 text-lg">
                    {t('profile')}
                  </Link>
                  <Link href="/bookings" className="block px-2 py-1 text-lg">
                    {t('bookings')}
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="justify-start px-2 py-1 text-lg h-auto"
                  >
                    {t('signout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="block px-2 py-1 text-lg">
                    {t('signin')}
                  </Link>
                  <Link href="/auth/signup" className="block px-2 py-1 text-lg">
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

// 後方互換性のためのエイリアス
export const Header = AppHeader;
