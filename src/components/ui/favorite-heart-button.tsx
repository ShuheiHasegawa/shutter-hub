'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toggleFavoriteAction } from '@/app/actions/favorites';
import Logger from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

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
  // 一括データから初期状態を設定（必須: useFavoriteStates経由で渡される）
  initialState: {
    isFavorited: boolean;
    favoriteCount: number;
    isAuthenticated: boolean;
  };
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
  initialState,
}: FavoriteHeartButtonProps) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(initialState.isFavorited);
  const [favoriteCount, setFavoriteCount] = useState(
    initialState.favoriteCount
  );
  const [isLoading, setIsLoading] = useState(false);

  // initialStateが変更されたときに状態を更新
  useEffect(() => {
    setIsFavorited(initialState.isFavorited);
    setFavoriteCount(initialState.favoriteCount);
  }, [initialState.isFavorited, initialState.favoriteCount]);

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
    'top-right': 'absolute top-2 right-2 z-20',
    'top-left': 'absolute top-2 left-2 z-20',
    'bottom-right': 'absolute bottom-2 right-2 z-20',
    'bottom-left': 'absolute bottom-2 left-2 z-20',
    inline: '',
  };

  // initialStateから直接状態を初期化（useEffectでの個別取得は削除）

  // 未認証時は非表示
  if (!initialState.isAuthenticated || !user) {
    return null;
  }

  // お気に入りのトグル処理
  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    // イベントのデフォルト動作と伝播を確実に停止
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) {
      return;
    }

    // 現在の状態を保存（復元用）
    const previousFavorited = isFavorited;
    const previousCount = favoriteCount;

    // 楽観的更新（即座に反映）
    const optimisticFavorited = !isFavorited;
    const optimisticCount = favoriteCount + (optimisticFavorited ? 1 : -1);

    setIsFavorited(optimisticFavorited);
    setFavoriteCount(Math.max(0, optimisticCount));
    setIsLoading(true);

    // 非同期処理を開始
    toggleFavoriteAction(favoriteType, favoriteId)
      .then(result => {
        if (result.success && 'data' in result && result.data) {
          // サーバーからの正確な結果で更新
          const serverFavorited = result.data.is_favorited;
          const serverCount = result.data.total_favorites;

          setIsFavorited(serverFavorited);
          setFavoriteCount(serverCount);

          toast.success(result.data.message);

          // コールバック実行
          if (onToggle) {
            onToggle(serverFavorited, serverCount);
          }
        } else {
          // エラー時は元に戻す
          setIsFavorited(previousFavorited);
          setFavoriteCount(previousCount);

          toast.error(result.error || 'お気に入りの操作に失敗しました');
        }
      })
      .catch(error => {
        // エラー時は元に戻す
        setIsFavorited(previousFavorited);
        setFavoriteCount(previousCount);
        Logger.error('[FavoriteHeartButton] Toggle favorite error:', error);
        toast.error('システムエラーが発生しました');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // iconOnly=falseの場合、ボタン全体（アイコン+テキスト）をクリック可能にする
  if (!iconOnly) {
    // Buttonコンポーネントのsizeは "default" | "sm" | "lg" | "icon" のみ
    const buttonSize = size === 'md' ? 'default' : size === 'sm' ? 'sm' : 'lg';

    return (
      <div
        className={cn(
          'flex items-center',
          positionClasses[position],
          className
        )}
      >
        <Button
          type="button"
          variant={variant}
          size={buttonSize}
          onClick={handleToggle}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2',
            'transition-all duration-200',
            isLoading && 'animate-pulse',
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
                : 'hover:text-pink-500',
              isLoading && 'scale-90'
            )}
          />
          {showCount && favoriteCount > 0 ? (
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                isFavorited ? 'text-pink-600' : 'text-muted-foreground'
              )}
            >
              {favoriteCount}
            </span>
          ) : (
            <span className="text-xs font-medium transition-colors hidden sm:inline">
              お気に入り
            </span>
          )}
        </Button>
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
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <Button
        type="button"
        variant={variant}
        size="icon"
        onClick={handleToggle}
        disabled={isLoading}
        data-favorite-button="true"
        className={cn(
          sizeClasses[size],
          'rounded-full bg-background/80 backdrop-blur-sm border-0',
          'hover:bg-background/90 transition-all duration-200',
          'focus:ring-2 focus:ring-pink-500/20',
          isLoading && 'animate-pulse',
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
            isLoading && 'scale-90'
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
