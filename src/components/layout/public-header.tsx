'use client';

import { Button } from '@/components/ui/button';
import { Camera, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';

export function PublicHeader() {
  const { theme, setTheme } = useTheme();
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
            <div className="flex items-center gap-4">
              <div className="h-9 w-9" />
              <div className="h-9 w-20" />
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
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Login Button */}
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                router.push('/login');
              }}
            >
              ログイン
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
