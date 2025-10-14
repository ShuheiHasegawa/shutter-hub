'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, User, Send, AlertTriangle } from 'lucide-react';
import { ModelSearchInput } from '@/components/photo-sessions/ModelSearchInput';
import { createModelInvitationAction } from '@/app/actions/organizer-model';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ModelSearchResult } from '@/types/photo-session';
import type { ModelLimitCheck } from '@/lib/subscription-limits';

interface ModelInvitationFormProps {
  onInvitationSent?: () => void;
  limitCheck?: ModelLimitCheck | null;
}

export function ModelInvitationForm({
  onInvitationSent,
  limitCheck,
}: ModelInvitationFormProps) {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<ModelSearchResult | null>(
    null
  );
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleModelSelect = (model: ModelSearchResult) => {
    setSelectedModel(model);
  };

  const handleSubmit = async () => {
    if (!selectedModel) {
      toast({
        title: 'エラー',
        description: 'モデルを選択してください',
        variant: 'destructive',
      });
      return;
    }

    // 制限チェック（UI側でも確認）
    if (limitCheck && !limitCheck.canInvite) {
      toast({
        title: '所属モデル上限に達しています',
        description: `現在のプランでは最大${limitCheck.limit}名までのモデルを管理できます。より多くのモデルを管理するには、プランをアップグレードしてください。`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createModelInvitationAction({
        model_id: selectedModel.id,
        invitation_message: message.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: '成功',
          description: `${selectedModel.display_name}に招待を送信しました`,
        });

        // フォームリセット
        setSelectedModel(null);
        setMessage('');

        // 親コンポーネントに通知
        onInvitationSent?.();
      } else {
        // 制限情報がある場合は詳細なエラーメッセージを表示
        if (result.limitInfo) {
          toast({
            title: '招待制限に達しています',
            description: result.error || '招待の送信に失敗しました',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'エラー',
            description: result.error || '招待の送信に失敗しました',
            variant: 'destructive',
          });
        }
      }
    } catch {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          新しいモデルを招待
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 制限警告 */}
          {limitCheck && !limitCheck.canInvite && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <span>
                  所属モデル上限（{limitCheck.limit}名）に達しています。
                </span>
                <span className="text-sm">
                  現在のプランでは最大{limitCheck.limit}
                  名までのモデルを管理できます。
                  より多くのモデルを管理するには、プランをアップグレードしてください。
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start mt-2"
                  onClick={() => {
                    // プラン変更ページへのリダイレクト
                    window.location.href = '/subscription';
                  }}
                >
                  プランを変更
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* モデル検索・選択 */}
          <div className="space-y-2">
            <Label>招待するモデル</Label>
            <ModelSearchInput
              onModelSelect={handleModelSelect}
              placeholder="モデル名または@usernameで検索..."
              disabled={isLoading}
            />
            {selectedModel && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={selectedModel.avatar_url}
                      alt={selectedModel.display_name}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedModel.display_name}
                    </p>
                    {selectedModel.username && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        @{selectedModel.username}
                      </p>
                    )}
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      選択済み
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedModel(null)}
                    className="ml-auto text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 招待メッセージ */}
          <div className="space-y-2">
            <Label htmlFor="invitation-message">招待メッセージ（任意）</Label>
            <Textarea
              id="invitation-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="所属についてのメッセージがあれば入力してください..."
              rows={4}
              disabled={isLoading}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              モデルには招待通知と一緒にこのメッセージが送信されます
            </p>
          </div>

          {/* 送信ボタン */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedModel || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  招待を送信
                </>
              )}
            </Button>
          </div>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              📝 招待について
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• 招待は7日間有効です</li>
              <li>• モデルが承認すると所属関係が確立されます</li>
              <li>• 同じモデルに重複して招待を送ることはできません</li>
              <li>• 招待の状況は「送信済み招待」タブで確認できます</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
