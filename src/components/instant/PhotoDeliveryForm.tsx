'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  Image as ImageIcon,
  Send,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Calendar,
  Lock,
  Info,
  Shield,
  Eye,
} from 'lucide-react';
import {
  deliverPhotos,
  getExternalDeliveryServices,
} from '@/app/actions/instant-payment';
import type {
  InstantBooking,
  DeliverPhotosData,
  DeliveryMethod,
} from '@/types/instant-photo';

interface PhotoDeliveryFormProps {
  booking: InstantBooking;
}

// 外部サービス自動検出
function detectExternalService(url: string): {
  service: string;
  isValid: boolean;
  serviceName: string;
  icon: string;
} {
  const services = [
    {
      pattern: /gigafile\.nu/,
      service: 'gigafile',
      name: 'ギガファイル便',
      icon: '📁',
    },
    {
      pattern: /firestorage\.jp/,
      service: 'firestorage',
      name: 'firestorage',
      icon: '🔥',
    },
    {
      pattern: /wetransfer\.com/,
      service: 'wetransfer',
      name: 'WeTransfer',
      icon: '💧',
    },
    {
      pattern: /drive\.google\.com/,
      service: 'googledrive',
      name: 'Google Drive',
      icon: '📁',
    },
    {
      pattern: /dropbox\.com/,
      service: 'dropbox',
      name: 'Dropbox',
      icon: '📦',
    },
    {
      pattern: /onedrive\.live\.com/,
      service: 'onedrive',
      name: 'OneDrive',
      icon: '☁️',
    },
  ];

  for (const svc of services) {
    if (svc.pattern.test(url)) {
      return {
        service: svc.service,
        isValid: true,
        serviceName: svc.name,
        icon: svc.icon,
      };
    }
  }

  // URLが有効かチェック
  try {
    new URL(url);
    return {
      service: 'other',
      isValid: true,
      serviceName: '外部URL',
      icon: '🌐',
    };
  } catch {
    return {
      service: 'unknown',
      isValid: false,
      serviceName: '不明',
      icon: '❓',
    };
  }
}

export function PhotoDeliveryForm({ booking }: PhotoDeliveryFormProps) {
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>('external_url');
  const [formData, setFormData] = useState({
    photoCount: 10,
    totalSizeMb: 50,
    externalUrl: '',
    externalPassword: '',
    externalExpiresAt: '',
    resolution: 'high' as 'high' | 'medium' | 'web',
    formats: ['jpg'],
    photographerMessage: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedService, setDetectedService] = useState<{
    service: string;
    isValid: boolean;
    serviceName: string;
    icon: string;
  } | null>(null);

  // 外部サービス一覧を取得（将来の機能拡張用）
  useEffect(() => {
    const loadExternalServices = async () => {
      try {
        const result = await getExternalDeliveryServices();
        // 現在は使用していないが、将来の機能拡張用に保持
        console.log('External services loaded:', result.data);
      } catch (error) {
        console.error('外部サービス一覧取得エラー:', error);
      }
    };

    loadExternalServices();
  }, []);

  // URL変更時の自動検出
  useEffect(() => {
    if (formData.externalUrl) {
      const detected = detectExternalService(formData.externalUrl);
      setDetectedService(detected);
    } else {
      setDetectedService(null);
    }
  }, [formData.externalUrl]);

  // デフォルト有効期限設定（7日後）
  useEffect(() => {
    if (!formData.externalExpiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      setFormData(prev => ({
        ...prev,
        externalExpiresAt: expiresAt.toISOString().split('T')[0],
      }));
    }
  }, [formData.externalExpiresAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // バリデーション
    if (deliveryMethod === 'external_url' && !formData.externalUrl) {
      setErrorMessage('配信URLを入力してください');
      return;
    }

    if (
      deliveryMethod === 'external_url' &&
      detectedService &&
      !detectedService.isValid
    ) {
      setErrorMessage('有効なURLを入力してください');
      return;
    }

    if (formData.photoCount <= 0) {
      setErrorMessage('写真枚数を入力してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const deliveryData: DeliverPhotosData = {
        booking_id: booking.id,
        delivery_method: deliveryMethod,
        photo_count: formData.photoCount,
        resolution: formData.resolution,
        formats: formData.formats,
        photographer_message: formData.photographerMessage || undefined,
      };

      // 外部URL配信の場合
      if (deliveryMethod === 'external_url') {
        deliveryData.external_url = formData.externalUrl;
        deliveryData.external_service = detectedService?.service || 'other';
        deliveryData.external_password = formData.externalPassword || undefined;
        deliveryData.external_expires_at =
          formData.externalExpiresAt || undefined;
      }

      // 直接アップロードの場合
      if (deliveryMethod === 'direct_upload') {
        deliveryData.total_size_mb = formData.totalSizeMb;
        // TODO: 実際のファイルアップロード処理
      }

      const result = await deliverPhotos(deliveryData);

      if (result.success) {
        setSubmitStatus('success');
        // 配信成功時の処理
        setTimeout(() => {
          window.location.href = `/dashboard?success=${encodeURIComponent('写真配信が完了しました')}`;
        }, 2000); // 2秒後にリダイレクト
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || '写真配信に失敗しました');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('予期しないエラーが発生しました');
      console.error('写真配信エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // URLプレビュー機能
  const handlePreviewUrl = () => {
    if (formData.externalUrl) {
      window.open(formData.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          写真配信
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          撮影した写真をゲストに配信してください。配信完了後、エスクロー決済が処理されます。
        </p>
      </CardHeader>

      <CardContent>
        {submitStatus === 'success' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              写真を正常に配信しました！ゲストに通知が送信されました。
            </AlertDescription>
          </Alert>
        )}

        {submitStatus === 'error' && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 配信方法選択 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">配信方法</Label>
            <RadioGroup
              value={deliveryMethod}
              onValueChange={value =>
                setDeliveryMethod(value as DeliveryMethod)
              }
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem
                  value="external_url"
                  id="external"
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="external"
                    className="font-medium cursor-pointer"
                  >
                    外部URL配信 (推奨)
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    ギガファイル便、WeTransfer、Google Drive等のURLで配信
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      簡単
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      大容量対応
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      パスワード保護
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg opacity-60">
                <RadioGroupItem
                  value="direct_upload"
                  id="direct"
                  className="mt-1"
                  disabled
                />
                <div className="flex-1">
                  <Label
                    htmlFor="direct"
                    className="font-medium cursor-pointer"
                  >
                    直接アップロード
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    プラットフォームに直接アップロード（準備中）
                  </p>
                  <Badge variant="outline" className="text-xs mt-2">
                    準備中
                  </Badge>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 外部URL配信フォーム */}
          {deliveryMethod === 'external_url' && (
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-2">
                <Label
                  htmlFor="externalUrl"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  配信URL *
                </Label>
                <Input
                  id="externalUrl"
                  type="url"
                  placeholder="https://example.com/download-link"
                  value={formData.externalUrl}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      externalUrl: e.target.value,
                    }))
                  }
                  required
                />

                {/* 自動検出結果表示 */}
                {detectedService && (
                  <div className="flex items-center justify-between p-2 bg-white border rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{detectedService.icon}</span>
                      <span className="text-sm font-medium">
                        {detectedService.serviceName}
                      </span>
                      {detectedService.isValid ? (
                        <Badge variant="secondary" className="text-xs">
                          認識済み
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          無効なURL
                        </Badge>
                      )}
                    </div>
                    {detectedService.isValid && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewUrl}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        プレビュー
                      </Button>
                    )}
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>おすすめサービス:</strong>{' '}
                    ギガファイル便、firestorage、WeTransfer
                    <br />
                    パスワード保護と有効期限の設定をお忘れなく！
                  </AlertDescription>
                </Alert>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="externalPassword"
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    パスワード（推奨）
                  </Label>
                  <Input
                    id="externalPassword"
                    type="text"
                    placeholder="セキュリティのため設定推奨"
                    value={formData.externalPassword}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        externalPassword: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="externalExpiresAt"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    有効期限
                  </Label>
                  <Input
                    id="externalExpiresAt"
                    type="date"
                    value={formData.externalExpiresAt}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        externalExpiresAt: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* 写真詳細情報 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              写真詳細
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photoCount">写真枚数 *</Label>
                <Input
                  id="photoCount"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.photoCount}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      photoCount: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution">画質</Label>
                <Select
                  value={formData.resolution}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      resolution: value as 'high' | 'medium' | 'web',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高画質（原寸）</SelectItem>
                    <SelectItem value="medium">中画質（SNS用）</SelectItem>
                    <SelectItem value="web">Web用（軽量）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {deliveryMethod === 'direct_upload' && (
              <div className="space-y-2">
                <Label htmlFor="totalSize">総ファイルサイズ (MB)</Label>
                <Input
                  id="totalSize"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.totalSizeMb}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      totalSizeMb: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            )}
          </div>

          {/* カメラマンからのメッセージ */}
          <div className="space-y-2">
            <Label htmlFor="message">ゲストへのメッセージ（任意）</Label>
            <Textarea
              id="message"
              placeholder="撮影いただきありがとうございました。素敵な写真に仕上がりました..."
              value={formData.photographerMessage}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  photographerMessage: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          <Separator />

          {/* 配信確認と送信 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h5 className="font-medium text-gray-900">配信内容確認</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">写真枚数:</span>
                <span className="ml-2 font-medium">
                  {formData.photoCount}枚
                </span>
              </div>
              <div>
                <span className="text-gray-600">画質:</span>
                <span className="ml-2 font-medium">
                  {formData.resolution === 'high'
                    ? '高画質'
                    : formData.resolution === 'medium'
                      ? '中画質'
                      : 'Web用'}
                </span>
              </div>
              {deliveryMethod === 'external_url' && detectedService && (
                <div className="col-span-2">
                  <span className="text-gray-600">配信方法:</span>
                  <span className="ml-2 font-medium">
                    {detectedService.icon} {detectedService.serviceName}
                  </span>
                  {formData.externalPassword && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      パスワード保護
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                配信中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                写真を配信する
              </>
            )}
          </Button>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              配信完了後、ゲストに通知が送信され、エスクロー決済の処理が開始されます。
              ゲストが72時間以内に受取確認をしない場合、自動的に決済が完了します。
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
}
