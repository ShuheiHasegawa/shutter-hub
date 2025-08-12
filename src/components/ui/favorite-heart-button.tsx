'use client';

import { useState, useEffect, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  toggleFavoriteAction,
  checkFavoriteStatusAction,
} from '@/app/actions/favorites';
import Logger from '@/lib/logger';

interface FavoriteHeartButtonProps {
  favoriteType: 'studio' | 'photo_session';
  favoriteId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  iconOnly?: boolean;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'inline';
  onToggle?: (isFavorited: boolean, favoriteCount: number) => void;
}

export function FavoriteHeartButton({
  favoriteType,
  favoriteId,
  className,
  size = 'md',
  showCount = false,
  variant = 'ghost',
  iconOnly = false,
  position = 'inline',
  onToggle,
}: FavoriteHeartButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isInitialized, setIsInitialized] = useState(false);

  // サイズの設定
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // ポジションの設定
  const positionClasses = {
    'top-right': 'absolute top-2 right-2 z-10',
    'top-left': 'absolute top-2 left-2 z-10',
    'bottom-right': 'absolute bottom-2 right-2 z-10',
    'bottom-left': 'absolute bottom-2 left-2 z-10',
    inline: '',
  };

  // 初期状態を取得
  useEffect(() => {
    async function fetchInitialState() {
      try {
        const result = await checkFavoriteStatusAction(
          favoriteType,
          favoriteId
        );
        if (result.success) {
          setIsFavorited(result.isFavorited || false);
          setFavoriteCount(result.favoriteCount || 0);
          setIsAuthenticated(result.isAuthenticated || false);
        }
      } catch (error) {
        Logger.error('Failed to fetch favorite status:', error);
      } finally {
        setIsInitialized(true);
      }
    }

    fetchInitialState();
  }, [favoriteType, favoriteId]);

  // お気に入りのトグル処理
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    Logger.info('🚀 ハートボタンクリック開始', {
      favoriteType,
      favoriteId,
      isAuthenticated,
      isFavorited,
      favoriteCount,
    });

    if (!isAuthenticated) {
      Logger.error('❌ 未認証でハートボタンクリック');
      toast.error('お気に入り機能を利用するにはログインが必要です');
      return;
    }

    if (isPending) {
      Logger.error('⏳ 処理中のためスキップ');
      return;
    }

    startTransition(async () => {
      try {
        // 楽観的更新
        const optimisticFavorited = !isFavorited;
        const optimisticCount = favoriteCount + (optimisticFavorited ? 1 : -1);

        Logger.info('🔄 楽観的更新実行', {
          optimisticFavorited,
          optimisticCount,
        });

        setIsFavorited(optimisticFavorited);
        setFavoriteCount(Math.max(0, optimisticCount));

        Logger.info('📡 Server Action呼び出し開始', {
          favoriteType,
          favoriteId,
        });

        const result = await toggleFavoriteAction(favoriteType, favoriteId);

        Logger.info('📡 Server Action結果', result);

        if (result.success && result.data) {
          // サーバーからの正確な結果で更新
          setIsFavorited(result.data.is_favorited);
          setFavoriteCount(result.data.total_favorites);

          toast.success(result.data.message);

          // コールバック実行
          if (onToggle) {
            onToggle(result.data.is_favorited, result.data.total_favorites);
          }
        } else {
          // エラー時は元に戻す
          setIsFavorited(!optimisticFavorited);
          setFavoriteCount(favoriteCount);

          if (!result.isAuthenticated) {
            setIsAuthenticated(false);
            toast.error('認証が必要です。再度ログインしてください。');
          } else {
            toast.error(result.error || 'お気に入りの操作に失敗しました');
          }
        }
      } catch (error) {
        // エラー時は元に戻す
        setIsFavorited(!isFavorited);
        setFavoriteCount(favoriteCount);
        Logger.error('Toggle favorite error:', error);
        toast.error('システムエラーが発生しました');
      }
    });
  };

  // 初期化中はスケルトンを表示
  if (!isInitialized) {
    return (
      <div
        className={cn(
          'rounded-full bg-background/80 backdrop-blur-sm',
          sizeClasses[size],
          positionClasses[position],
          'animate-pulse'
        )}
      />
    );
  }

  // 未認証時のハート表示（クリック不可）
  if (isAuthenticated === false) {
    return (
      <div
        className={cn(
          'flex items-center gap-1',
          positionClasses[position],
          className
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm',
            sizeClasses[size],
            'opacity-60'
          )}
        >
          <Heart
            className={cn(iconSizeClasses[size], 'text-muted-foreground')}
          />
        </div>
        {showCount && favoriteCount > 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            {favoriteCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        positionClasses[position],
        className
      )}
    >
      <Button
        variant={variant}
        size="icon"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          sizeClasses[size],
          'rounded-full bg-background/80 backdrop-blur-sm border-0',
          'hover:bg-background/90 transition-all duration-200',
          'focus:ring-2 focus:ring-pink-500/20',
          isPending && 'animate-pulse',
          // お気に入り状態でのスタイル
          isFavorited && [
            'bg-pink-50/90 hover:bg-pink-100/90',
            'text-pink-600 hover:text-pink-700',
          ]
        )}
        aria-label={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
      >
        <Heart
          className={cn(
            iconSizeClasses[size],
            'transition-all duration-200',
            isFavorited
              ? 'fill-current text-pink-600'
              : 'text-muted-foreground hover:text-pink-500',
            isPending && 'scale-90'
          )}
        />
      </Button>

      {showCount && favoriteCount > 0 && (
        <span
          className={cn(
            'text-xs font-medium transition-colors',
            isFavorited ? 'text-pink-600' : 'text-muted-foreground'
          )}
        >
          {favoriteCount}
        </span>
      )}

      {!iconOnly && showCount === false && (
        <span
          className={cn(
            'text-xs font-medium ml-1 transition-colors hidden sm:inline',
            isFavorited ? 'text-pink-600' : 'text-muted-foreground'
          )}
        >
          {isFavorited ? 'お気に入り済み' : 'お気に入り'}
        </span>
      )}
    </div>
  );
}

// プリセットコンポーネント

// カード右上用
export function CardFavoriteButton(
  props: Omit<FavoriteHeartButtonProps, 'position' | 'variant' | 'iconOnly'>
) {
  return (
    <FavoriteHeartButton
      {...props}
      position="top-right"
      variant="ghost"
      iconOnly
      className="shadow-sm"
    />
  );
}

// インライン用（テキスト付き）
export function InlineFavoriteButton(
  props: Omit<FavoriteHeartButtonProps, 'position' | 'iconOnly'>
) {
  return <FavoriteHeartButton {...props} position="inline" iconOnly={false} />;
}

// カウント表示付き
export function FavoriteButtonWithCount(
  props: Omit<FavoriteHeartButtonProps, 'showCount'>
) {
  return <FavoriteHeartButton {...props} showCount />;
}
