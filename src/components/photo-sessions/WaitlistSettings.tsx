'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Users, Clock, Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  getWaitlistSettings,
  createOrUpdateWaitlistSettings,
  type WaitlistSettings,
} from '@/app/actions/photo-session-waitlist';

interface WaitlistSettingsProps {
  photoSessionId: string;
}

export function WaitlistSettingsComponent({
  photoSessionId,
}: WaitlistSettingsProps) {
  const t = useTranslations('waitlist_settings');
  const [settings, setSettings] = useState<WaitlistSettings>({
    photo_session_id: photoSessionId,
    enabled: true,
    max_waitlist_size: 50,
    auto_promote_enabled: true,
    promotion_deadline_hours: 24,
    email_notifications: true,
    push_notifications: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [photoSessionId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await getWaitlistSettings(photoSessionId);
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      logger.error('設定取得エラー:', error);
      toast.error(t('error.load_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await createOrUpdateWaitlistSettings(settings);
      if (result.success) {
        toast.success(t('success.settings_saved'));
      } else {
        toast.error(result.error || t('error.save_failed'));
      }
    } catch (error) {
      logger.error('設定保存エラー:', error);
      toast.error(t('error.unexpected'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<WaitlistSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 基本設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('basic.enabled')}
            </Label>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={checked => updateSettings({ enabled: checked })}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('basic.enabled_description')}
          </p>

          {settings.enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="max_waitlist_size">{t('basic.max_size')}</Label>
                <Input
                  id="max_waitlist_size"
                  type="number"
                  min="1"
                  max="200"
                  value={settings.max_waitlist_size}
                  onChange={e =>
                    updateSettings({
                      max_waitlist_size: parseInt(e.target.value) || 50,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('basic.max_size_description')}
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* 自動繰り上げ設定 */}
        {settings.enabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="auto_promote_enabled"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                {t('auto_promote.enabled')}
              </Label>
              <Switch
                id="auto_promote_enabled"
                checked={settings.auto_promote_enabled}
                onCheckedChange={checked =>
                  updateSettings({ auto_promote_enabled: checked })
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('auto_promote.enabled_description')}
            </p>

            {settings.auto_promote_enabled && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="promotion_deadline_hours">
                    {t('auto_promote.deadline_hours')}
                  </Label>
                  <Input
                    id="promotion_deadline_hours"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.promotion_deadline_hours}
                    onChange={e =>
                      updateSettings({
                        promotion_deadline_hours:
                          parseInt(e.target.value) || 24,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('auto_promote.deadline_hours_description')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* 通知設定 */}
        {settings.enabled && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('notifications.title')}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t('notifications.description')}
            </p>

            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="flex items-center justify-between">
                <Label htmlFor="email_notifications">
                  {t('notifications.email')}
                </Label>
                <Switch
                  id="email_notifications"
                  checked={settings.email_notifications}
                  onCheckedChange={checked =>
                    updateSettings({ email_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push_notifications">
                  {t('notifications.push')}
                </Label>
                <Switch
                  id="push_notifications"
                  checked={settings.push_notifications}
                  onCheckedChange={checked =>
                    updateSettings({ push_notifications: checked })
                  }
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 保存ボタン */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {t('button.saving')}
            </>
          ) : (
            t('button.save_settings')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
