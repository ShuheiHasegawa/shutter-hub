'use client';

import { useState } from 'react';
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
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('navigation');
  const { profile } = useProfile();
  const [openSections, setOpenSections] = useState<string[]>([
    '撮影会',
    'スタジオ',
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

  const navItems: NavItem[] = [
    {
      title: t('dashboard'),
      href: '/dashboard',
      icon: Home,
    },
    {
      title: 'カレンダー',
      href: '/calendar',
      icon: Calendar,
    },
    {
      title: t('instant'),
      href: '/instant',
      icon: Zap,
    },
    {
      title: 'お気に入り',
      href: '/favorites',
      icon: Heart,
    },
    {
      title: t('photoSessions'),
      icon: Camera,
      children: [
        {
          title: '撮影会一覧',
          href: '/photo-sessions',
          icon: List,
        },
        {
          title: '撮影会作成',
          href:
            profile?.user_type === 'organizer'
              ? '/photo-sessions/create/organizer'
              : '/photo-sessions/create',
          icon: Plus,
        },
        {
          title: '撮影会管理',
          href: '/dashboard/my-sessions',
          icon: Camera,
        },
        {
          title: t('bookings'),
          href: '/bookings',
          icon: Calendar,
        },
        {
          title: '優先チケット管理',
          href: '/priority-tickets',
          icon: Ticket,
        },
        {
          title: 'お気に入り',
          href: '/favorites?tab=photo_session',
          icon: Heart,
        },
      ],
    },
    {
      title: 'スタジオ',
      icon: Building,
      children: [
        {
          title: 'スタジオ一覧',
          href: '/studios',
          icon: List,
        },
        {
          title: 'スタジオ作成',
          href: '/studios/create',
          icon: Plus,
        },
        {
          title: 'お気に入り',
          href: '/favorites?tab=studio',
          icon: Heart,
        },
      ],
    },
    {
      title: 'フォトブック',
      href: '/photobooks',
      icon: Book,
    },
    {
      title: 'メッセージ',
      href: '/messages',
      icon: MessageCircle,
    },
    {
      title: 'タイムライン',
      href: '/timeline',
      icon: Hash,
    },
    {
      title: '統計',
      href: '/analytics',
      icon: BarChart3,
    },
    ...(profile?.user_type === 'organizer'
      ? [
          {
            title: 'モデル一覧',
            href: '/models',
            icon: Users,
          },
        ]
      : []),
    // 開発環境でのみ表示
    ...(process.env.NODE_ENV === 'development'
      ? [
          {
            title: '開発ツール',
            href: '/dev',
            icon: Code,
          },
        ]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.endsWith('/dashboard');
    }
    if (href === '/favorites') {
      return pathname === '/favorites' || pathname.startsWith('/favorites');
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded =
      hasChildren &&
      openSections.includes(item.title.toLowerCase().replace(/\s+/g, '-'));

    if (hasChildren) {
      return (
        <Collapsible
          key={item.title}
          open={isExpanded}
          onOpenChange={() =>
            toggleSection(item.title.toLowerCase().replace(/\s+/g, '-'))
          }
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
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('navigation');
  const { profile } = useProfile();
  const [openSections, setOpenSections] = useState<string[]>([
    '撮影会',
    'スタジオ',
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

  const navItems: NavItem[] = [
    {
      title: t('dashboard'),
      href: '/dashboard',
      icon: Home,
    },
    {
      title: 'カレンダー',
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
      icon: Camera,
      children: [
        {
          title: '撮影会一覧',
          href: '/photo-sessions',
          icon: List,
        },
        {
          title: '撮影会作成',
          href:
            profile?.user_type === 'organizer'
              ? '/photo-sessions/create/organizer'
              : '/photo-sessions/create',
          icon: Plus,
        },
        {
          title: '撮影会管理',
          href: '/dashboard/my-sessions',
          icon: Camera,
        },
        {
          title: t('bookings'),
          href: '/bookings',
          icon: Calendar,
        },
        {
          title: '優先チケット管理',
          href: '/priority-tickets',
          icon: Ticket,
        },
        {
          title: 'お気に入り',
          href: '/favorites?tab=photo_session',
          icon: Heart,
        },
      ],
    },
    {
      title: 'スタジオ',
      icon: Building,
      children: [
        {
          title: 'スタジオ一覧',
          href: '/studios',
          icon: List,
        },
        {
          title: 'スタジオ作成',
          href: '/studios/create',
          icon: Plus,
        },
        {
          title: 'お気に入り',
          href: '/favorites?tab=studio',
          icon: Heart,
        },
      ],
    },
    {
      title: 'フォトブック',
      href: '/photobooks',
      icon: Book,
    },
    {
      title: 'メッセージ',
      href: '/messages',
      icon: MessageCircle,
    },
    {
      title: 'タイムライン',
      href: '/timeline',
      icon: Hash,
    },
    {
      title: '統計',
      href: '/analytics',
      icon: BarChart3,
    },
    ...(profile?.user_type === 'organizer'
      ? [
          {
            title: 'モデル一覧',
            href: '/models',
            icon: Users,
          },
        ]
      : []),
    // 開発環境でのみ表示
    ...(process.env.NODE_ENV === 'development'
      ? [
          {
            title: '開発ツール',
            href: '/dev',
            icon: Code,
          },
        ]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.endsWith('/dashboard');
    }
    if (href === '/favorites') {
      return pathname === '/favorites' || pathname.startsWith('/favorites');
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded =
      hasChildren &&
      openSections.includes(item.title.toLowerCase().replace(/\s+/g, '-'));

    if (hasChildren) {
      return (
        <Collapsible
          key={item.title}
          open={isExpanded}
          onOpenChange={() =>
            toggleSection(item.title.toLowerCase().replace(/\s+/g, '-'))
          }
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
            <SheetTitle>メニュー</SheetTitle>
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
