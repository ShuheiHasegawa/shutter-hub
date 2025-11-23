'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
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
  // 📸 有名カメラマン
  {
    id: '2d5e8f3a-1b4c-4d6e-9f8a-3c5d7e9f1a2b',
    email: 'ninagawa.mika@testdomain.com',
    password: 'test123456',
    name: '蜷川実花',
    userType: 'photographer' as const,
    icon: Camera,
    description: '世界的に活躍する女性フォトグラファー',
  },
  {
    id: '8a1b2c3d-4e5f-6a7b-8c9d-1e2f3a4b5c6d',
    email: 'araki.nobuyoshi@testdomain.com',
    password: 'test123456',
    name: '荒木経惟',
    userType: 'photographer' as const,
    icon: Camera,
    description: '日本を代表する写真家',
  },
  {
    id: '9b2c3d4e-5f6a-7b8c-9d1e-2f3a4b5c6d7e',
    email: 'sugimoto.hiroshi@testdomain.com',
    password: 'test123456',
    name: '杉本博司',
    userType: 'photographer' as const,
    icon: Camera,
    description: '現代美術・建築写真の巨匠',
  },
  {
    id: '1c2d3e4f-5a6b-7c8d-9e1f-2a3b4c5d6e7f',
    email: 'leibovitz.annie@testdomain.com',
    password: 'test123456',
    name: 'アニー・リーボヴィッツ',
    userType: 'photographer' as const,
    icon: Camera,
    description: 'ヴォーグ誌の伝説的フォトグラファー',
  },
  {
    id: '2d3e4f5a-6b7c-8d9e-1f2a-3b4c5d6e7f8a',
    email: 'testino.mario@testdomain.com',
    password: 'test123456',
    name: 'マリオ・テスティーノ',
    userType: 'photographer' as const,
    icon: Camera,
    description: 'ファッション写真界の巨匠',
  },
  {
    id: '3e4f5a6b-7c8d-9e1f-2a3b-4c5d6e7f8a9b',
    email: 'adams.ansel@testdomain.com',
    password: 'test123456',
    name: 'アンセル・アダムス',
    userType: 'photographer' as const,
    icon: Camera,
    description: '風景写真の父と呼ばれる巨匠',
  },

  // 🌟 有名モデル・女優
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
    id: '4f5a6b7c-8d9e-1f2a-3b4c-5d6e7f8a9b1c',
    email: 'aragaki.yui@testdomain.com',
    password: 'test123456',
    name: '新垣結衣',
    userType: 'model' as const,
    icon: User,
    description: '国民的女優・モデル',
  },
  {
    id: '5a6b7c8d-9e1f-2a3b-4c5d-6e7f8a9b1c2d',
    email: 'imada.mio@testdomain.com',
    password: 'test123456',
    name: '今田美桜',
    userType: 'model' as const,
    icon: User,
    description: '福岡出身の人気女優・モデル',
  },
  {
    id: '6b7c8d9e-1f2a-3b4c-5d6e-7f8a9b1c2d3e',
    email: 'hashimoto.kanna@testdomain.com',
    password: 'test123456',
    name: '橋本環奈',
    userType: 'model' as const,
    icon: User,
    description: '1000年に1人の逸材と称される女優',
  },
  {
    id: '7c8d9e1f-2a3b-4c5d-6e7f-8a9b1c2d3e4f',
    email: 'ayase.haruka@testdomain.com',
    password: 'test123456',
    name: '綾瀬はるか',
    userType: 'model' as const,
    icon: User,
    description: '透明感あふれる国民的女優',
  },
  {
    id: '8d9e1f2a-3b4c-5d6e-7f8a-9b1c2d3e4f5a',
    email: 'ishihara.satomi@testdomain.com',
    password: 'test123456',
    name: '石原さとみ',
    userType: 'model' as const,
    icon: User,
    description: '愛らしい笑顔で人気の女優・モデル',
  },

  // 🎬 撮影会運営者
  {
    id: '9e1f2a3b-4c5d-6e7f-8a9b-1c2d3e4f5a6b',
    email: 'kotori.session@testdomain.com',
    password: 'test123456',
    name: 'ことり撮影会',
    userType: 'organizer' as const,
    icon: Users,
    description: '関東最大級の撮影会運営団体',
  },
  {
    id: '1f2a3b4c-5d6e-7f8a-9b1c-2d3e4f5a6b7c',
    email: 'rainbow.studio@testdomain.com',
    password: 'test123456',
    name: 'レインボースタジオ',
    userType: 'organizer' as const,
    icon: Users,
    description: '多様性を重視した撮影会企画',
  },
  {
    id: '2a3b4c5d-6e7f-8a9b-1c2d-3e4f5a6b7c8d',
    email: 'cosplay.kingdom@testdomain.com',
    password: 'test123456',
    name: 'コスプレ王国',
    userType: 'organizer' as const,
    icon: Users,
    description: 'コスプレ専門撮影会の老舗',
  },
  {
    id: '3b4c5d6e-7f8a-9b1c-2d3e-4f5a6b7c8d9e',
    email: 'tokyo.glamour@testdomain.com',
    password: 'test123456',
    name: '東京グラマー',
    userType: 'organizer' as const,
    icon: Users,
    description: '東京都内高級スタジオ撮影会',
  },
  {
    id: '4c5d6e7f-8a9b-1c2d-3e4f-5a6b7c8d9e1f',
    email: 'osaka.beauty@testdomain.com',
    password: 'test123456',
    name: '大阪ビューティー',
    userType: 'organizer' as const,
    icon: Users,
    description: '関西美人撮影会の専門運営',
  },
  {
    id: '5d6e7f8a-9b1c-2d3e-4f5a-6b7c8d9e1f2a',
    email: 'nagoya.portrait@testdomain.com',
    password: 'test123456',
    name: '名古屋ポートレート',
    userType: 'organizer' as const,
    icon: Users,
    description: '中部地区最大のポートレート撮影会',
  },
  {
    id: '33cf6da6-9572-4473-aa10-1cc8eeaf258d',
    email: 'malymoon@shutterhub.test',
    password: 'Malymoon2025!',
    name: 'Malymoon撮影会',
    userType: 'organizer' as const,
    icon: Users,
    description:
      '中規模撮影会（50-100人）を主催する運営会社。抽選方式の撮影会を開催',
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
            <div className="space-y-8">
              {/* カメラマンセクション */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Camera className="h-6 w-6 mr-2 text-blue-600" />
                  📸 有名カメラマン（6名）
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {testAccounts
                    .filter(account => account.userType === 'photographer')
                    .map(account => {
                      const Icon = account.icon;
                      const isCurrentLoading = loadingAccount === account.id;

                      return (
                        <Card
                          key={account.id}
                          className="hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-800"
                        >
                          <CardHeader className="text-center pb-3">
                            <div className="mx-auto mb-3 p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                              <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <CardTitle className="text-lg">
                              {account.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {account.description}
                            </CardDescription>
                            <Badge
                              variant="outline"
                              className="border-blue-300 text-blue-700"
                            >
                              {account.userType}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-xs text-muted-foreground space-y-1">
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
                              size="sm"
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
              </section>

              {/* モデルセクション */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="h-6 w-6 mr-2 text-pink-600" />
                  🌟 有名モデル・女優（6名）
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {testAccounts
                    .filter(account => account.userType === 'model')
                    .map(account => {
                      const Icon = account.icon;
                      const isCurrentLoading = loadingAccount === account.id;

                      return (
                        <Card
                          key={account.id}
                          className="hover:shadow-lg transition-shadow border-pink-200 dark:border-pink-800"
                        >
                          <CardHeader className="text-center pb-3">
                            <div className="mx-auto mb-3 p-2 rounded-full bg-pink-100 dark:bg-pink-900">
                              <Icon className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                            </div>
                            <CardTitle className="text-lg">
                              {account.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {account.description}
                            </CardDescription>
                            <Badge
                              variant="outline"
                              className="border-pink-300 text-pink-700"
                            >
                              {account.userType}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-xs text-muted-foreground space-y-1">
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
                              size="sm"
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
              </section>

              {/* 運営者セクション */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Users className="h-6 w-6 mr-2 text-purple-600" />
                  🎬 撮影会運営者（7名）
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {testAccounts
                    .filter(account => account.userType === 'organizer')
                    .map(account => {
                      const Icon = account.icon;
                      const isCurrentLoading = loadingAccount === account.id;

                      return (
                        <Card
                          key={account.id}
                          className="hover:shadow-lg transition-shadow border-purple-200 dark:border-purple-800"
                        >
                          <CardHeader className="text-center pb-3">
                            <div className="mx-auto mb-3 p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                              <Icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <CardTitle className="text-lg">
                              {account.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {account.description}
                            </CardDescription>
                            <Badge
                              variant="outline"
                              className="border-purple-300 text-purple-700"
                            >
                              {account.userType}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-xs text-muted-foreground space-y-1">
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
                              size="sm"
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
              </section>
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
      </div>
    </div>
  );
}
