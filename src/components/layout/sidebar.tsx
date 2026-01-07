'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Home,
  Camera,
  Calendar,
  BarChart3,
  Plus,
  List,
  Menu,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Hash,
  Book,
  Users,
  Building,
  Code,
  Heart,
  Zap,
  Ticket,
} from 'lucide-react';
import { useProfile } from '@/hooks/useSimpleProfile';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  key?: string; // セクション展開用のキー（翻訳キー）
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

/**
 * サイドバーナビゲーションの共通ロジックを提供するカスタムフック
 */
function useSidebarNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('navigation');
  const { profile } = useProfile();
  const [openSections, setOpenSections] = useState<string[]>([
    'photoSessions',
    'studio',
  ]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navigate = (href: string) => {
    router.push(href as '/dashboard'); // Type assertion for dynamic routes
  };

  const navItems: NavItem[] = useMemo(
    () => [
      {
        title: t('dashboard'),
        href: '/dashboard',
        icon: Home,
      },
      {
        title: t('calendar'),
        href: '/calendar',
        icon: Calendar,
      },
      {
        title: t('instant'),
        href: '/instant',
        icon: Zap,
      },
      {
        title: t('photoSessions'),
        key: 'photoSessions',
        icon: Camera,
        children: [
          {
            title: t('photoSessionList'),
            href: '/photo-sessions',
            icon: List,
          },
          {
            title: t('photoSessionCreate'),
            href:
              profile?.user_type === 'organizer'
                ? '/photo-sessions/create/organizer'
                : '/photo-sessions/create',
            icon: Plus,
          },
          {
            title: t('photoSessionManage'),
            href: '/dashboard/my-sessions',
            icon: Camera,
          },
          {
            title: t('bookings'),
            href: '/bookings',
            icon: Calendar,
          },
          {
            title: t('priorityTickets'),
            href: '/priority-tickets',
            icon: Ticket,
          },
          {
            title: t('favorites'),
            href: '/favorites?tab=photo_session',
            icon: Heart,
          },
        ],
      },
      {
        title: t('studio'),
        key: 'studio',
        icon: Building,
        children: [
          {
            title: t('studioList'),
            href: '/studios',
            icon: List,
          },
          {
            title: t('studioCreate'),
            href: '/studios/create',
            icon: Plus,
          },
          {
            title: t('favorites'),
            href: '/favorites?tab=studio',
            icon: Heart,
          },
        ],
      },
      {
        title: t('photobook'),
        href: '/photobooks',
        icon: Book,
      },
      {
        title: t('messages'),
        href: '/messages',
        icon: MessageCircle,
      },
      {
        title: t('timeline'),
        href: '/timeline',
        icon: Hash,
      },
      {
        title: t('analytics'),
        href: '/analytics',
        icon: BarChart3,
      },
      ...(profile?.user_type === 'organizer'
        ? [
            {
              title: t('modelList'),
              href: '/models',
              icon: Users,
            },
          ]
        : []),
      // 開発環境でのみ表示
      ...(process.env.NODE_ENV === 'development'
        ? [
            {
              title: t('devTools'),
              href: '/dev',
              icon: Code,
            },
          ]
        : []),
    ],
    [t, profile?.user_type]
  );

  const isActive = (href: string) => {
    const currentPath = String(pathname);
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath.endsWith('/dashboard');
    }
    if (href === '/favorites') {
      return (
        currentPath === '/favorites' || currentPath.startsWith('/favorites')
      );
    }
    // 正確なパスマッチング: 子パスが存在する場合は親パスをアクティブにしない
    if (href === '/photo-sessions') {
      // /photo-sessions の場合のみアクティブ
      // /photo-sessions/create などの子パスは除外
      return (
        currentPath === '/photo-sessions' ||
        (currentPath.startsWith('/photo-sessions/') &&
          !currentPath.startsWith('/photo-sessions/create'))
      );
    }
    if (href === '/photo-sessions/create') {
      return (
        currentPath === '/photo-sessions/create' ||
        currentPath.startsWith('/photo-sessions/create/')
      );
    }
    if (href === '/studios') {
      // /studios の場合のみアクティブ
      // /studios/create などの子パスは除外
      return (
        currentPath === '/studios' ||
        (currentPath.startsWith('/studios/') &&
          !currentPath.startsWith('/studios/create'))
      );
    }
    if (href === '/studios/create') {
      return (
        currentPath === '/studios/create' ||
        currentPath.startsWith('/studios/create/')
      );
    }
    return currentPath.startsWith(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded =
      hasChildren && item.key ? openSections.includes(item.key) : false;

    if (hasChildren) {
      return (
        <Collapsible
          key={item.title}
          open={isExpanded}
          onOpenChange={() => item.key && toggleSection(item.key)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-2 h-10',
                level > 0 && 'ml-4 w-[calc(100%-1rem)]'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.title}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.title}
        variant={isActive(item.href!) ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-2 h-10',
          level > 0 && 'ml-4 w-[calc(100%-1rem)]',
          isActive(item.href!) && 'bg-secondary'
        )}
        onClick={() => navigate(item.href!)}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.title}</span>
        {item.badge && (
          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
            {item.badge}
          </span>
        )}
      </Button>
    );
  };

  return {
    navItems,
    renderNavItem,
    navigate,
  };
}

export function Sidebar({ className }: SidebarProps) {
  const { navItems, renderNavItem, navigate } = useSidebarNavigation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b px-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2"
        >
          <Camera className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">ShutterHub</span>
        </button>
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {navItems.map(item => renderNavItem(item))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* デスクトップサイドバー */}
      <div className={cn('hidden md:flex', className)}>
        <div className="w-64 border-r bg-background">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}

export function MobileSidebarTrigger() {
  const t = useTranslations('navigation');
  const { navItems, renderNavItem } = useSidebarNavigation();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>{t('menu')}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-4">
              {navItems.map(item => renderNavItem(item))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
