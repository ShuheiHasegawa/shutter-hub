'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  User,
  Users,
  AlertTriangle,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  testAccounts,
  malymoonModels,
  type TestAccount,
} from './data/testAccounts';
import { AccountSection } from './components/AccountSection';

export default function TestLoginPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 開発環境チェック
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isDevelopment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            この機能は開発環境でのみ利用可能です。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // プロフィール作成/更新
  const createOrUpdateProfile = async (
    userId: string,
    account: TestAccount
  ) => {
    const supabase = createClient();

    try {
      // まず既存のプロフィールを確認
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId);

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('プロフィール確認エラー:', fetchError);
        return;
      }

      if (existingProfile && existingProfile.length > 0) {
        // 既存のプロフィールがある場合は更新
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: account.name,
            user_type: account.userType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) {
          logger.error('プロフィール更新エラー:', error);
        }
      } else {
        // 新規プロフィールを作成
        const { error } = await supabase.from('profiles').insert({
          id: userId,
          email: account.email,
          display_name: account.name,
          user_type: account.userType,
        });

        if (error) {
          logger.error('プロフィール作成エラー:', error);
          // トリガーエラーの場合は警告として表示
          if (error.code === '42702') {
            logger.warn(
              'データベーストリガーエラーが発生しましたが、ユーザー作成は成功しています'
            );
          }
        }
      }
    } catch (error) {
      logger.error('プロフィール処理エラー:', error);
    }
  };

  // ユーザー削除処理
  const handleDeleteUser = async (email: string) => {
    if (
      !confirm(`${email} のユーザーを削除しますか？この操作は元に戻せません。`)
    ) {
      return;
    }

    try {
      const response = await fetch('/api/dev/delete-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${email} のユーザーを削除しました`);
      } else {
        toast.error(`削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      logger.error('ユーザー削除エラー:', error);
      toast.error('ユーザー削除中にエラーが発生しました');
    }
  };

  // ログイン処理
  const handleQuickLogin = async (account: TestAccount) => {
    if (isLoading) return;

    setIsLoading(true);
    setLoadingAccount(account.id);

    try {
      // まずログインを試行
      const supabase = createClient();
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        });

      if (loginError) {
        // ユーザーが存在しない場合は、MCPを使って作成
        if (loginError.message.includes('Invalid login credentials')) {
          toast.info('アカウントが存在しません。作成しています...');

          // MCPを使ってユーザーを作成（開発環境のみ）
          try {
            const response = await fetch('/api/dev/create-test-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: account.email,
                password: account.password,
                name: account.name,
                userType: account.userType,
              }),
            });

            if (!response.ok) {
              throw new Error('ユーザー作成APIの呼び出しに失敗しました');
            }

            const result = await response.json();

            if (result.error) {
              throw new Error(result.error);
            }

            // 作成後、再度ログインを試行
            const { data: retryLoginData, error: retryLoginError } =
              await supabase.auth.signInWithPassword({
                email: account.email,
                password: account.password,
              });

            if (retryLoginError) {
              throw retryLoginError;
            }

            if (retryLoginData?.user) {
              await createOrUpdateProfile(retryLoginData.user.id, account);
              toast.success(`${account.name}としてログインしました`);
              router.push('/ja/dashboard');
              return;
            }
          } catch (createError) {
            logger.error('ユーザー作成エラー:', createError);
            throw new Error(
              `ユーザー作成に失敗しました: ${createError instanceof Error ? createError.message : 'Unknown error'}`
            );
          }
        } else {
          throw loginError;
        }
      } else if (loginData?.user) {
        // ログイン成功
        await createOrUpdateProfile(loginData.user.id, account);
        toast.success(`${account.name}としてログインしました`);
        router.push('/ja/dashboard');
      }
    } catch (error: unknown) {
      logger.error('ログインエラー:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`ログインに失敗しました: ${message}`);
    } finally {
      setIsLoading(false);
      setLoadingAccount(null);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await logout();
      toast.success('ログアウトしました');
    } catch (error: unknown) {
      logger.error('ログアウトエラー:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`ログアウトに失敗しました: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 py-8 pb-16">
            {/* 警告バナー */}
            <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>開発環境専用機能</strong> - 本番環境では利用できません
              </AlertDescription>
            </Alert>

            {/* ヘッダー */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                テストログイン
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                開発・テスト用のアカウントでログインできます
              </p>
            </div>

            {/* 現在のログイン状態 */}
            {user && (
              <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="text-green-800 dark:text-green-200">
                    現在ログイン中
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {user.email}
                      </p>
                      {user.user_metadata?.user_type && (
                        <Badge variant="secondary" className="mt-1">
                          {user.user_metadata.user_type}
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={handleLogout}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="h-4 w-4" />
                          ログアウト
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* テストアカウント一覧 */}
            <div className="space-y-8">
              <AccountSection
                title="📸 有名カメラマン（6名）"
                icon={Camera}
                iconColor="text-blue-600"
                accounts={testAccounts.filter(
                  account => account.userType === 'photographer'
                )}
                isLoading={isLoading}
                loadingAccount={loadingAccount}
                onLogin={handleQuickLogin}
                onDelete={handleDeleteUser}
                colorTheme="blue"
              />

              <AccountSection
                title="🌟 有名モデル・女優（6名）"
                icon={User}
                iconColor="text-pink-600"
                accounts={testAccounts.filter(
                  account => account.userType === 'model'
                )}
                isLoading={isLoading}
                loadingAccount={loadingAccount}
                onLogin={handleQuickLogin}
                onDelete={handleDeleteUser}
                colorTheme="pink"
              />

              <AccountSection
                title="🎬 撮影会運営者（7名）"
                icon={Users}
                iconColor="text-purple-600"
                accounts={testAccounts.filter(
                  account => account.userType === 'organizer'
                )}
                isLoading={isLoading}
                loadingAccount={loadingAccount}
                onLogin={handleQuickLogin}
                onDelete={handleDeleteUser}
                colorTheme="purple"
              />

              <AccountSection
                title={`🌙 Malymoon（マリームーン）所属モデル（${malymoonModels.length}名）`}
                icon={User}
                iconColor="text-rose-600"
                accounts={malymoonModels}
                isLoading={isLoading}
                loadingAccount={loadingAccount}
                onLogin={handleQuickLogin}
                onDelete={handleDeleteUser}
                colorTheme="rose"
                gridCols="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              />
            </div>

            {/* 使用方法 */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>使用方法</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  1.
                  上記のテストアカウントから任意のアカウントを選択してログインボタンをクリック
                </p>
                <p>2. アカウントが存在しない場合は自動的に作成されます</p>
                <p>3. ログイン後、ダッシュボードページにリダイレクトされます</p>
                <p>4. 開発・テスト作業が完了したらログアウトしてください</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
