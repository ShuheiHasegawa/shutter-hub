'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Users, Settings, Info } from 'lucide-react';
import type { BookingType, BookingSettings } from '@/types/database';

interface BookingSettingsFormProps {
  bookingType: BookingType;
  settings: BookingSettings;
  onChange: (settings: BookingSettings) => void;
  disabled?: boolean;
}

export function BookingSettingsForm({
  bookingType,
  settings,
  onChange,
  disabled = false,
}: BookingSettingsFormProps) {
  const t = useTranslations('photoSessions');

  const updateSetting = (key: string, value: unknown) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const renderFirstComeSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <h4 className="font-medium">{t('bookingSettings.firstCome.title')}</h4>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm">
            {t('bookingSettings.firstCome.bookingStartTime')}
          </Label>
          <Input
            type="datetime-local"
            value={settings.booking_start_time || ''}
            onChange={e => updateSetting('booking_start_time', e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('bookingSettings.firstCome.bookingStartTimeHelp')}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">
              {t('bookingSettings.firstCome.enableWaitlist')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('bookingSettings.firstCome.enableWaitlistHelp')}
            </p>
          </div>
          <Switch
            checked={settings.enable_waitlist || false}
            onCheckedChange={checked =>
              updateSetting('enable_waitlist', checked)
            }
            disabled={disabled}
          />
        </div>

        {settings.enable_waitlist && (
          <div>
            <Label className="text-sm">
              {t('bookingSettings.firstCome.maxWaitlistSize')}
            </Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={settings.max_waitlist_size || 10}
              onChange={e =>
                updateSetting(
                  'max_waitlist_size',
                  parseInt(e.target.value) || 10
                )
              }
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderLotterySettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <h4 className="font-medium">{t('bookingSettings.lottery.title')}</h4>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">
              {t('bookingSettings.lottery.applicationStartTime')}
            </Label>
            <Input
              type="datetime-local"
              value={settings.application_start_time || ''}
              onChange={e =>
                updateSetting('application_start_time', e.target.value)
              }
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-sm">
              {t('bookingSettings.lottery.applicationEndTime')}
            </Label>
            <Input
              type="datetime-local"
              value={settings.application_end_time || ''}
              onChange={e =>
                updateSetting('application_end_time', e.target.value)
              }
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm">
            {t('bookingSettings.lottery.lotteryDateTime')}
          </Label>
          <Input
            type="datetime-local"
            value={settings.lottery_date_time || ''}
            onChange={e => updateSetting('lottery_date_time', e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('bookingSettings.lottery.lotteryDateTimeHelp')}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">
              {t('bookingSettings.lottery.autoLottery')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('bookingSettings.lottery.autoLotteryHelp')}
            </p>
          </div>
          <Switch
            checked={settings.auto_lottery || false}
            onCheckedChange={checked => updateSetting('auto_lottery', checked)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );

  const renderAdminLotterySettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        <h4 className="font-medium">
          {t('bookingSettings.adminLottery.title')}
        </h4>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">
              {t('bookingSettings.adminLottery.applicationStartTime')}
            </Label>
            <Input
              type="datetime-local"
              value={settings.application_start_time || ''}
              onChange={e =>
                updateSetting('application_start_time', e.target.value)
              }
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-sm">
              {t('bookingSettings.adminLottery.applicationEndTime')}
            </Label>
            <Input
              type="datetime-local"
              value={settings.application_end_time || ''}
              onChange={e =>
                updateSetting('application_end_time', e.target.value)
              }
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm">
            {t('bookingSettings.adminLottery.selectionCriteria')}
          </Label>
          <Textarea
            value={settings.selection_criteria || ''}
            onChange={e => updateSetting('selection_criteria', e.target.value)}
            placeholder={t(
              'bookingSettings.adminLottery.selectionCriteriaPlaceholder'
            )}
            rows={3}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('bookingSettings.adminLottery.selectionCriteriaHelp')}
          </p>
        </div>

        <div>
          <Label className="text-sm">
            {t('bookingSettings.adminLottery.applicationMessage')}
          </Label>
          <Textarea
            value={settings.application_message || ''}
            onChange={e => updateSetting('application_message', e.target.value)}
            placeholder={t(
              'bookingSettings.adminLottery.applicationMessagePlaceholder'
            )}
            rows={2}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );

  const renderPrioritySettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        <h4 className="font-medium">{t('bookingSettings.priority.title')}</h4>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm">
            {t('bookingSettings.priority.bookingStartTime')}
          </Label>
          <Input
            type="datetime-local"
            value={settings.booking_start_time || ''}
            onChange={e => updateSetting('booking_start_time', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-sm">
              {t('bookingSettings.priority.vipSlots')}
            </Label>
            <Input
              type="number"
              min="0"
              value={settings.vip_slots || 0}
              onChange={e =>
                updateSetting('vip_slots', parseInt(e.target.value) || 0)
              }
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-sm">
              {t('bookingSettings.priority.platinumSlots')}
            </Label>
            <Input
              type="number"
              min="0"
              value={settings.platinum_slots || 0}
              onChange={e =>
                updateSetting('platinum_slots', parseInt(e.target.value) || 0)
              }
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-sm">
              {t('bookingSettings.priority.goldSlots')}
            </Label>
            <Input
              type="number"
              min="0"
              value={settings.gold_slots || 0}
              onChange={e =>
                updateSetting('gold_slots', parseInt(e.target.value) || 0)
              }
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">
              {t('bookingSettings.priority.enableGeneralBooking')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('bookingSettings.priority.enableGeneralBookingHelp')}
            </p>
          </div>
          <Switch
            checked={settings.enable_general_booking || false}
            onCheckedChange={checked =>
              updateSetting('enable_general_booking', checked)
            }
            disabled={disabled}
          />
        </div>

        {settings.enable_general_booking && (
          <div>
            <Label className="text-sm">
              {t('bookingSettings.priority.generalBookingStartTime')}
            </Label>
            <Input
              type="datetime-local"
              value={settings.general_booking_start_time || ''}
              onChange={e =>
                updateSetting('general_booking_start_time', e.target.value)
              }
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => {
    switch (bookingType) {
      case 'first_come':
        return renderFirstComeSettings();
      case 'lottery':
        return renderLotterySettings();
      case 'admin_lottery':
        return renderAdminLotterySettings();
      case 'priority':
        return renderPrioritySettings();
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle className="text-lg">
            {t('bookingSettings.title')}
          </CardTitle>
          <Badge variant="outline" className="ml-auto">
            {t(`bookingType.${bookingType}.title`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('bookingSettings.description')}
        </p>
      </CardHeader>
      <CardContent>
        {renderSettings()}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">
                {t('bookingSettings.note.title')}
              </p>
              <p>{t('bookingSettings.note.description')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
