'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSimpleProfile';
import { NavLink } from '@/components/ui/nav-link';
import { ThemePaletteSelector } from '@/components/ui/theme-palette-selector';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function PublicHeader() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();
  const { user, avatarUrl, displayName } = useProfile();

  const handleSignOut = async () => {
    await logout();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur surface-primary">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">ShutterHub</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9" /> {/* パレット選択ボタン */}
              <div className="h-9 w-9" /> {/* ダークモード切り替えボタン */}
              <div className="h-8 w-8 ml-2" />{' '}
              {/* ユーザーアイコン/ログインボタン */}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Camera className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">ShutterHub</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink
              href="/"
              className="text-sm font-medium transition-colors"
              variant="sideline"
            >
              ホーム
            </NavLink>
            <NavLink
              href="/instant"
              className="text-sm font-medium transition-colors"
              variant="sideline"
            >
              即座撮影
            </NavLink>
            <NavLink
              href="/dashboard"
              className="text-sm font-medium transition-colors"
              variant="sideline"
            >
              ダッシュボード
            </NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* カラーパレット選択 */}
            <ThemePaletteSelector />

            {/* ダークモード切り替え */}
            <ThemeToggle />

            {/* User Authentication */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full ml-2"
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
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>ダッシュボード</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (user) {
                        router.push(`/profile/${user.id}`);
                      } else {
                        router.push('/auth/signin');
                      }
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>プロフィール</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ログアウト</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="cta"
                onClick={() => {
                  router.push('/login');
                }}
                className="ml-2"
              >
                ログイン
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
