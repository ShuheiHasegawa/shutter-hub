'use client';

import { useAuth } from '@/hooks/useAuth';
import { getProfile } from '@/lib/auth/profile';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Volume2,
  Lock,
  Trash2,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

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
  smsNotifications: boolean;
  soundNotifications: boolean;

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
  sessionTimeout: number;
}

const defaultSettings: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  soundNotifications: true,
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
  sessionTimeout: 30,
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'ja';
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await getProfile(
        user.id
      );

      if (profileError) {
        console.error('プロフィール取得エラー:', profileError);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, loading, router, locale, loadProfile]);

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
    try {
      // 実際の保存処理はここに実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('設定を保存しました');
    } catch {
      toast.error('設定の保存に失敗しました');
    }
  };

  const handleExport = async () => {
    try {
      // 実際のエクスポート処理はここに実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('データをエクスポートしました');
    } catch {
      toast.error('エクスポートに失敗しました');
    }
  };

  const handleDelete = async () => {
    try {
      // 実際の削除処理はここに実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('アカウントを削除しました');
    } catch {
      toast.error('削除に失敗しました');
    }
  };

  if (loading) {
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
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>データの読み込みに失敗しました</AlertDescription>
        </Alert>
      </DashboardLayout>
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              設定
            </h1>
            <p className="text-muted-foreground mt-1">
              アプリの動作とプライバシーを管理
            </p>
          </div>
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
                    <Volume2 className="h-4 w-4" />
                    <Label>音声通知</Label>
                  </div>
                  <Switch
                    checked={settings.soundNotifications}
                    onCheckedChange={checked =>
                      handleSettingChange('soundNotifications', checked)
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

              <div className="space-y-2">
                <Label>セッションタイムアウト（日）</Label>
                <Select
                  value={settings.sessionTimeout.toString()}
                  onValueChange={value =>
                    handleSettingChange('sessionTimeout', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1日</SelectItem>
                    <SelectItem value="7">7日</SelectItem>
                    <SelectItem value="30">30日</SelectItem>
                    <SelectItem value="90">90日</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={handleExport}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                データをエクスポート
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                アカウント削除
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              データエクスポートでは、あなたの全データをダウンロードできます。
              アカウント削除は取り消せません。
            </p>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>設定を保存</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
