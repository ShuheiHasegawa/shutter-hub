'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, Zap, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    icon: Home,
    label: 'ホーム',
    href: '/',
  },
  {
    icon: Search,
    label: '検索',
    href: '/search',
  },
  {
    icon: Calendar,
    label: '予約',
    href: '/bookings',
  },
  {
    icon: Zap,
    label: '即座撮影',
    href: '/instant',
  },
  {
    icon: User,
    label: 'プロフィール',
    href: '/profile',
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 text-xs transition-colors',
                isActive
                  ? 'text-shutter-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn('h-5 w-5', isActive && 'text-shutter-primary')}
              />
              <span className={cn('text-xs', isActive && 'font-medium')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
