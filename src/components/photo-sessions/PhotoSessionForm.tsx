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
import {
  createPhotoSessionAction,
  updatePhotoSessionAction,
} from '@/app/actions/photo-session';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('photoSessions');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
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
        title: tErrors('title'),
        description: tErrors('unauthorized'),
        variant: 'destructive',
      });
      return;
    }

    // バリデーション
    if (!formData.title.trim()) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.titleRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!formData.location.trim()) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.locationRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.dateTimeRequired'),
        variant: 'destructive',
      });
      return;
    }

    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);
    const now = new Date();

    if (startTime <= now) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.startTimeInvalid'),
        variant: 'destructive',
      });
      return;
    }

    if (endTime <= startTime) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.endTimeInvalid'),
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
        result = await updatePhotoSessionAction(initialData.id, sessionData);
      } else {
        result = await createPhotoSessionAction(sessionData);
      }

      if (result.error) {
        console.error('撮影会保存エラー:', result.error);
        toast({
          title: tErrors('title'),
          description: t('form.error.saveFailed'),
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: isEditing
          ? t('form.success.updated')
          : t('form.success.created'),
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('予期しないエラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
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
          {isEditing ? t('form.editTitle') : t('form.createTitle')}
        </CardTitle>
        <p className="text-center text-muted-foreground">
          {isEditing ? t('form.editDescription') : t('form.createDescription')}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('form.basicInfo')}</h3>

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                {t('form.titleLabel')} {t('form.required')}
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder={t('form.titlePlaceholder')}
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-2"
              >
                {t('form.descriptionLabel')}
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t('form.descriptionPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          {/* 場所情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('form.locationInfo')}</h3>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium mb-2"
              >
                {t('form.locationLabel')} {t('form.required')}
              </label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder={t('form.locationPlaceholder')}
                required
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium mb-2"
              >
                {t('form.addressLabel')}
              </label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder={t('form.addressPlaceholder')}
              />
            </div>
          </div>

          {/* 日時情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('form.dateTimeInfo')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start_time"
                  className="block text-sm font-medium mb-2"
                >
                  {t('form.startTimeLabel')} {t('form.required')}
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
                  {t('form.endTimeLabel')} {t('form.required')}
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
            <h3 className="text-lg font-medium">{t('form.participantInfo')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="max_participants"
                  className="block text-sm font-medium mb-2"
                >
                  {t('form.maxParticipantsLabel')} {t('form.required')}
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
                  {t('form.priceLabel')} {t('form.required')}
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
            <h3 className="text-lg font-medium">{t('form.publishSettings')}</h3>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <label className="text-base font-medium">
                  {t('form.publishLabel')}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t('form.publishDescription')}
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
                {isEditing ? t('form.updating') : t('form.creating')}
              </>
            ) : isEditing ? (
              t('form.updateButton')
            ) : (
              t('form.createButton')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
