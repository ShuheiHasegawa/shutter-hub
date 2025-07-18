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
import { Settings, Ticket, Crown, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  createOrUpdatePriorityBookingSettings,
  getPriorityBookingSettings,
  type PriorityBookingSettings,
} from '@/app/actions/photo-session-priority';

interface PriorityBookingSettingsProps {
  photoSessionId: string;
}

export function PriorityBookingSettingsComponent({
  photoSessionId,
}: PriorityBookingSettingsProps) {
  const t = useTranslations('priority_settings');
  const [settings, setSettings] = useState<PriorityBookingSettings>({
    photo_session_id: photoSessionId,
    ticket_priority_enabled: false,
    rank_priority_enabled: false,
    general_booking_start: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [photoSessionId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await getPriorityBookingSettings(photoSessionId);
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
      const result = await createOrUpdatePriorityBookingSettings(settings);
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

  const updateSettings = (updates: Partial<PriorityBookingSettings>) => {
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
        {/* 一般予約開始時間 */}
        <div className="space-y-3">
          <Label
            htmlFor="general_booking_start"
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {t('general_booking.title')}
          </Label>
          <Input
            id="general_booking_start"
            type="datetime-local"
            value={settings.general_booking_start}
            onChange={e =>
              updateSettings({ general_booking_start: e.target.value })
            }
            required
          />
          <p className="text-sm text-muted-foreground">
            {t('general_booking.description')}
          </p>
        </div>

        <Separator />

        {/* 優先チケット設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="ticket_priority_enabled"
              className="flex items-center gap-2"
            >
              <Ticket className="h-4 w-4" />
              {t('ticket_priority.title')}
            </Label>
            <Switch
              id="ticket_priority_enabled"
              checked={settings.ticket_priority_enabled}
              onCheckedChange={checked =>
                updateSettings({ ticket_priority_enabled: checked })
              }
            />
          </div>

          {settings.ticket_priority_enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket_priority_start">
                    {t('ticket_priority.start_time')}
                  </Label>
                  <Input
                    id="ticket_priority_start"
                    type="datetime-local"
                    value={settings.ticket_priority_start || ''}
                    onChange={e =>
                      updateSettings({ ticket_priority_start: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket_priority_end">
                    {t('ticket_priority.end_time')}
                  </Label>
                  <Input
                    id="ticket_priority_end"
                    type="datetime-local"
                    value={settings.ticket_priority_end || ''}
                    onChange={e =>
                      updateSettings({ ticket_priority_end: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('ticket_priority.description')}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* ランク優先設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="rank_priority_enabled"
              className="flex items-center gap-2"
            >
              <Crown className="h-4 w-4" />
              {t('rank_priority.title')}
            </Label>
            <Switch
              id="rank_priority_enabled"
              checked={settings.rank_priority_enabled}
              onCheckedChange={checked =>
                updateSettings({ rank_priority_enabled: checked })
              }
            />
          </div>

          {settings.rank_priority_enabled && (
            <div className="space-y-6 pl-6 border-l-2 border-muted">
              {/* VIPランク */}
              <div className="space-y-3">
                <h4 className="font-medium text-red-600">
                  {t('rank_priority.vip')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vip_priority_start">
                      {t('rank_priority.start_time')}
                    </Label>
                    <Input
                      id="vip_priority_start"
                      type="datetime-local"
                      value={settings.vip_priority_start || ''}
                      onChange={e =>
                        updateSettings({ vip_priority_start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vip_priority_end">
                      {t('rank_priority.end_time')}
                    </Label>
                    <Input
                      id="vip_priority_end"
                      type="datetime-local"
                      value={settings.vip_priority_end || ''}
                      onChange={e =>
                        updateSettings({ vip_priority_end: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Platinumランク */}
              <div className="space-y-3">
                <h4 className="font-medium text-purple-600">
                  {t('rank_priority.platinum')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platinum_priority_start">
                      {t('rank_priority.start_time')}
                    </Label>
                    <Input
                      id="platinum_priority_start"
                      type="datetime-local"
                      value={settings.platinum_priority_start || ''}
                      onChange={e =>
                        updateSettings({
                          platinum_priority_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platinum_priority_end">
                      {t('rank_priority.end_time')}
                    </Label>
                    <Input
                      id="platinum_priority_end"
                      type="datetime-local"
                      value={settings.platinum_priority_end || ''}
                      onChange={e =>
                        updateSettings({
                          platinum_priority_end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Goldランク */}
              <div className="space-y-3">
                <h4 className="font-medium text-yellow-600">
                  {t('rank_priority.gold')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gold_priority_start">
                      {t('rank_priority.start_time')}
                    </Label>
                    <Input
                      id="gold_priority_start"
                      type="datetime-local"
                      value={settings.gold_priority_start || ''}
                      onChange={e =>
                        updateSettings({ gold_priority_start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gold_priority_end">
                      {t('rank_priority.end_time')}
                    </Label>
                    <Input
                      id="gold_priority_end"
                      type="datetime-local"
                      value={settings.gold_priority_end || ''}
                      onChange={e =>
                        updateSettings({ gold_priority_end: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Silverランク */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-600">
                  {t('rank_priority.silver')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="silver_priority_start">
                      {t('rank_priority.start_time')}
                    </Label>
                    <Input
                      id="silver_priority_start"
                      type="datetime-local"
                      value={settings.silver_priority_start || ''}
                      onChange={e =>
                        updateSettings({
                          silver_priority_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="silver_priority_end">
                      {t('rank_priority.end_time')}
                    </Label>
                    <Input
                      id="silver_priority_end"
                      type="datetime-local"
                      value={settings.silver_priority_end || ''}
                      onChange={e =>
                        updateSettings({ silver_priority_end: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {t('rank_priority.description')}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* 保存ボタン */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !settings.general_booking_start}
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
