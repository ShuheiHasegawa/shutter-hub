'use client';

import { User, LogOut, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { NotificationCenter } from '@/components/instant/NotificationCenter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { MobileSidebarTrigger } from './sidebar';

export function DashboardTopbar() {
  const t = useTranslations('navigation');
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-4 border-b bg-background px-4 sm:static sm:h-12 sm:border-0 sm:bg-transparent sm:px-6">
      <MobileSidebarTrigger />

      <div className="flex items-center gap-2 ml-auto">
        <LanguageToggle />
        <ThemeToggle />

        <NotificationCenter userType="photographer" enableSound={false} />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => (window.location.href = '/messages')}
          className="relative"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.user_metadata?.avatar_url || ''}
                    alt={user.user_metadata?.full_name || user.email || ''}
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user.user_metadata?.full_name && (
                    <p className="font-medium">
                      {user.user_metadata.full_name}
                    </p>
                  )}
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
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
