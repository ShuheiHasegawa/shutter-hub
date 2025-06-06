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
} from 'lucide-react';
import {
  deliverPhotos,
  getExternalDeliveryServices,
} from '@/app/actions/instant-payment';
import type {
  InstantBooking,
  DeliverPhotosData,
  DeliveryMethod,
  ExternalDeliveryService,
} from '@/types/instant-photo';

interface PhotoDeliveryFormProps {
  booking: InstantBooking;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PhotoDeliveryForm({
  booking,
  onSuccess,
  onError,
}: PhotoDeliveryFormProps) {
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>('external_url');
  const [formData, setFormData] = useState<Partial<DeliverPhotosData>>({
    booking_id: booking.id,
    delivery_method: 'external_url',
    photo_count: 10,
    resolution: 'high',
    formats: ['jpg'],
  });
  const [externalServices, setExternalServices] = useState<
    ExternalDeliveryService[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 外部配信サービス一覧を取得
  useEffect(() => {
    const loadServices = async () => {
      const result = await getExternalDeliveryServices();
      if (result.success && result.data) {
        setExternalServices(result.data);
      }
    };
    loadServices();
  }, []);

  // 配信方法変更時にフォームをリセット
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      delivery_method: deliveryMethod,
      // 配信方法に応じて不要なフィールドをクリア
      ...(deliveryMethod === 'direct_upload' && {
        external_url: undefined,
        external_service: undefined,
        external_password: undefined,
        external_expires_at: undefined,
      }),
      ...(deliveryMethod === 'external_url' && {
        delivery_url: undefined,
        total_size_mb: undefined,
        thumbnail_url: undefined,
      }),
    }));
  }, [deliveryMethod]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.photo_count || formData.photo_count <= 0) {
      setErrorMessage('写真枚数を入力してください');
      return;
    }

    if (deliveryMethod === 'external_url' && !formData.external_url) {
      setErrorMessage('配信URLを入力してください');
      return;
    }

    if (deliveryMethod === 'direct_upload' && !formData.delivery_url) {
      setErrorMessage('アップロードURLを入力してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await deliverPhotos(formData as DeliverPhotosData);
      if (result.success) {
        setSubmitStatus('success');
        onSuccess?.();
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || '配信の記録に失敗しました');
        onError?.(result.error || '配信の記録に失敗しました');
      }
    } catch (error) {
      console.error('写真配信エラー:', error);
      setSubmitStatus('error');
      setErrorMessage('予期しないエラーが発生しました');
      onError?.('予期しないエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedService = () => {
    return externalServices.find(
      service => service.id === formData.external_service
    );
  };

  const selectedService = getSelectedService();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-blue-600" />
          写真配信
        </CardTitle>
        <p className="text-sm text-gray-600">
          撮影した写真をゲストに配信してください
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 成功・エラー表示 */}
        {submitStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              写真配信が完了しました！ゲストが受取確認を行うまでお待ちください。
            </AlertDescription>
          </Alert>
        )}

        {submitStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 配信方法選択 */}
          <div className="space-y-3">
            <Label>配信方法</Label>
            <RadioGroup
              value={deliveryMethod}
              onValueChange={value =>
                setDeliveryMethod(value as DeliveryMethod)
              }
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external_url" id="external_url" />
                <Label
                  htmlFor="external_url"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  外部サービス（ギガファイル便等）
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct_upload" id="direct_upload" />
                <Label
                  htmlFor="direct_upload"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  直接アップロード
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 外部URL配信 */}
          {deliveryMethod === 'external_url' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                外部サービス配信
              </h4>

              {/* サービス選択 */}
              <div className="space-y-2">
                <Label htmlFor="external_service">配信サービス</Label>
                <Select
                  value={formData.external_service}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, external_service: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="配信サービスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {externalServices.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center gap-2">
                          <span>{service.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {service.max_file_size_gb}GB
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 配信URL */}
              <div className="space-y-2">
                <Label htmlFor="external_url">配信URL *</Label>
                <Input
                  id="external_url"
                  type="url"
                  placeholder={
                    selectedService?.url_pattern || 'https://example.com/...'
                  }
                  value={formData.external_url || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      external_url: e.target.value,
                    }))
                  }
                  required
                />
                {selectedService && (
                  <p className="text-xs text-gray-600">
                    {selectedService.name}の共有URLを入力してください
                  </p>
                )}
              </div>

              {/* パスワード（対応サービスのみ） */}
              {selectedService?.supports_password && (
                <div className="space-y-2">
                  <Label
                    htmlFor="external_password"
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-3 w-3" />
                    パスワード（任意）
                  </Label>
                  <Input
                    id="external_password"
                    type="text"
                    placeholder="アクセスパスワード"
                    value={formData.external_password || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        external_password: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {/* 有効期限（対応サービスのみ） */}
              {selectedService?.supports_expiry && (
                <div className="space-y-2">
                  <Label
                    htmlFor="external_expires_at"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-3 w-3" />
                    有効期限（任意）
                  </Label>
                  <Input
                    id="external_expires_at"
                    type="datetime-local"
                    value={formData.external_expires_at || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        external_expires_at: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* 直接アップロード */}
          {deliveryMethod === 'direct_upload' && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                直接アップロード
              </h4>

              <div className="space-y-2">
                <Label htmlFor="delivery_url">アップロードURL *</Label>
                <Input
                  id="delivery_url"
                  type="url"
                  placeholder="https://storage.example.com/..."
                  value={formData.delivery_url || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      delivery_url: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_size_mb">ファイルサイズ（MB）</Label>
                  <Input
                    id="total_size_mb"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.total_size_mb || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        total_size_mb: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail_url">サムネイルURL（任意）</Label>
                  <Input
                    id="thumbnail_url"
                    type="url"
                    value={formData.thumbnail_url || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        thumbnail_url: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* 写真詳細 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              写真詳細
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photo_count">写真枚数 *</Label>
                <Input
                  id="photo_count"
                  type="number"
                  min="1"
                  value={formData.photo_count || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      photo_count: parseInt(e.target.value),
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
                    <SelectItem value="high">高画質（元データ）</SelectItem>
                    <SelectItem value="medium">中画質</SelectItem>
                    <SelectItem value="web">Web用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ファイル形式</Label>
              <div className="flex flex-wrap gap-2">
                {['jpg', 'png', 'raw', 'edited'].map(format => (
                  <Label
                    key={format}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.formats?.includes(format) || false}
                      onChange={e => {
                        const newFormats = e.target.checked
                          ? [...(formData.formats || []), format]
                          : (formData.formats || []).filter(f => f !== format);
                        setFormData(prev => ({ ...prev, formats: newFormats }));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{format.toUpperCase()}</span>
                  </Label>
                ))}
              </div>
            </div>
          </div>

          {/* カメラマンからのメッセージ */}
          <div className="space-y-2">
            <Label htmlFor="photographer_message">
              ゲストへのメッセージ（任意）
            </Label>
            <Textarea
              id="photographer_message"
              placeholder="撮影お疲れさまでした！素敵な写真が撮れました。お受け取りください。"
              value={formData.photographer_message || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  photographer_message: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-medium text-yellow-900 mb-2">
                  配信後の流れ
                </h4>
                <ul className="space-y-1 text-yellow-800">
                  <li>• 配信完了後、ゲストに通知が送信されます</li>
                  <li>• ゲストが受取確認を行うまで決済は保留状態です</li>
                  <li>
                    • 72時間以内に確認がない場合、自動的に受取確認となります
                  </li>
                  <li>
                    •
                    受取確認後、プラットフォーム手数料を差し引いた金額がお支払いされます
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* 送信ボタン */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || submitStatus === 'success'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                配信中...
              </>
            ) : submitStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                配信完了
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                写真を配信する
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
