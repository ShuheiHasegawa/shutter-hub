'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Clock,
  Users,
  Camera,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  createInstantPhotoRequest,
  findNearbyPhotographers,
  checkGuestUsageLimit,
} from '@/app/actions/instant-photo';
import { checkLocationAccuracy } from '@/hooks/useGeolocation';
import type {
  LocationData,
  RequestType,
  RequestUrgency,
  QuickRequestFormData,
  NearbyPhotographer,
  GuestUsageLimit,
} from '@/types/instant-photo';

interface QuickRequestFormProps {
  location: LocationData;
}

export function QuickRequestForm({ location }: QuickRequestFormProps) {
  const [formData, setFormData] = useState<QuickRequestFormData>({
    requestType: 'portrait',
    urgency: 'within_30min',
    duration: 30,
    budget: 5000,
    specialRequests: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    partySize: 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [nearbyPhotographers, setNearbyPhotographers] = useState<
    NearbyPhotographer[]
  >([]);
  const [usageLimit, setUsageLimit] = useState<GuestUsageLimit | null>(null);

  // 位置情報の精度チェック
  const locationAccuracy = checkLocationAccuracy(location);

  // 料金計算
  const calculateTotalPrice = () => {
    const basePrice = formData.budget;
    let additionalFees = 0;

    // 緊急料金
    if (formData.urgency === 'now') {
      additionalFees += 2000;
    } else if (formData.urgency === 'within_30min') {
      additionalFees += 1000;
    }

    // 休日料金（簡易チェック）
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    if (isWeekend) {
      additionalFees += 1500;
    }

    // 夜間料金（18時以降）
    const isNight = now.getHours() >= 18;
    if (isNight) {
      additionalFees += 2000;
    }

    return {
      basePrice,
      additionalFees,
      totalPrice: basePrice + additionalFees,
    };
  };

  const priceBreakdown = calculateTotalPrice();

  // 近くのカメラマンを検索
  const searchNearbyPhotographers = async () => {
    setIsSearching(true);
    try {
      const result = await findNearbyPhotographers(
        location.latitude,
        location.longitude,
        1000,
        formData.requestType,
        priceBreakdown.totalPrice
      );

      if (result.success && result.data) {
        setNearbyPhotographers(result.data);
      }
    } catch (error) {
      console.error('カメラマン検索エラー:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // ゲスト利用制限をチェック
  const checkUsageLimit = async (phone: string) => {
    if (!phone) return;

    try {
      const result = await checkGuestUsageLimit(phone);
      if (result.success && result.data) {
        setUsageLimit(result.data);
      }
    } catch (error) {
      console.error('利用制限チェックエラー:', error);
    }
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.guestName || !formData.guestPhone) {
      setErrorMessage('お名前と電話番号は必須です');
      return;
    }

    if (usageLimit && !usageLimit.can_use) {
      setErrorMessage(
        `月の利用制限（3回）に達しています。現在 ${usageLimit.usage_count}/3 回`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const requestData = {
        guest_name: formData.guestName,
        guest_phone: formData.guestPhone,
        guest_email: formData.guestEmail || undefined,
        party_size: formData.partySize,
        location_lat: location.latitude,
        location_lng: location.longitude,
        location_address: location.address,
        location_landmark: location.landmark || undefined,
        request_type: formData.requestType,
        urgency: formData.urgency,
        duration: formData.duration as 15 | 30 | 60,
        budget: priceBreakdown.totalPrice,
        special_requests: formData.specialRequests || undefined,
      };

      const result = await createInstantPhotoRequest(requestData);

      if (result.success) {
        setSubmitStatus('success');
        setSuccessMessage(
          '撮影リクエストを送信しました！近くのカメラマンに通知中です...'
        );

        // フォームをリセット
        setFormData({
          requestType: 'portrait',
          urgency: 'within_30min',
          duration: 30,
          budget: 5000,
          specialRequests: '',
          guestName: '',
          guestPhone: '',
          guestEmail: '',
          partySize: 1,
        });
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'リクエストの送信に失敗しました');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('予期しないエラーが発生しました');
      console.error('リクエスト送信エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 電話番号変更時の利用制限チェック
  useEffect(() => {
    if (formData.guestPhone.length >= 10) {
      checkUsageLimit(formData.guestPhone);
    }
  }, [formData.guestPhone]);

  // 初回カメラマン検索
  useEffect(() => {
    searchNearbyPhotographers();
  }, [location, formData.requestType]);

  const requestTypes = [
    { value: 'portrait', label: 'ポートレート', icon: '👤', price: '¥3,000〜' },
    { value: 'couple', label: 'カップル・友人', icon: '👫', price: '¥5,000〜' },
    { value: 'family', label: 'ファミリー', icon: '👨‍👩‍👧‍👦', price: '¥8,000〜' },
    { value: 'group', label: 'グループ', icon: '👥', price: '¥10,000〜' },
  ];

  const urgencyOptions = [
    { value: 'now', label: '今すぐ', extra: '+¥2,000', icon: '⚡' },
    { value: 'within_30min', label: '30分以内', extra: '+¥1,000', icon: '🕐' },
    {
      value: 'within_1hour',
      label: '1時間以内',
      extra: '追加料金なし',
      icon: '⏰',
    },
  ];

  return (
    <Card id="quick-request" className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          即座撮影リクエスト
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>
            {location.address ||
              `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </span>
          <Badge
            variant={
              locationAccuracy.accuracy === 'high' ? 'default' : 'secondary'
            }
            className="text-xs"
          >
            {locationAccuracy.accuracy === 'high'
              ? '高精度'
              : locationAccuracy.accuracy === 'medium'
                ? '中精度'
                : '低精度'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 成功・エラーメッセージ */}
        {submitStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {submitStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* 利用制限警告 */}
        {usageLimit && usageLimit.usage_count > 0 && (
          <Alert
            className={
              usageLimit.can_use
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-red-200 bg-red-50'
            }
          >
            <AlertTriangle
              className={`h-4 w-4 ${usageLimit.can_use ? 'text-yellow-600' : 'text-red-600'}`}
            />
            <AlertDescription
              className={
                usageLimit.can_use ? 'text-yellow-800' : 'text-red-800'
              }
            >
              今月の利用回数: {usageLimit.usage_count}/3 回
              {!usageLimit.can_use && ' - 利用制限に達しています'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 撮影タイプ */}
          <div className="space-y-2">
            <Label htmlFor="requestType">撮影タイプ</Label>
            <div className="grid grid-cols-2 gap-2">
              {requestTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    formData.requestType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      requestType: type.value as RequestType,
                    }))
                  }
                >
                  <div className="text-lg mb-1">{type.icon}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 緊急度と撮影時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency">緊急度</Label>
              <div className="space-y-2">
                {urgencyOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full p-3 border rounded-lg text-left transition-colors ${
                      formData.urgency === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        urgency: option.value as RequestUrgency,
                      }))
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <Badge
                        variant={
                          option.value === 'now'
                            ? 'destructive'
                            : option.value === 'within_30min'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {option.extra}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">撮影時間</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    duration: parseInt(value) as 15 | 30 | 60,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15分</SelectItem>
                  <SelectItem value="30">30分</SelectItem>
                  <SelectItem value="60">60分</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 予算と人数 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">基本予算</Label>
              <Select
                value={formData.budget.toString()}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, budget: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3000">¥3,000</SelectItem>
                  <SelectItem value="5000">¥5,000</SelectItem>
                  <SelectItem value="8000">¥8,000</SelectItem>
                  <SelectItem value="10000">¥10,000</SelectItem>
                  <SelectItem value="15000">¥15,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partySize">参加人数</Label>
              <Select
                value={formData.partySize.toString()}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, partySize: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}名
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 料金内訳 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">料金内訳</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>基本料金</span>
                <span>¥{priceBreakdown.basePrice.toLocaleString()}</span>
              </div>
              {priceBreakdown.additionalFees > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>追加料金</span>
                  <span>
                    +¥{priceBreakdown.additionalFees.toLocaleString()}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>合計</span>
                <span>¥{priceBreakdown.totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 特別なリクエスト */}
          <div className="space-y-2">
            <Label htmlFor="specialRequests">特別なリクエスト（任意）</Label>
            <Textarea
              id="specialRequests"
              placeholder="撮影の希望やポーズ、注意事項などがあればお書きください"
              value={formData.specialRequests}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  specialRequests: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          <Separator />

          {/* ゲスト情報 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              ご連絡先情報
            </h4>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">お名前 *</Label>
                <Input
                  id="guestName"
                  type="text"
                  placeholder="山田 太郎"
                  value={formData.guestName}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      guestName: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestPhone">電話番号 *</Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  placeholder="090-1234-5678"
                  value={formData.guestPhone}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      guestPhone: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestEmail">メールアドレス（任意）</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.guestEmail}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      guestEmail: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 近くのカメラマン情報 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                近くのカメラマン
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={searchNearbyPhotographers}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    検索中
                  </>
                ) : (
                  '再検索'
                )}
              </Button>
            </div>

            {nearbyPhotographers.length > 0 ? (
              <div className="space-y-2">
                {nearbyPhotographers.slice(0, 3).map((photographer, index) => (
                  <div
                    key={photographer.photographer_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Camera className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          カメラマン #{index + 1}
                        </div>
                        <div className="text-xs text-gray-500">
                          {photographer.distance_meters}m • 評価{' '}
                          {photographer.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ¥{photographer.instant_rate.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {photographer.is_available ? '対応可能' : '対応不可'}
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500 text-center">
                  リクエスト送信後、これらのカメラマンに通知されます
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  近くに対応可能なカメラマンが見つかりませんでした
                </p>
                <p className="text-xs">時間や予算を調整してみてください</p>
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting || (usageLimit ? !usageLimit.can_use : false)
            }
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                送信中...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                撮影リクエストを送信
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            送信後、近くのカメラマンに通知され、平均5分以内に応答があります。
            <br />
            ゲストとして月3回まで無料でご利用いただけます。
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
