'use client';

import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { getProfile } from '@/lib/auth/profile';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  updateDisplaySettings,
  getDisplaySettings,
  updateNotificationSettings,
  getNotificationSettings,
  updatePrivacySettings,
  getPrivacySettings,
  updatePhotoSessionSettings,
  getPhotoSessionSettings,
  updateSecuritySettings,
  getSecuritySettings,
} from '@/app/actions/settings';
import { deleteAccount } from '@/app/actions/legal-documents';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActionBar, ActionBarSentinel } from '@/components/ui/action-bar';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Settings,
  Bell,
  Globe,
  Moon,
  Sun,
  Shield,
  User,
  Camera,
  Smartphone,
  Mail,
  Lock,
  Trash2,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { PageTitleHeader } from '@/components/ui/page-title-header';

interface Profile {
  id: string;
  email: string;
  display_name: string;
  user_type: 'model' | 'photographer' | 'organizer';
  avatar_url: string;
  bio: string;
  location: string;
  is_verified: boolean;
}

interface UserSettings {
  // 通知設定
  emailNotifications: boolean;
  pushNotifications: boolean;
  toastNotifications: boolean;
  realtimeNotifications: boolean;

  // 通知種別
  bookingReminders: boolean;
  instantRequests: boolean;
  messageNotifications: boolean;
  marketingEmails: boolean;
  systemUpdates: boolean;

  // プライバシー設定
  profileVisibility: 'public' | 'private' | 'verified_only';
  showLocation: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;

  // 撮影関連設定
  instantPhotoAvailable: boolean;
  maxTravelDistance: number;
  autoAcceptBookings: boolean;
  requirePhotoConsent: boolean;

  // 表示設定
  language: string;
  timezone: string;
  currency: string;

  // セキュリティ設定
  twoFactorEnabled: boolean;
}

const defaultSettings: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  toastNotifications: true,
  realtimeNotifications: true,
  bookingReminders: true,
  instantRequests: true,
  messageNotifications: true,
  marketingEmails: false,
  systemUpdates: true,
  profileVisibility: 'public',
  showLocation: true,
  showOnlineStatus: true,
  allowDirectMessages: true,
  instantPhotoAvailable: false,
  maxTravelDistance: 10,
  autoAcceptBookings: false,
  requirePhotoConsent: true,
  language: 'ja',
  timezone: 'Asia/Tokyo',
  currency: 'JPY',
  twoFactorEnabled: false,
};

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'ja';
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await getProfile(
        user.id
      );

      if (profileError) {
        logger.error('プロフィール取得エラー:', profileError);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      logger.error('プロフィール取得エラー:', error);
    }
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // 表示設定をuser_metadataから取得
      const displayResult = await getDisplaySettings();
      if (displayResult.success && displayResult.data) {
        setSettings(prev => ({
          ...prev,
          language: displayResult.data!.language,
          timezone: displayResult.data!.timezone,
          currency: displayResult.data!.currency,
        }));
      }

      // 通知設定を取得
      const notificationResult = await getNotificationSettings();
      if (notificationResult.success && notificationResult.data) {
        const notif = notificationResult.data;
        setSettings(prev => ({
          ...prev,
          emailNotifications: notif.email_enabled_global,
          pushNotifications: notif.push_enabled_global,
          toastNotifications: notif.toast_enabled ?? true,
          realtimeNotifications: notif.realtime_enabled ?? true,
          bookingReminders: notif.email_enabled.booking_reminders ?? true,
          instantRequests: notif.email_enabled.instant_requests ?? true,
          messageNotifications: notif.email_enabled.messages ?? true,
          marketingEmails: notif.email_enabled.marketing ?? false,
          systemUpdates: notif.email_enabled.system_updates ?? true,
        }));
      }

      // プライバシー設定を取得
      const privacyResult = await getPrivacySettings();
      if (privacyResult.success && privacyResult.data) {
        const privacy = privacyResult.data;
        setSettings(prev => ({
          ...prev,
          profileVisibility: privacy.profile_visibility,
          showLocation: privacy.show_location,
          showOnlineStatus: privacy.show_online_status,
          allowDirectMessages: privacy.allow_messages_from_strangers,
        }));
      }

      // 撮影関連設定を取得
      const photoSessionResult = await getPhotoSessionSettings();
      if (photoSessionResult.success && photoSessionResult.data) {
        const photoSession = photoSessionResult.data;
        setSettings(prev => ({
          ...prev,
          instantPhotoAvailable: photoSession.instant_photo_available,
          maxTravelDistance: photoSession.max_travel_distance,
          autoAcceptBookings: photoSession.auto_accept_bookings,
          requirePhotoConsent: photoSession.require_photo_consent,
        }));
      }

      // セキュリティ設定を取得
      const securityResult = await getSecuritySettings();
      if (securityResult.success && securityResult.data) {
        const security = securityResult.data;
        setSettings(prev => ({
          ...prev,
          twoFactorEnabled: security.two_factor_enabled,
        }));
      }
    } catch (error) {
      logger.error('設定取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    if (user) {
      loadProfile();
      loadSettings();
    }
  }, [user, loading, router, locale, loadProfile, loadSettings]);

  const handleSettingChange = (
    key: keyof UserSettings,
    value: string | number | boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      // 表示設定をuser_metadataに保存
      const displayResult = await updateDisplaySettings({
        language: settings.language,
        timezone: settings.timezone,
        currency: settings.currency,
      });

      if (!displayResult.success) {
        throw new Error(displayResult.error || '表示設定の保存に失敗しました');
      }

      // 通知設定を保存
      const notificationResult = await updateNotificationSettings({
        email_enabled_global: settings.emailNotifications,
        push_enabled_global: settings.pushNotifications,
        toast_enabled: settings.toastNotifications,
        realtime_enabled: settings.realtimeNotifications,
        email_enabled: {
          booking_reminders: settings.bookingReminders,
          instant_requests: settings.instantRequests,
          messages: settings.messageNotifications,
          marketing: settings.marketingEmails,
          system_updates: settings.systemUpdates,
        },
        push_enabled: {
          booking_reminders: settings.bookingReminders,
          instant_requests: settings.instantRequests,
          messages: settings.messageNotifications,
          marketing: settings.marketingEmails,
          system_updates: settings.systemUpdates,
        },
      });

      if (!notificationResult.success) {
        throw new Error(
          notificationResult.error || '通知設定の保存に失敗しました'
        );
      }

      // プライバシー設定を保存
      const privacyResult = await updatePrivacySettings({
        profile_visibility: settings.profileVisibility,
        show_online_status: settings.showOnlineStatus,
        allow_messages_from_strangers: settings.allowDirectMessages,
        show_location: settings.showLocation,
      });

      if (!privacyResult.success) {
        throw new Error(
          privacyResult.error || 'プライバシー設定の保存に失敗しました'
        );
      }

      // 撮影関連設定を保存
      const photoSessionResult = await updatePhotoSessionSettings({
        instant_photo_available: settings.instantPhotoAvailable,
        max_travel_distance: settings.maxTravelDistance,
        auto_accept_bookings: settings.autoAcceptBookings,
        require_photo_consent: settings.requirePhotoConsent,
      });

      if (!photoSessionResult.success) {
        throw new Error(
          photoSessionResult.error || '撮影関連設定の保存に失敗しました'
        );
      }

      // セキュリティ設定を保存
      const securityResult = await updateSecuritySettings({
        two_factor_enabled: settings.twoFactorEnabled,
      });

      if (!securityResult.success) {
        throw new Error(
          securityResult.error || 'セキュリティ設定の保存に失敗しました'
        );
      }

      toast.success('設定を保存しました');

      // 言語設定が変更された場合は、ページをリロードして言語を適用
      if (settings.language !== locale) {
        router.push(`/${settings.language}/settings`);
        router.refresh();
      }
    } catch (error) {
      logger.error('設定保存エラー:', error);
      toast.error(
        error instanceof Error ? error.message : '設定の保存に失敗しました'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    // 確認テキストが正しく入力されているかチェック
    if (deleteConfirmText !== '削除') {
      toast.error('確認のため「削除」と入力してください');
      return;
    }

    try {
      setIsDeleting(true);

      // アカウントを直接削除
      const result = await deleteAccount();

      if (!result.success) {
        throw new Error(result.error || 'アカウント削除に失敗しました');
      }

      toast.success('アカウントを削除しました');

      // ログアウトしてサインインページにリダイレクト
      await logout();
      router.push(`/${locale}/auth/signin`);
    } catch (error) {
      logger.error('アカウント削除エラー:', error);
      toast.error(
        error instanceof Error ? error.message : 'アカウント削除に失敗しました'
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <AuthenticatedLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>データの読み込みに失敗しました</AlertDescription>
        </Alert>
      </AuthenticatedLayout>
    );
  }

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'model':
        return 'モデル';
      case 'photographer':
        return 'フォトグラファー';
      case 'organizer':
        return '主催者';
      default:
        return userType;
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-4">
        <PageTitleHeader title="設定" icon={<Settings className="h-6 w-6" />} />
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            {getUserTypeLabel(profile.user_type)}
          </Badge>
        </div>

        {/* 通知設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 通知方法 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">通知方法</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Label>メール通知</Label>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={checked =>
                      handleSettingChange('emailNotifications', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <Label>プッシュ通知</Label>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={checked =>
                      handleSettingChange('pushNotifications', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <div>
                      <Label>トースト通知</Label>
                      <p className="text-xs text-muted-foreground">
                        画面上部に通知を表示
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.toastNotifications}
                    onCheckedChange={checked =>
                      handleSettingChange('toastNotifications', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    <div>
                      <Label>リアルタイム通知</Label>
                      <p className="text-xs text-muted-foreground">
                        データベース変更をリアルタイムで受信（オフの場合は30秒ごとに更新）
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.realtimeNotifications}
                    onCheckedChange={checked =>
                      handleSettingChange('realtimeNotifications', checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 通知種別 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">通知種別</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>予約リマインダー</Label>
                  <Switch
                    checked={settings.bookingReminders}
                    onCheckedChange={checked =>
                      handleSettingChange('bookingReminders', checked)
                    }
                  />
                </div>
                {profile.user_type === 'photographer' && (
                  <div className="flex items-center justify-between">
                    <Label>即座撮影リクエスト</Label>
                    <Switch
                      checked={settings.instantRequests}
                      onCheckedChange={checked =>
                        handleSettingChange('instantRequests', checked)
                      }
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>メッセージ通知</Label>
                  <Switch
                    checked={settings.messageNotifications}
                    onCheckedChange={checked =>
                      handleSettingChange('messageNotifications', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>システム更新</Label>
                  <Switch
                    checked={settings.systemUpdates}
                    onCheckedChange={checked =>
                      handleSettingChange('systemUpdates', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>マーケティングメール</Label>
                  <Switch
                    checked={settings.marketingEmails}
                    onCheckedChange={checked =>
                      handleSettingChange('marketingEmails', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* プライバシー設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              プライバシー設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>プロフィール表示</Label>
                <Select
                  value={settings.profileVisibility}
                  onValueChange={(value: string) =>
                    handleSettingChange('profileVisibility', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">公開</SelectItem>
                    <SelectItem value="verified_only">
                      認証済みユーザーのみ
                    </SelectItem>
                    <SelectItem value="private">非公開</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>位置情報を表示</Label>
                <Switch
                  checked={settings.showLocation}
                  onCheckedChange={checked =>
                    handleSettingChange('showLocation', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>オンライン状態を表示</Label>
                <Switch
                  checked={settings.showOnlineStatus}
                  onCheckedChange={checked =>
                    handleSettingChange('showOnlineStatus', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>ダイレクトメッセージを許可</Label>
                <Switch
                  checked={settings.allowDirectMessages}
                  onCheckedChange={checked =>
                    handleSettingChange('allowDirectMessages', checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 撮影関連設定 */}
        {(profile.user_type === 'photographer' ||
          profile.user_type === 'model' ||
          profile.user_type === 'organizer') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                撮影関連設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile.user_type === 'photographer' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>即座撮影を受け付ける</Label>
                    <Switch
                      checked={settings.instantPhotoAvailable}
                      onCheckedChange={checked =>
                        handleSettingChange('instantPhotoAvailable', checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>最大移動距離（km）</Label>
                    <Select
                      value={settings.maxTravelDistance.toString()}
                      onValueChange={(value: string) =>
                        handleSettingChange(
                          'maxTravelDistance',
                          parseInt(value)
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5km</SelectItem>
                        <SelectItem value="10">10km</SelectItem>
                        <SelectItem value="20">20km</SelectItem>
                        <SelectItem value="50">50km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {profile.user_type === 'organizer' && (
                <div className="flex items-center justify-between">
                  <Label>予約を自動承認</Label>
                  <Switch
                    checked={settings.autoAcceptBookings}
                    onCheckedChange={checked =>
                      handleSettingChange('autoAcceptBookings', checked)
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>写真公開前に同意を必須とする</Label>
                <Switch
                  checked={settings.requirePhotoConsent}
                  onCheckedChange={checked =>
                    handleSettingChange('requirePhotoConsent', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 表示設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              表示設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>テーマ</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        ライト
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        ダーク
                      </div>
                    </SelectItem>
                    <SelectItem value="system">システム</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>言語</Label>
                <Select
                  value={settings.language}
                  onValueChange={value =>
                    handleSettingChange('language', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>タイムゾーン</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={value =>
                    handleSettingChange('timezone', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    <SelectItem value="America/New_York">
                      America/New_York
                    </SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>通貨</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value: string) =>
                    handleSettingChange('currency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">日本円 (JPY)</SelectItem>
                    <SelectItem value="USD">米ドル (USD)</SelectItem>
                    <SelectItem value="EUR">ユーロ (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* セキュリティ設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              セキュリティ設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>二段階認証</Label>
                  <p className="text-sm text-muted-foreground">
                    アカウントのセキュリティを強化
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={checked =>
                    handleSettingChange('twoFactorEnabled', checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* データ管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              データ管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                アカウントを削除すると、すべてのデータが永久に削除され、復元できません。
              </AlertDescription>
            </Alert>

            <AlertDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  アカウント削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    アカウントを削除しますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は取り消せません。アカウントとすべてのデータが永久に削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">削除されるデータ：</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>プロフィール情報</li>
                      <li>撮影会・予約履歴</li>
                      <li>メッセージ履歴</li>
                      <li>お気に入り</li>
                      <li>アップロードした画像</li>
                      <li>その他すべてのデータ</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <Label
                      htmlFor="delete-confirm"
                      className="text-sm font-semibold"
                    >
                      確認のため「<span className="font-mono">削除</span>
                      」と入力してください：
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="削除"
                      className="mt-2"
                      disabled={isDeleting}
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    disabled={isDeleting}
                    onClick={() => {
                      setDeleteConfirmText('');
                      setShowDeleteDialog(false);
                    }}
                  >
                    キャンセル
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting || deleteConfirmText !== '削除'}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        削除中...
                      </>
                    ) : (
                      '削除する'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* ページ下部の保存ボタン（ActionBar自動制御） */}
        <ActionBarSentinel className="pt-4 pb-0">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="cta"
            className="text-base font-medium w-full transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                保存中...
              </>
            ) : (
              '設定を保存'
            )}
          </Button>
        </ActionBarSentinel>
      </div>

      {/* 下部固定ActionBar（Sentinel非表示時のみ表示） */}
      <ActionBar
        actions={[
          {
            id: 'save',
            label: isSaving ? '保存中...' : '設定を保存',
            variant: 'cta',
            onClick: handleSave,
            disabled: isSaving,
            loading: isSaving,
          },
        ]}
        maxColumns={1}
        background="blur"
        sticky={true}
        autoHide={true}
      />
      {/* ActionBar用のスペーサー（fixed要素の高さ分） */}
      <div className="h-20 md:h-20 flex-shrink-0" />
    </AuthenticatedLayout>
  );
}
