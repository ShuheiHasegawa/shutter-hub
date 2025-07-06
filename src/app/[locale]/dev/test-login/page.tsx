'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { User, Camera, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  TEST_ACCOUNTS,
  loginAsTestUser,
  isDevelopmentEnvironment,
  type TestUserProfile,
} from '@/lib/auth/test-auth';

interface TestAccountWithIcon extends TestUserProfile {
  icon: React.ReactNode;
}

const testAccountsWithIcons: TestAccountWithIcon[] = TEST_ACCOUNTS.map(
  account => ({
    ...account,
    icon:
      account.user_type === 'photographer' ? (
        <Camera className="h-6 w-6" />
      ) : account.user_type === 'model' ? (
        <User className="h-6 w-6" />
      ) : (
        <Users className="h-6 w-6" />
      ),
  })
);

export default function TestLoginPage() {
  const [loading, setLoading] = useState<string | null>(null);

  // 開発環境チェック
  const isDev = isDevelopmentEnvironment();

  const handleTestLogin = async (account: TestAccountWithIcon) => {
    if (!isDev) {
      toast.error('この機能は開発環境でのみ利用可能です');
      return;
    }

    setLoading(account.id);

    try {
      const success = await loginAsTestUser(account.id);

      if (success) {
        toast.success(
          `${account.display_name}としてログインしました（開発モード）`
        );
        // ページをリロードして認証状態を反映
        window.location.href = '/ja';
      } else {
        toast.error('ログインに失敗しました');
      }
    } catch (error) {
      console.error('テストログインエラー:', error);
      toast.error('ログインに失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'model':
        return 'モデル';
      case 'photographer':
        return 'フォトグラファー';
      case 'organizer':
        return '主催者';
      default:
        return userType;
    }
  };

  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType) {
      case 'model':
        return 'default';
      case 'photographer':
        return 'secondary';
      case 'organizer':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (!isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            この機能は開発環境でのみ利用可能です。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">開発用テストログイン</h1>
          <p className="text-muted-foreground">
            テスト用アカウントに簡単にログインできます（開発環境のみ）
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testAccountsWithIcons.map(account => (
            <Card
              key={account.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {account.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{account.display_name}</span>
                      <Badge
                        variant={getUserTypeBadgeVariant(account.user_type)}
                      >
                        {getUserTypeLabel(account.user_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-normal">
                      {account.email}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {account.bio}
                </p>
                <Button
                  onClick={() => handleTestLogin(account)}
                  disabled={loading === account.id}
                  className="w-full"
                >
                  {loading === account.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      ログイン中...
                    </>
                  ) : (
                    `${account.display_name}としてログイン`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                開発環境専用機能
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                この機能は開発・テスト目的でのみ使用してください。
                本番環境では利用できません。実際の認証フローをバイパスしているため、
                セキュリティ上の理由から本番環境では絶対に使用しないでください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
