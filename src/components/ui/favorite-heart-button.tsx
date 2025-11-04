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
  // 一括データから初期状態を設定する場合
  initialState?: {
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
  const [isFavorited, setIsFavorited] = useState(
    initialState?.isFavorited || false
  );
  const [favoriteCount, setFavoriteCount] = useState(
    initialState?.favoriteCount || 0
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    initialState?.isAuthenticated ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [isInitialized, setIsInitialized] = useState(!!initialState);

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

  // 初期状態を設定（一度だけ実行）
  useEffect(() => {
    // initialStateがある場合は既に初期化済み
    if (initialState || isInitialized) return;

    Logger.debug('[FavoriteHeartButton] useEffect実行 - 個別取得開始', {
      favoriteType,
      favoriteId,
    });

    // 一括データがない場合は個別に取得（フォールバック）
    async function fetchInitialState() {
      try {
        Logger.debug('[FavoriteHeartButton] お気に入り状態取得開始', {
          favoriteType,
          favoriteId,
          timestamp: new Date().toISOString(),
        });

        const result = await checkFavoriteStatusAction(
          favoriteType,
          favoriteId
        );

        Logger.debug('[FavoriteHeartButton] Server Actionレスポンス受信', {
          result,
          resultType: typeof result,
          isUndefined: result === undefined,
          isNull: result === null,
          hasSuccess: result && 'success' in result,
          favoriteType,
          favoriteId,
        });

        // resultがundefinedでないことを確認
        if (
          result &&
          typeof result === 'object' &&
          'success' in result &&
          result.success
        ) {
          Logger.debug('[FavoriteHeartButton] 有効なレスポンス - 状態を設定', {
            isFavorited: result.isFavorited,
            favoriteCount: result.favoriteCount,
            isAuthenticated: result.isAuthenticated,
          });
          setIsFavorited(result.isFavorited || false);
          setFavoriteCount(result.favoriteCount || 0);
          setIsAuthenticated(result.isAuthenticated || false);
        } else {
          // resultがundefinedまたは無効な形式の場合
          if (result === undefined) {
            Logger.error(
              '[FavoriteHeartButton] お気に入り状態取得失敗 - Server Actionがundefinedを返しました',
              {
                favoriteType,
                favoriteId,
                callStack: new Error().stack,
              }
            );
          } else if (result === null) {
            Logger.error(
              '[FavoriteHeartButton] お気に入り状態取得失敗 - Server Actionがnullを返しました',
              {
                favoriteType,
                favoriteId,
              }
            );
          } else {
            Logger.error(
              '[FavoriteHeartButton] お気に入り状態取得失敗 - レスポンスが無効:',
              {
                result,
                resultType: typeof result,
                resultKeys:
                  result && typeof result === 'object'
                    ? Object.keys(result)
                    : [],
                favoriteType,
                favoriteId,
              }
            );
          }
          // デフォルト値を設定
          setIsFavorited(false);
          setFavoriteCount(0);
          setIsAuthenticated(false);
        }
      } catch (error) {
        Logger.error('[FavoriteHeartButton] お気に入り状態取得エラー:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          favoriteType,
          favoriteId,
        });
        // エラー時もデフォルト値を設定
        setIsFavorited(false);
        setFavoriteCount(0);
        setIsAuthenticated(false);
      } finally {
        Logger.debug('[FavoriteHeartButton] 初期化完了', {
          favoriteType,
          favoriteId,
        });
        setIsInitialized(true);
      }
    }

    fetchInitialState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // お気に入りのトグル処理
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('お気に入り機能を利用するにはログインが必要です');
      return;
    }

    if (isPending) {
      return;
    }

    startTransition(async () => {
      try {
        // 現在の状態を保存（復元用）
        const previousFavorited = isFavorited;
        const previousCount = favoriteCount;

        // 楽観的更新
        const optimisticFavorited = !isFavorited;
        const optimisticCount = favoriteCount + (optimisticFavorited ? 1 : -1);

        setIsFavorited(optimisticFavorited);
        setFavoriteCount(Math.max(0, optimisticCount));

        // Server Action呼び出しにエラーハンドリング強化
        const result = await toggleFavoriteAction(
          favoriteType,
          favoriteId
        ).catch(error => {
          Logger.error('[FavoriteHeartButton] Server Action Error:', error);
          return {
            success: false,
            error: 'Server Action呼び出しエラー',
            isAuthenticated: true,
          };
        });

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
