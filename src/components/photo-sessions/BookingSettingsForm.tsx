'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  const t = useTranslations('photoSessions.bookingSettings');

  const updateSettings = (key: keyof BookingSettings, value: unknown) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  if (bookingType === 'first_come') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('firstCome.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('firstCome.description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (bookingType === 'lottery') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('lottery.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lottery-entry-start">
                {t('lottery.entryStartTime')}
              </Label>
              <Input
                id="lottery-entry-start"
                type="datetime-local"
                value={settings.lottery?.entry_start_time || ''}
                onChange={e =>
                  updateSettings('lottery', {
                    ...settings.lottery,
                    entry_start_time: e.target.value,
                  })
                }
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="lottery-entry-end">
                {t('lottery.entryEndTime')}
              </Label>
              <Input
                id="lottery-entry-end"
                type="datetime-local"
                value={settings.lottery?.entry_end_time || ''}
                onChange={e =>
                  updateSettings('lottery', {
                    ...settings.lottery,
                    entry_end_time: e.target.value,
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lottery-date">{t('lottery.lotteryDate')}</Label>
              <Input
                id="lottery-date"
                type="datetime-local"
                value={settings.lottery?.lottery_date || ''}
                onChange={e =>
                  updateSettings('lottery', {
                    ...settings.lottery,
                    lottery_date: e.target.value,
                  })
                }
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="lottery-winners">{t('lottery.maxWinners')}</Label>
              <Input
                id="lottery-winners"
                type="number"
                min="1"
                value={settings.lottery?.max_winners || 1}
                onChange={e =>
                  updateSettings('lottery', {
                    ...settings.lottery,
                    max_winners: parseInt(e.target.value) || 1,
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookingType === 'admin_lottery') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('adminLottery.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-entry-start">
                {t('adminLottery.entryStartTime')}
              </Label>
              <Input
                id="admin-entry-start"
                type="datetime-local"
                value={settings.admin_lottery?.entry_start_time || ''}
                onChange={e =>
                  updateSettings('admin_lottery', {
                    ...settings.admin_lottery,
                    entry_start_time: e.target.value,
                  })
                }
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="admin-entry-end">
                {t('adminLottery.entryEndTime')}
              </Label>
              <Input
                id="admin-entry-end"
                type="datetime-local"
                value={settings.admin_lottery?.entry_end_time || ''}
                onChange={e =>
                  updateSettings('admin_lottery', {
                    ...settings.admin_lottery,
                    entry_end_time: e.target.value,
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-deadline">
                {t('adminLottery.selectionDeadline')}
              </Label>
              <Input
                id="admin-deadline"
                type="datetime-local"
                value={settings.admin_lottery?.selection_deadline || ''}
                onChange={e =>
                  updateSettings('admin_lottery', {
                    ...settings.admin_lottery,
                    selection_deadline: e.target.value,
                  })
                }
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="admin-selections">
                {t('adminLottery.maxSelections')}
              </Label>
              <Input
                id="admin-selections"
                type="number"
                min="1"
                value={settings.admin_lottery?.max_selections || 1}
                onChange={e =>
                  updateSettings('admin_lottery', {
                    ...settings.admin_lottery,
                    max_selections: parseInt(e.target.value) || 1,
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookingType === 'priority') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('priority.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 一般予約開始時間 */}
          <div>
            <Label htmlFor="general-booking-start">
              {t('priority.generalBookingStart')}
            </Label>
            <Input
              id="general-booking-start"
              type="datetime-local"
              value={settings.priority?.general_booking_start || ''}
              onChange={e =>
                updateSettings('priority', {
                  ...settings.priority,
                  general_booking_start: e.target.value,
                })
              }
              disabled={disabled}
            />
          </div>

          <Separator />

          {/* 優先チケット設定 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">
                  {t('priority.ticketPriority')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('priority.ticketPriorityDescription')}
                </p>
              </div>
              <Switch
                checked={settings.priority?.ticket_priority_enabled || false}
                onCheckedChange={checked =>
                  updateSettings('priority', {
                    ...settings.priority,
                    ticket_priority_enabled: checked,
                  })
                }
                disabled={disabled}
              />
            </div>

            {settings.priority?.ticket_priority_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ticket-start">
                    {t('priority.ticketStartTime')}
                  </Label>
                  <Input
                    id="ticket-start"
                    type="datetime-local"
                    value={settings.priority?.ticket_priority_start || ''}
                    onChange={e =>
                      updateSettings('priority', {
                        ...settings.priority,
                        ticket_priority_start: e.target.value,
                      })
                    }
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label htmlFor="ticket-end">
                    {t('priority.ticketEndTime')}
                  </Label>
                  <Input
                    id="ticket-end"
                    type="datetime-local"
                    value={settings.priority?.ticket_priority_end || ''}
                    onChange={e =>
                      updateSettings('priority', {
                        ...settings.priority,
                        ticket_priority_end: e.target.value,
                      })
                    }
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ランク優先設定 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">
                  {t('priority.rankPriority')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('priority.rankPriorityDescription')}
                </p>
              </div>
              <Switch
                checked={settings.priority?.rank_priority_enabled || false}
                onCheckedChange={checked =>
                  updateSettings('priority', {
                    ...settings.priority,
                    rank_priority_enabled: checked,
                  })
                }
                disabled={disabled}
              />
            </div>

            {settings.priority?.rank_priority_enabled && (
              <div className="space-y-4">
                {/* VIP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vip-start">
                      {t('priority.vipStartTime')}
                    </Label>
                    <Input
                      id="vip-start"
                      type="datetime-local"
                      value={settings.priority?.vip_start_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          vip_start_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vip-end">{t('priority.vipEndTime')}</Label>
                    <Input
                      id="vip-end"
                      type="datetime-local"
                      value={settings.priority?.vip_end_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          vip_end_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Platinum */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platinum-start">
                      {t('priority.platinumStartTime')}
                    </Label>
                    <Input
                      id="platinum-start"
                      type="datetime-local"
                      value={settings.priority?.platinum_start_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          platinum_start_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="platinum-end">
                      {t('priority.platinumEndTime')}
                    </Label>
                    <Input
                      id="platinum-end"
                      type="datetime-local"
                      value={settings.priority?.platinum_end_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          platinum_end_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Gold */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gold-start">
                      {t('priority.goldStartTime')}
                    </Label>
                    <Input
                      id="gold-start"
                      type="datetime-local"
                      value={settings.priority?.gold_start_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          gold_start_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gold-end">
                      {t('priority.goldEndTime')}
                    </Label>
                    <Input
                      id="gold-end"
                      type="datetime-local"
                      value={settings.priority?.gold_end_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          gold_end_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Silver */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="silver-start">
                      {t('priority.silverStartTime')}
                    </Label>
                    <Input
                      id="silver-start"
                      type="datetime-local"
                      value={settings.priority?.silver_start_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          silver_start_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="silver-end">
                      {t('priority.silverEndTime')}
                    </Label>
                    <Input
                      id="silver-end"
                      type="datetime-local"
                      value={settings.priority?.silver_end_time || ''}
                      onChange={e =>
                        updateSettings('priority', {
                          ...settings.priority,
                          silver_end_time: e.target.value,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
