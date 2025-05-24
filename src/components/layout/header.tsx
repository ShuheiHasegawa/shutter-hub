'use client';

import { Camera, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
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
import { Link } from '@/i18n/routing';

export function Header() {
  const t = useTranslations('navigation');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* ロゴ */}
        <Link href="/" className="flex items-center space-x-2">
          <Camera className="h-6 w-6 text-shutter-primary" />
          <span className="font-bold text-xl">ShutterHub</span>
        </Link>

        {/* デスクトップナビゲーション */}
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

        {/* 右側のアクション */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/auth/signin">{t('signin')}</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">{t('signup')}</Link>
            </Button>
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
              <Link
                href="/photo-sessions/create"
                className="block px-2 py-1 text-lg"
              >
                撮影会を開催
              </Link>
              <Link href="/instant" className="block px-2 py-1 text-lg">
                {t('instant')}
              </Link>
              <Link href="/studios" className="block px-2 py-1 text-lg">
                {t('studios')}
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
