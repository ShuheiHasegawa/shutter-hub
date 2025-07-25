'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  setUsername,
  checkUsernameAvailability,
  generateUsernameSuggestions,
  getUsernameStatus,
} from '@/app/actions/username';
import { Loader2, Check, X } from 'lucide-react';
// lodash debounceの手動実装
const debounce = <T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface UsernameSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUsername?: string;
  onSuccess?: (username: string) => void;
  variant?: 'setup' | 'change';
}

interface ValidationState {
  available: boolean;
  message: string;
  isChecking: boolean;
}

export function UsernameSetupDialog({
  open,
  onOpenChange,
  initialUsername = '',
  onSuccess,
  variant = 'setup',
}: UsernameSetupDialogProps) {
  const [username, setUsernameValue] = useState(initialUsername);
  const [validation, setValidation] = useState<ValidationState>({
    available: false,
    message: '',
    isChecking: false,
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    hasUsername: boolean;
    canChange: boolean;
    lastUpdated?: string;
  }>({ hasUsername: false, canChange: true });

  const router = useRouter();
  const { toast } = useToast();

  // ユーザー名状況の取得
  useEffect(() => {
    if (open) {
      getUsernameStatus().then(setUsernameStatus);
    }
  }, [open]);

  // リアルタイムバリデーション（デバウンス付き）
  const debouncedValidation = useCallback(
    debounce(async (value: string) => {
      if (!value || value.length < 3) {
        setValidation({
          available: false,
          message: 'ユーザー名は3文字以上で入力してください',
          isChecking: false,
        });
        setSuggestions([]);
        return;
      }

      setValidation(prev => ({ ...prev, isChecking: true }));

      try {
        const result = await checkUsernameAvailability(value);
        setValidation({
          available: result.available,
          message: result.message || '',
          isChecking: false,
        });

        // 利用できない場合は候補を表示
        if (!result.available) {
          const suggestionList = await generateUsernameSuggestions(value);
          setSuggestions(suggestionList);
        } else {
          setSuggestions([]);
        }
      } catch {
        setValidation({
          available: false,
          message: 'チェック中にエラーが発生しました',
          isChecking: false,
        });
        setSuggestions([]);
      }
    }, 500),
    [setValidation, setSuggestions]
  );

  // ユーザー名入力時の処理
  useEffect(() => {
    if (username.trim()) {
      debouncedValidation(username.trim());
    } else {
      setValidation({
        available: false,
        message: '',
        isChecking: false,
      });
      setSuggestions([]);
    }
  }, [username, debouncedValidation]);

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.available || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await setUsername(username.trim());

      if (result.success) {
        toast({
          title: '成功',
          description: `ユーザー名「@${username.trim()}」を設定しました`,
        });

        onSuccess?.(username.trim());
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'ユーザー名の設定に失敗しました',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'エラー',
        description: 'ユーザー名の設定中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 候補選択時の処理
  const handleSuggestionSelect = (suggestion: string) => {
    setUsernameValue(suggestion);
  };

  // 入力フィールドのスタイル
  const getInputStyle = () => {
    if (validation.isChecking) return '';
    if (validation.available) return 'border-green-500';
    if (username.length >= 3 && !validation.available) return 'border-red-500';
    return '';
  };

  // バリデーションアイコン
  const getValidationIcon = () => {
    if (validation.isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (validation.available) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    if (username.length >= 3 && !validation.available) {
      return <X className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {variant === 'setup' ? 'ユーザー名を設定' : 'ユーザー名を変更'}
          </DialogTitle>
          <DialogDescription>
            他のユーザーがあなたを見つけやすくするために、一意のユーザー名を設定してください。
            @マークをつけて検索できるようになります。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ユーザー名</Label>
            <div className="relative">
              <div className="absolute left-3 top-3 text-sm text-muted-foreground">
                @
              </div>
              <Input
                id="username"
                value={username}
                onChange={e => setUsernameValue(e.target.value.toLowerCase())}
                placeholder="username"
                className={`pl-8 pr-10 ${getInputStyle()}`}
                maxLength={30}
                pattern="^[a-zA-Z0-9_]+$"
                disabled={
                  isSubmitting ||
                  (!usernameStatus.canChange && variant === 'change')
                }
              />
              <div className="absolute right-3 top-3">
                {getValidationIcon()}
              </div>
            </div>

            {/* バリデーションメッセージ */}
            {validation.message && (
              <Alert variant={validation.available ? 'default' : 'destructive'}>
                <AlertDescription className="text-sm">
                  {validation.message}
                </AlertDescription>
              </Alert>
            )}

            {/* 変更制限メッセージ */}
            {variant === 'change' && !usernameStatus.canChange && (
              <Alert>
                <AlertDescription className="text-sm">
                  ユーザー名の変更は30日間に1回までです。
                  {usernameStatus.lastUpdated && (
                    <>
                      前回の変更:{' '}
                      {new Date(
                        usernameStatus.lastUpdated
                      ).toLocaleDateString()}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-muted-foreground">
              • 3～30文字で入力してください
              <br />
              • 英数字とアンダースコア（_）のみ使用可能
              <br />• 一度設定すると30日間変更できません
            </div>
          </div>

          {/* 候補リスト */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">おすすめのユーザー名:</Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    @{suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={
                !validation.available ||
                isSubmitting ||
                (!usernameStatus.canChange && variant === 'change')
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {variant === 'setup' ? '設定' : '変更'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
