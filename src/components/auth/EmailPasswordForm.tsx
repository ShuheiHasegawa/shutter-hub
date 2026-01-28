'use client';

import { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  userType: 'photographer' | 'model' | 'organizer';
}

interface EmailPasswordFormProps {
  value?: 'signin' | 'signup';
  onValueChange?: (value: 'signin' | 'signup') => void;
  returnUrl?: string | null;
  onRedirectStart?: () => void;
}

export function EmailPasswordForm({
  value,
  onValueChange,
  returnUrl,
  onRedirectStart,
}: EmailPasswordFormProps = {}) {
  const handleValueChange = (newValue: string) => {
    if (newValue === 'signin' || newValue === 'signup') {
      onValueChange?.(newValue);
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    userType: 'photographer',
  });

  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'ja';
  const supabase = createClient();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 既存セッションをチェック（警告ログ用）
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        logger.warn('既存セッションが存在する状態でサインインを試行:', {
          existingUserId: session.user.id,
          newEmail: formData.email,
        });
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません');
        return;
      }

      toast.success('ログインしました');

      // リダイレクト開始を通知
      onRedirectStart?.();

      // returnUrlの検証とリダイレクト先の決定
      let redirectTo = `/${locale}/dashboard`;
      if (returnUrl) {
        // セキュリティ: 同一オリジンのパスのみ許可（/で始まることを確認）
        if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
          redirectTo = returnUrl;
        }
      }
      router.push(redirectTo);
    } catch (error) {
      logger.error('Sign in error:', error);
      setError('ログイン中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // バリデーション
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.fullName.trim()) {
      setError('お名前を入力してください');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            user_type: formData.userType,
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setError('このメールアドレスは既に登録されています');
        } else {
          setError('アカウント作成に失敗しました');
        }
        return;
      }

      toast.success('アカウントを作成しました');

      // リダイレクト開始を通知
      onRedirectStart?.();

      router.push(`/${locale}/dashboard`);
    } catch (error) {
      logger.error('Sign up error:', error);
      setError('アカウント作成中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs
      value={value}
      onValueChange={handleValueChange}
      defaultValue={value ? undefined : 'signin'}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger
          value="signin"
          className="data-[state=active]:shadow-sm transition-all"
        >
          ログイン
        </TabsTrigger>
        <TabsTrigger
          value="signup"
          className="data-[state=active]:shadow-sm transition-all"
        >
          新規登録
        </TabsTrigger>
      </TabsList>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TabsContent value="signin" className="space-y-4 mt-8">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">メールアドレス</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Mail className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="signin-email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                required
              />
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signin-password">パスワード</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Lock className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワード"
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                required
              />
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-foreground transition-colors cursor-pointer"
                  aria-label={
                    showPassword ? 'パスワードを非表示' : 'パスワードを表示'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            ログイン
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="space-y-4 mt-8">
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name">お名前</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <User className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="signup-name"
                type="text"
                placeholder="山田太郎"
                value={formData.fullName}
                onChange={e => handleInputChange('fullName', e.target.value)}
                required
              />
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">メールアドレス</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Mail className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                required
              />
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">パスワード</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Lock className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="6文字以上"
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                required
                minLength={6}
              />
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-foreground transition-colors cursor-pointer"
                  aria-label={
                    showPassword ? 'パスワードを非表示' : 'パスワードを表示'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-confirm-password">パスワード確認</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Lock className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="パスワードを再入力"
                value={formData.confirmPassword}
                onChange={e =>
                  handleInputChange('confirmPassword', e.target.value)
                }
                required
              />
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="hover:text-foreground transition-colors cursor-pointer"
                  aria-label={
                    showConfirmPassword
                      ? 'パスワード確認を非表示'
                      : 'パスワード確認を表示'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="space-y-2 mb-4">
            <Label htmlFor="signup-user-type">ユーザータイプ</Label>
            <Select
              value={formData.userType}
              onValueChange={value =>
                handleInputChange('userType', value as FormData['userType'])
              }
            >
              <SelectTrigger id="signup-user-type">
                <SelectValue placeholder="ユーザータイプを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photographer">フォトグラファー</SelectItem>
                <SelectItem value="model">モデル</SelectItem>
                <SelectItem value="organizer">撮影会主催者</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            アカウント作成
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
