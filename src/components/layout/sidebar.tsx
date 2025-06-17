'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  Camera,
  Calendar,
  User,
  Settings,
  BarChart3,
  Plus,
  List,
  Clock,
  Menu,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Hash,
  Book,
  Edit3,
} from 'lucide-react';
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
  const [openSections, setOpenSections] = useState<string[]>([
    'photo-sessions',
  ]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navigate = (href: string) => {
    router.push(href);
  };

  const navItems: NavItem[] = [
    {
      title: t('dashboard'),
      href: '/dashboard',
      icon: Home,
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
          href: '/photo-sessions/create',
          icon: Plus,
        },
        {
          title: '自分の撮影会',
          href: '/dashboard/my-sessions',
          icon: Camera,
        },
      ],
    },
    {
      title: t('bookings'),
      icon: Calendar,
      children: [
        {
          title: '予約一覧',
          href: '/bookings',
          icon: Calendar,
        },
        {
          title: 'キャンセル待ち',
          href: '/bookings/waitlist',
          icon: Clock,
        },
      ],
    },
    {
      title: t('profile'),
      href: '/profile',
      icon: User,
    },
    {
      title: t('photobook'),
      icon: Book,
      children: [
        {
          title: t('photobookView'),
          href: '/photobook',
          icon: Book,
        },
        {
          title: t('photobookEdit'),
          href: '/photobook/edit',
          icon: Edit3,
        },
      ],
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
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
    {
      title: t('settings'),
      href: '/settings',
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.endsWith('/dashboard');
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
  const [openSections, setOpenSections] = useState<string[]>([
    'photo-sessions',
  ]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navigate = (href: string) => {
    router.push(href);
  };

  const navItems: NavItem[] = [
    {
      title: t('dashboard'),
      href: '/dashboard',
      icon: Home,
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
          href: '/photo-sessions/create',
          icon: Plus,
        },
        {
          title: '自分の撮影会',
          href: '/dashboard/my-sessions',
          icon: Camera,
        },
      ],
    },
    {
      title: t('bookings'),
      icon: Calendar,
      children: [
        {
          title: '予約一覧',
          href: '/bookings',
          icon: Calendar,
        },
        {
          title: 'キャンセル待ち',
          href: '/bookings/waitlist',
          icon: Clock,
        },
      ],
    },
    {
      title: t('profile'),
      href: '/profile',
      icon: User,
    },
    {
      title: t('photobook'),
      icon: Book,
      children: [
        {
          title: t('photobookView'),
          href: '/photobook',
          icon: Book,
        },
        {
          title: t('photobookEdit'),
          href: '/photobook/edit',
          icon: Edit3,
        },
      ],
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
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
    {
      title: t('settings'),
      href: '/settings',
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.endsWith('/dashboard');
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
      </SheetContent>
    </Sheet>
  );
}
