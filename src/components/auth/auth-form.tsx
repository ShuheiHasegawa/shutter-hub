'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { OAuthButtons } from './oauth-buttons';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface AuthFormProps {
  redirectTo?: string;
}

export function AuthForm({ redirectTo }: AuthFormProps) {
  const { signInWithEmail, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await signInWithEmail(formData.email, formData.password);

    if (error) {
      setError(
        'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
      );
    } else {
      router.push(redirectTo || '/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }

    const { error } = await signUpWithEmail(formData.email, formData.password);

    if (error) {
      setError('新規登録に失敗しました。メールアドレスを確認してください。');
    } else {
      setError(null);
      // 成功メッセージを表示（確認メールが送信された旨）
      alert('確認メールを送信しました。メールをご確認ください。');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">ShutterHub</CardTitle>
          <CardDescription className="text-center">
            撮影業界をつなぐプラットフォーム
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">ログイン</TabsTrigger>
              <TabsTrigger value="signup">新規登録</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">メールアドレス</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">パスワード</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="パスワードを入力"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  ログイン
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">メールアドレス</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">パスワード</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="8文字以上のパスワード"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10"
                      minLength={8}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">パスワード確認</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="パスワードを再入力"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  新規登録
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  または
                </span>
              </div>
            </div>
            <div className="mt-6">
              <OAuthButtons />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
