'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';

export function PublicHeader() {
  const { settings, setPalette, toggleDarkMode, availablePalettes } =
    useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-shutter-primary" />
              <span className="text-xl font-bold text-foreground">
                ShutterHub
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9" /> {/* パレット選択ボタン */}
              <div className="h-9 w-9" /> {/* ダークモード切り替えボタン */}
              <div className="h-9 w-20 ml-2" /> {/* ログインボタン */}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Camera className="h-8 w-8 text-shutter-primary" />
            <span className="text-xl font-bold text-foreground">
              ShutterHub
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/instant"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              即座撮影
            </Link>
            <Link
              href="/photo-sessions"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              撮影会を探す
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* カラーパレット選択 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Palette className="h-4 w-4" />
                  <span className="sr-only">テーマ選択</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>カラーテーマ</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availablePalettes.map(palette => (
                  <DropdownMenuItem
                    key={palette.name}
                    onClick={() => setPalette(palette.name)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: palette.colors.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: palette.colors.secondary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: palette.colors.accent }}
                      />
                    </div>
                    <span className="text-sm">{palette.name}</span>
                    {settings.palette === palette.name && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        ●
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* ダークモード切り替え */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">ダークモード切り替え</span>
            </Button>

            {/* Login Button */}
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                router.push('/login');
              }}
              className="ml-2"
            >
              ログイン
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
