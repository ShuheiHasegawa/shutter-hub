'use client';

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Camera,
  Calendar,
  MessageCircle,
  Hash,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';

export function BottomNavigation() {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  const navigationItems = [
    {
      icon: LayoutDashboard,
      label: t('dashboard'),
      href: '/dashboard',
      key: 'dashboard',
    },
    {
      icon: Camera,
      label: t('photoSessions'),
      href: '/photo-sessions',
      key: 'photoSessions',
    },
    {
      icon: Calendar,
      label: t('bookings'),
      href: '/bookings',
      key: 'bookings',
    },
    {
      icon: MessageCircle,
      label: t('messages'),
      href: '/messages',
      key: 'messages',
    },
    {
      icon: Hash,
      label: t('timeline'),
      href: '/timeline',
      key: 'timeline',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map(item => {
          const Icon = item.icon;
          // ロケールプレフィックスを考慮したパスマッチング
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + '/') ||
            (item.href !== '/' && pathname.endsWith(item.href));

          return (
            <Link
              key={item.key}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={item.href as any}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0',
                isActive
                  ? 'text-shutter-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive && 'text-shutter-primary'
                )}
              />
              <span className="text-[10px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
