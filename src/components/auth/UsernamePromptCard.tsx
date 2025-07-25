'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { UsernameSetupDialog } from '@/components/profile/UsernameSetupDialog';
import {
  getUsernameStatus,
  generateUsernameFromDisplayName,
} from '@/app/actions/username';
import { AtSign, Sparkles, Users, Check } from 'lucide-react';

interface UsernamePromptCardProps {
  displayName?: string;
  className?: string;
  onUsernameSet?: (username: string) => void;
}

export function UsernamePromptCard({
  displayName,
  className,
  onUsernameSet,
}: UsernamePromptCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [hasUsername, setHasUsername] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ユーザー名状況の確認とsuggestions生成
  useEffect(() => {
    const checkUsernameStatus = async () => {
      try {
        const status = await getUsernameStatus();
        setHasUsername(status.hasUsername);

        // ユーザー名が未設定かつdisplay_nameがある場合は候補を生成
        if (!status.hasUsername && displayName) {
          const usernameSuggestions =
            await generateUsernameFromDisplayName(displayName);
          setSuggestions(usernameSuggestions.slice(0, 3)); // 最大3個まで表示
        }
      } catch {
        // Username status check failed - silently handle
      } finally {
        setIsLoading(false);
      }
    };

    checkUsernameStatus();
  }, [displayName]);

  // ユーザー名が既に設定されている場合は何も表示しない
  if (isLoading || hasUsername) {
    return null;
  }

  const handleUsernameSet = (username: string) => {
    setHasUsername(true);
    onUsernameSet?.(username);
  };

  const handleSuggestionSelect = (_suggestion: string) => {
    // 候補を初期値としてダイアログを開く
    setShowDialog(true);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-primary" />
          ユーザー名を設定しませんか？
        </CardTitle>
        <CardDescription>
          一意のユーザー名を設定すると、他のユーザーがあなたを@usernameで簡単に検索できるようになります。
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 利点の説明 */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">ユーザー名設定のメリット:</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  他のユーザーが@usernameで検索可能
                </li>
                <li className="flex items-center gap-2">
                  <AtSign className="h-3 w-3" />
                  同名ユーザーとの区別が簡単
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  プロフィールの識別性向上
                </li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* 候補表示 */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">おすすめのユーザー名:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  @{suggestion}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              クリックして選択、または自分で決めることもできます
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2">
          <Button onClick={() => setShowDialog(true)} className="flex-1">
            <AtSign className="h-4 w-4 mr-2" />
            ユーザー名を設定
          </Button>
          <Button
            variant="outline"
            onClick={() => setHasUsername(true)}
            className="text-muted-foreground"
          >
            後で
          </Button>
        </div>
      </CardContent>

      {/* ユーザー名設定ダイアログ */}
      <UsernameSetupDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        variant="setup"
        onSuccess={handleUsernameSet}
      />
    </Card>
  );
}
