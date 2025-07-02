'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Camera, Users, Verified } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface UserProfileDisplayProps {
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    user_type?: string;
    is_verified?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  showRole?: boolean;
  showVerified?: boolean;
  clickable?: boolean;
  className?: string;
}

export function UserProfileDisplay({
  user,
  size = 'md',
  showRole = true,
  showVerified = true,
  clickable = true,
  className,
}: UserProfileDisplayProps) {
  const router = useRouter();

  const handleClick = () => {
    if (clickable) {
      router.push(`/profile/${user.id}`);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserTypeLabel = (userType?: string) => {
    switch (userType) {
      case 'photographer':
        return 'フォトグラファー';
      case 'model':
        return 'モデル';
      case 'organizer':
        return '主催者';
      default:
        return 'ユーザー';
    }
  };

  const getUserTypeIcon = (userType?: string) => {
    switch (userType) {
      case 'photographer':
        return <Camera className="h-3 w-3" />;
      case 'model':
        return <User className="h-3 w-3" />;
      case 'organizer':
        return <Users className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const sizeClasses = {
    sm: {
      avatar: 'h-8 w-8',
      text: 'text-sm',
      badge: 'text-xs px-2 py-0.5',
    },
    md: {
      avatar: 'h-10 w-10',
      text: 'text-base',
      badge: 'text-xs px-2 py-1',
    },
    lg: {
      avatar: 'h-12 w-12',
      text: 'text-lg',
      badge: 'text-sm px-3 py-1',
    },
  };

  const currentSize = sizeClasses[size];

  const content = (
    <div className="flex items-center gap-3">
      <Avatar className={currentSize.avatar}>
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {user.display_name ? (
            getInitials(user.display_name)
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium truncate', currentSize.text)}>
            {user.display_name || 'ユーザー'}
          </span>
          {showVerified && user.is_verified && (
            <Verified className="h-4 w-4 text-blue-500 flex-shrink-0" />
          )}
        </div>

        {showRole && user.user_type && (
          <Badge
            variant="secondary"
            className={cn('flex items-center gap-1 w-fit', currentSize.badge)}
          >
            {getUserTypeIcon(user.user_type)}
            {getUserTypeLabel(user.user_type)}
          </Badge>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Button
        variant="ghost"
        className={cn(
          'h-auto p-2 justify-start hover:bg-muted/50 transition-colors',
          className
        )}
        onClick={handleClick}
      >
        {content}
      </Button>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>{content}</div>
  );
}
