'use client';

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { Provider as SupabaseProvider } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Supabaseがサポートするプロバイダー + LINE（型定義に含まれていないが実際にはサポートされている可能性）
type Provider = SupabaseProvider | 'line';

interface OAuthButtonProps {
  provider: Provider;
  children: React.ReactNode;
  className?: string;
}

export function OAuthButton({
  provider,
  children,
  className = '',
}: OAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const params = useParams();
  const locale = params.locale || 'ja';
  const t = useTranslations('auth.oauth');

  const handleOAuthSignIn = async () => {
    try {
      setIsLoading(true);

      // 既存セッションをチェック
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // ログイン済みの場合は自動ログアウト
        toast.info('現在のアカウントからログアウトしています...');
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          logger.error('ログアウトエラー:', signOutError);
          toast.error('ログアウトに失敗しました');
          setIsLoading(false);
          return;
        }

        // 少し待機してセッションクリアを確実にする
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // LINEはSupabaseの型定義に含まれていないが、実際にはサポートされている可能性がある
      // 型アサーションを使用してエラーを回避
      const options: {
        redirectTo: string;
        queryParams?: Record<string, string>;
      } = {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
      };

      // Google専用のqueryParams（X/Twitterでは不要）
      if (provider === 'google') {
        options.queryParams = {
          access_type: 'offline',
          prompt: 'consent',
        };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as SupabaseProvider,
        options,
      });

      if (error) {
        logger.error(`${provider}認証エラー:`, {
          error,
          message: error.message,
          status: error.status,
          provider,
          redirectTo: options.redirectTo,
        });
        toast.error(t('error'), {
          description: error.message || t('errorDescription'),
        });
      } else if (data?.url) {
        // OAuth認証が正常に開始された場合、リダイレクトURLをログに記録
        logger.info(`${provider}認証開始:`, {
          provider,
          redirectTo: options.redirectTo,
          oauthUrl: data.url,
        });
      }
    } catch (error) {
      logger.error('予期しないエラー:', error);
      toast.error(t('error'), {
        description: t('unexpectedError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleOAuthSignIn}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-3 ${className}`}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </Button>
  );
}

// Google専用コンポーネント（後方互換性のため）
export function GoogleSignInButton() {
  return (
    <OAuthButton provider="google">
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Googleでサインイン
    </OAuthButton>
  );
}
