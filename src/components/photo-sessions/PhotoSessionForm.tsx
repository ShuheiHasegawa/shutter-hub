'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createPhotoSession, updatePhotoSession } from '@/lib/photo-sessions';
import type { PhotoSessionWithOrganizer } from '@/types/database';

interface PhotoSessionFormProps {
  initialData?: PhotoSessionWithOrganizer;
  isEditing?: boolean;
  onSuccess?: () => void;
}

export function PhotoSessionForm({
  initialData,
  isEditing = false,
  onSuccess,
}: PhotoSessionFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    address: initialData?.address || '',
    start_time: initialData?.start_time
      ? new Date(initialData.start_time).toISOString().slice(0, 16)
      : '',
    end_time: initialData?.end_time
      ? new Date(initialData.end_time).toISOString().slice(0, 16)
      : '',
    max_participants: initialData?.max_participants || 1,
    price_per_person: initialData?.price_per_person || 0,
    is_published: initialData?.is_published || false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_published: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'エラー',
        description: '認証が必要です',
        variant: 'destructive',
      });
      return;
    }

    // バリデーション
    if (!formData.title.trim()) {
      toast({
        title: 'エラー',
        description: 'タイトルは必須です',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.location.trim()) {
      toast({
        title: 'エラー',
        description: '場所は必須です',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      toast({
        title: 'エラー',
        description: '開始日時と終了日時は必須です',
        variant: 'destructive',
      });
      return;
    }

    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);
    const now = new Date();

    if (startTime <= now) {
      toast({
        title: 'エラー',
        description: '開始日時は現在時刻より後である必要があります',
        variant: 'destructive',
      });
      return;
    }

    if (endTime <= startTime) {
      toast({
        title: 'エラー',
        description: '終了日時は開始日時より後である必要があります',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const sessionData = {
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location,
        address: formData.address || undefined,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        max_participants: formData.max_participants,
        price_per_person: formData.price_per_person,
        is_published: formData.is_published,
      };

      let result;

      if (isEditing && initialData) {
        result = await updatePhotoSession(initialData.id, sessionData);
      } else {
        result = await createPhotoSession(sessionData);
      }

      if (result.error) {
        console.error('撮影会保存エラー:', result.error);
        toast({
          title: 'エラー',
          description: '撮影会の保存に失敗しました',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '成功',
        description: isEditing
          ? '撮影会を更新しました'
          : '撮影会を作成しました',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('予期しないエラー:', error);
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {isEditing ? '撮影会編集' : '撮影会作成'}
        </CardTitle>
        <p className="text-center text-muted-foreground">
          {isEditing
            ? '撮影会の情報を編集してください'
            : '新しい撮影会を作成してください'}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">基本情報</h3>

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                タイトル *
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="撮影会のタイトルを入力してください"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-2"
              >
                説明
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="撮影会の詳細な説明を入力してください..."
                rows={4}
              />
            </div>
          </div>

          {/* 場所情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">場所情報</h3>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium mb-2"
              >
                場所 *
              </label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="東京都渋谷区"
                required
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium mb-2"
              >
                詳細住所
              </label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="東京都渋谷区○○1-2-3"
              />
            </div>
          </div>

          {/* 日時情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">日時情報</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start_time"
                  className="block text-sm font-medium mb-2"
                >
                  開始日時 *
                </label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="end_time"
                  className="block text-sm font-medium mb-2"
                >
                  終了日時 *
                </label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* 参加者・料金情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">参加者・料金情報</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="max_participants"
                  className="block text-sm font-medium mb-2"
                >
                  最大参加者数 *
                </label>
                <Input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="price_per_person"
                  className="block text-sm font-medium mb-2"
                >
                  参加費（1人あたり） *
                </label>
                <Input
                  id="price_per_person"
                  name="price_per_person"
                  type="number"
                  min="0"
                  max="1000000"
                  value={formData.price_per_person}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* 公開設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">公開設定</h3>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <label className="text-base font-medium">
                  撮影会を公開する
                </label>
                <p className="text-sm text-muted-foreground">
                  公開すると他のユーザーが検索・予約できるようになります。
                </p>
              </div>
              <Switch
                checked={formData.is_published}
                onCheckedChange={handleSwitchChange}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {isEditing ? '更新中...' : '作成中...'}
              </>
            ) : isEditing ? (
              '撮影会を更新'
            ) : (
              '撮影会を作成'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
