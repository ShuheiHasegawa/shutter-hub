'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Mail,
  MessageSquare,
  Users,
  Star,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';

// 仮実装（後でnotification.tsから移行）
const updateNotificationSettings = async (settings: NotificationSettings) => {
  console.log('Settings to save:', settings);
  // TODO: 実際のServer Action実装
  return { success: true, message: '設定を保存しました' };
};

const getNotificationSettings = async () => {
  // TODO: 実際のServer Action実装
  return { success: true, data: null as NotificationSettings | null };
};

interface NotificationSettings {
  // メッセージ関連
  newMessages: boolean;
  messageReplies: boolean;
  groupMessages: boolean;
  messageMarkAsRead: boolean;

  // フォロー関連
  newFollowers: boolean;
  followRequests: boolean;
  mutualFollows: boolean;
  followActivity: boolean;

  // レビュー・評価関連
  newReviews: boolean;
  ratingReceived: boolean;
  reviewResponses: boolean;

  // システム・セキュリティ関連
  systemMessages: boolean;
  securityAlerts: boolean;
  moderationActions: boolean;
  spamDetection: boolean;

  // 配信方法設定
  pushNotifications: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  soundNotifications: boolean;

  // スケジュール設定
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  weekendNotifications: boolean;
}

interface NotificationSettingsProps {
  onSettingsChange?: (settings: NotificationSettings) => void;
}

export function NotificationSettings({
  onSettingsChange,
}: NotificationSettingsProps) {
  const t = useTranslations('notifications');
  const [settings, setSettings] = useState<NotificationSettings>({
    // デフォルト設定
    newMessages: true,
    messageReplies: true,
    groupMessages: true,
    messageMarkAsRead: false, // プライバシー重視
    newFollowers: true,
    followRequests: true,
    mutualFollows: true,
    followActivity: false,
    newReviews: true,
    ratingReceived: true,
    reviewResponses: true,
    systemMessages: true,
    securityAlerts: true,
    moderationActions: true,
    spamDetection: true,
    pushNotifications: true,
    emailNotifications: false, // デフォルトはOFF
    inAppNotifications: true,
    soundNotifications: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    weekendNotifications: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 設定読み込み
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const result = await getNotificationSettings();
        if (result.success && result.data) {
          setSettings(prev => ({ ...prev, ...result.data }));
        }
      } catch (error) {
        console.error('Load notification settings error:', error);
        toast.error(t('settings.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [t]);

  // 設定変更ハンドラ
  const handleSettingChange = (
    key: keyof NotificationSettings,
    value: boolean | string
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  // 設定保存
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateNotificationSettings(settings);
      if (result.success) {
        toast.success(t('settings.saveSuccess'));
      } else {
        toast.error(result.message || t('settings.saveError'));
      }
    } catch (error) {
      console.error('Save notification settings error:', error);
      toast.error(t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // 全ての通知をON/OFF
  const handleToggleAll = (enabled: boolean) => {
    const newSettings = {
      ...settings,
      newMessages: enabled,
      messageReplies: enabled,
      groupMessages: enabled,
      newFollowers: enabled,
      followRequests: enabled,
      mutualFollows: enabled,
      newReviews: enabled,
      ratingReceived: enabled,
      reviewResponses: enabled,
      systemMessages: enabled,
      securityAlerts: true, // セキュリティは常にON
      moderationActions: true, // モデレーションも常にON
    };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.title')}
          </CardTitle>
          <CardDescription>{t('settings.loading')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.title')}
          </CardTitle>
          <CardDescription>{t('settings.description')}</CardDescription>

          {/* クイック設定 */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleAll(true)}
            >
              {t('settings.enableAll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleAll(false)}
            >
              {t('settings.disableAll')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 配信方法設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('delivery.title')}
          </CardTitle>
          <CardDescription>{t('delivery.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('delivery.push')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('delivery.pushDescription')}
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={checked =>
                handleSettingChange('pushNotifications', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('delivery.email')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('delivery.emailDescription')}
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={checked =>
                handleSettingChange('emailNotifications', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('delivery.inApp')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('delivery.inAppDescription')}
              </p>
            </div>
            <Switch
              checked={settings.inAppNotifications}
              onCheckedChange={checked =>
                handleSettingChange('inAppNotifications', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                {settings.soundNotifications ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                {t('delivery.sound')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('delivery.soundDescription')}
              </p>
            </div>
            <Switch
              checked={settings.soundNotifications}
              onCheckedChange={checked =>
                handleSettingChange('soundNotifications', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* メッセージ通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('messages.title')}
          </CardTitle>
          <CardDescription>{t('messages.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('messages.newMessages')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('messages.newMessagesDescription')}
              </p>
            </div>
            <Switch
              checked={settings.newMessages}
              onCheckedChange={checked =>
                handleSettingChange('newMessages', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('messages.replies')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('messages.repliesDescription')}
              </p>
            </div>
            <Switch
              checked={settings.messageReplies}
              onCheckedChange={checked =>
                handleSettingChange('messageReplies', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('messages.group')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('messages.groupDescription')}
              </p>
            </div>
            <Switch
              checked={settings.groupMessages}
              onCheckedChange={checked =>
                handleSettingChange('groupMessages', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('messages.readReceipts')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('messages.readReceiptsDescription')}
              </p>
              <Badge variant="secondary" className="text-xs">
                {t('messages.privacySetting')}
              </Badge>
            </div>
            <Switch
              checked={settings.messageMarkAsRead}
              onCheckedChange={checked =>
                handleSettingChange('messageMarkAsRead', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* フォロー通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('follow.title')}
          </CardTitle>
          <CardDescription>{t('follow.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('follow.newFollowers')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('follow.newFollowersDescription')}
              </p>
            </div>
            <Switch
              checked={settings.newFollowers}
              onCheckedChange={checked =>
                handleSettingChange('newFollowers', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('follow.requests')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('follow.requestsDescription')}
              </p>
            </div>
            <Switch
              checked={settings.followRequests}
              onCheckedChange={checked =>
                handleSettingChange('followRequests', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('follow.mutual')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('follow.mutualDescription')}
              </p>
            </div>
            <Switch
              checked={settings.mutualFollows}
              onCheckedChange={checked =>
                handleSettingChange('mutualFollows', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('follow.activity')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('follow.activityDescription')}
              </p>
            </div>
            <Switch
              checked={settings.followActivity}
              onCheckedChange={checked =>
                handleSettingChange('followActivity', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* レビュー・評価通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {t('reviews.title')}
          </CardTitle>
          <CardDescription>{t('reviews.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('reviews.newReviews')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('reviews.newReviewsDescription')}
              </p>
            </div>
            <Switch
              checked={settings.newReviews}
              onCheckedChange={checked =>
                handleSettingChange('newReviews', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('reviews.rating')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('reviews.ratingDescription')}
              </p>
            </div>
            <Switch
              checked={settings.ratingReceived}
              onCheckedChange={checked =>
                handleSettingChange('ratingReceived', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('reviews.responses')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('reviews.responsesDescription')}
              </p>
            </div>
            <Switch
              checked={settings.reviewResponses}
              onCheckedChange={checked =>
                handleSettingChange('reviewResponses', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* システム・セキュリティ通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('security.title')}
          </CardTitle>
          <CardDescription>{t('security.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('security.systemMessages')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('security.systemMessagesDescription')}
              </p>
            </div>
            <Switch
              checked={settings.systemMessages}
              onCheckedChange={checked =>
                handleSettingChange('systemMessages', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('security.alerts')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('security.alertsDescription')}
              </p>
              <Badge variant="destructive" className="text-xs">
                {t('security.cannotDisable')}
              </Badge>
            </div>
            <Switch
              checked={settings.securityAlerts}
              onCheckedChange={checked =>
                handleSettingChange('securityAlerts', checked)
              }
              disabled // セキュリティアラートは無効化不可
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('security.moderation')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('security.moderationDescription')}
              </p>
              <Badge variant="destructive" className="text-xs">
                {t('security.cannotDisable')}
              </Badge>
            </div>
            <Switch
              checked={settings.moderationActions}
              onCheckedChange={checked =>
                handleSettingChange('moderationActions', checked)
              }
              disabled // モデレーションアクションも無効化不可
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {t('security.spamDetection')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('security.spamDetectionDescription')}
              </p>
            </div>
            <Switch
              checked={settings.spamDetection}
              onCheckedChange={checked =>
                handleSettingChange('spamDetection', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('settings.saveHint')}
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? t('settings.saving') : t('settings.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
