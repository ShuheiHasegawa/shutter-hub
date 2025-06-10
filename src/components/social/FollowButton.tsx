'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { followUser, unfollowUser } from '@/app/actions/follow';
import { UserPlus, UserMinus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FollowStatus } from '@/types/social';

interface FollowButtonProps {
  userId: string;
  isFollowing?: boolean;
  followStatus?: FollowStatus;
  isMutualFollow?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showIcon?: boolean;
  disabled?: boolean;
}

export function FollowButton({
  userId,
  isFollowing = false,
  followStatus,
  isMutualFollow = false,
  className,
  size = 'md',
  variant = 'default',
  showIcon = true,
  disabled = false,
}: FollowButtonProps) {
  const t = useTranslations('social.follow');
  const [isPending, startTransition] = useTransition();
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
  const [localFollowStatus, setLocalFollowStatus] = useState(followStatus);

  const handleFollowAction = async () => {
    if (disabled || isPending) return;

    startTransition(async () => {
      try {
        if (localIsFollowing) {
          // アンフォロー
          const result = await unfollowUser(userId);
          if (result.success) {
            setLocalIsFollowing(false);
            setLocalFollowStatus(undefined);
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
        } else {
          // フォロー
          const result = await followUser(userId);
          if (result.success) {
            setLocalIsFollowing(true);
            setLocalFollowStatus(result.follow_status);
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
        }
      } catch (error) {
        console.error('Follow action error:', error);
        toast.error(t('error'));
      }
    });
  };

  // ボタンの状態を決定
  const getButtonConfig = () => {
    if (localFollowStatus === 'pending') {
      return {
        text: t('pending'),
        icon: Clock,
        variant: 'outline' as const,
        disabled: true,
      };
    }

    if (localIsFollowing) {
      return {
        text: isMutualFollow ? t('mutualFollow') : t('unfollow'),
        icon: UserMinus,
        variant: 'outline' as const,
        disabled: false,
      };
    }

    return {
      text: t('follow'),
      icon: UserPlus,
      variant: variant,
      disabled: false,
    };
  };

  const buttonConfig = getButtonConfig();
  const Icon = buttonConfig.icon;

  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4',
    lg: 'h-10 px-6',
  };

  return (
    <Button
      onClick={handleFollowAction}
      disabled={disabled || isPending || buttonConfig.disabled}
      variant={buttonConfig.variant}
      size="sm"
      className={cn(sizeClasses[size], 'relative', className)}
    >
      {showIcon && (
        <Icon
          className={cn(
            'h-4 w-4',
            size === 'sm' ? 'h-3 w-3' : '',
            size === 'lg' ? 'h-5 w-5' : '',
            buttonConfig.text ? 'mr-2' : ''
          )}
        />
      )}
      {isPending ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          {t('processing')}
        </div>
      ) : (
        buttonConfig.text
      )}
    </Button>
  );
}
