'use client';

import { useState, useEffect } from 'react';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import Link from 'next/link';
import { GalleryVerticalEnd } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SignInPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'ja';
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { user, loading, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  // ログイン済みチェック
  useEffect(() => {
    if (!loading && user) {
      setShowWarning(true);
    }
  }, [user, loading]);

  // ログアウトして続ける処理
  const handleLogoutAndContinue = async () => {
    setShowWarning(false);
    await logout();
    // ログアウト後は自動的にサインインページにリダイレクトされる
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="min-h-full p-6 md:p-10 lg:flex lg:items-center lg:justify-center relative">
            {/* ShutterHubロゴ - 左上に絶対配置 */}
            <div className="absolute top-6 left-6 md:top-10 md:left-10 z-10">
              <Link
                href={`/${locale}`}
                className="flex items-center gap-2 font-medium"
              >
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                ShutterHub
              </Link>
            </div>

            {/* 中央配置のカード */}
            <div className="bg-muted w-full max-w-sm md:max-w-4xl rounded-lg shadow-lg overflow-hidden mt-16 lg:mt-0 mb-6 lg:mb-0">
              <div className="grid lg:grid-cols-2 gap-0 rounded-lg shadow-lg overflow-hidden">
                {/* 画像エリア（スマホ: 上部、PC: 左側） */}
                <div className="bg-muted relative min-h-[200px] lg:min-h-[600px]">
                  <Image
                    src="/images/sample.png"
                    alt="ShutterHub"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>

                {/* フォームエリア（スマホ: 下部、PC: 右側） */}
                <div className="flex flex-col gap-4 p-6 md:p-10 bg-white dark:bg-gray-800">
                  <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs space-y-6">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                          アカウントにサインイン
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          撮影会予約プラットフォーム
                        </p>
                      </div>

                      {/* メール＆パスワード認証フォーム */}
                      <EmailPasswordForm
                        value={activeTab}
                        onValueChange={setActiveTab}
                      />

                      {/* 区切り線とOAuthボタン（サインインタブの時のみ表示） */}
                      {activeTab === 'signin' && (
                        <>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                                または
                              </span>
                            </div>
                          </div>

                          {/* OAuth認証ボタン */}
                          <OAuthButtons />
                        </>
                      )}

                      <div className="text-center">
                        <Link href={`/${locale}`} className="text-sm">
                          ホームに戻る
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 既存ログイン警告ダイアログ */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>既にログインしています</AlertDialogTitle>
            <AlertDialogDescription>
              現在のアカウントでログイン中です。別のアカウントでログインする場合は、一度ログアウトしてください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => router.push(`/${locale}/dashboard`)}
            >
              ダッシュボードに戻る
            </AlertDialogAction>
            <AlertDialogAction onClick={handleLogoutAndContinue}>
              ログアウトして続ける
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
