'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

// テストアカウント定義
const testAccounts = [
  {
    id: '2d5e8f3a-1b4c-4d6e-9f8a-3c5d7e9f1a2b',
    email: 'ninagawa.mika@testdomain.com',
    password: 'test123456',
    name: '蜷川実花',
    userType: 'photographer' as const,
    icon: Camera,
    description: 'プロフェッショナルフォトグラファー',
  },
  {
    id: '4f7a9c2d-3e6b-5f8c-1a4d-7e9f2c5a8b1d',
    email: 'yuka.kohinata@testdomain.com',
    password: 'test123456',
    name: '小日向ゆか',
    userType: 'model' as const,
    icon: User,
    description: 'プロフェッショナルモデル',
  },
  {
    id: '6b8d1f4e-5c7a-6b9d-2f5e-8c1f4a7b9e2c',
    email: 'kotori.session@testdomain.com',
    password: 'test123456',
    name: 'ことり撮影会',
    userType: 'organizer' as const,
    icon: Users,
    description: '撮影会運営者',
  },
];

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
    account: (typeof testAccounts)[0]
  ) => {
    const supabase = createClient();

    try {
      // まず既存のプロフィールを確認
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId);

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('プロフィール確認エラー:', fetchError);
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
          console.error('プロフィール更新エラー:', error);
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
          console.error('プロフィール作成エラー:', error);
          // トリガーエラーの場合は警告として表示
          if (error.code === '42702') {
            console.warn(
              'データベーストリガーエラーが発生しましたが、ユーザー作成は成功しています'
            );
          }
        }
      }
    } catch (error) {
      console.error('プロフィール処理エラー:', error);
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
      console.error('ユーザー削除エラー:', error);
      toast.error('ユーザー削除中にエラーが発生しました');
    }
  };

  // ログイン処理
  const handleQuickLogin = async (account: (typeof testAccounts)[0]) => {
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
            console.error('ユーザー作成エラー:', createError);
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
      console.error('ログインエラー:', error);
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
      console.error('ログアウトエラー:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`ログアウトに失敗しました: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto py-8">
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
                      <LogOut className="h-4 w-4 mr-2" />
                      ログアウト
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* テストアカウント一覧 */}
        <div className="grid md:grid-cols-3 gap-6">
          {testAccounts.map(account => {
            const Icon = account.icon;
            const isCurrentLoading = loadingAccount === account.id;

            return (
              <Card
                key={account.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{account.name}</CardTitle>
                  <CardDescription>{account.description}</CardDescription>
                  <Badge variant="outline">{account.userType}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Email:</strong> {account.email}
                    </p>
                    <p>
                      <strong>Password:</strong> {account.password}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleQuickLogin(account)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isCurrentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ログイン中...
                      </>
                    ) : (
                      `${account.name}でログイン`
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDeleteUser(account.email)}
                    disabled={isLoading}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    ユーザーを削除
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 使用方法 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>使用方法</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
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
  );
}
