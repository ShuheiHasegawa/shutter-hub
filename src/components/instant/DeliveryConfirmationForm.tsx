'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  Star,
  Heart,
  ThumbsUp,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { confirmDeliveryWithReview } from '@/app/actions/instant-payment';
import type { PhotoDelivery, ConfirmDeliveryData } from '@/types/instant-photo';

interface DeliveryConfirmationFormProps {
  delivery: PhotoDelivery;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// インタラクティブ星評価コンポーネント
function StarRating({
  value,
  onChange,
  size = 'md',
  label,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex items-center gap-1">
        {stars.map(star => (
          <button
            key={star}
            type="button"
            className={`${sizeClasses[size]} transition-colors hover:scale-110 transform`}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={`w-full h-full ${
                star <= (hoverRating || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {value > 0 ? `${value}/5` : '評価してください'}
        </span>
      </div>
    </div>
  );
}

// レビューテンプレート
const reviewTemplates = {
  excellent: {
    photographer:
      'とても素晴らしいカメラマンでした！プロフェッショナルで、こちらの要望をよく理解してくれました。',
    photo: '写真の仕上がりも期待以上で、大満足です！',
    service: '迅速で丁寧な対応をしていただき、ありがとうございました。',
  },
  good: {
    photographer:
      '親切で話しやすいカメラマンでした。撮影もスムーズに進みました。',
    photo: 'きれいな写真を撮っていただき、満足しています。',
    service: 'スムーズな取引でした。また機会があればお願いしたいです。',
  },
  average: {
    photographer: '普通の対応でした。特に問題はありませんでした。',
    photo: '写真の品質は標準的でした。',
    service: 'サービスは普通でした。',
  },
};

export function DeliveryConfirmationForm({
  delivery,
  onSuccess,
  onError,
}: DeliveryConfirmationFormProps) {
  const [formData, setFormData] = useState<ConfirmDeliveryData>({
    booking_id: delivery.booking_id,
    is_satisfied: true,
    photographer_rating: 0,
    photo_quality_rating: 0,
    service_rating: 0,
    would_recommend: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // バリデーション
    if (formData.photographer_rating === 0) {
      setErrorMessage('カメラマンの評価を選択してください');
      return;
    }

    if (formData.photo_quality_rating === 0) {
      setErrorMessage('写真品質の評価を選択してください');
      return;
    }

    if (formData.service_rating === 0) {
      setErrorMessage('サービスの評価を選択してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await confirmDeliveryWithReview(formData);

      if (result.success) {
        setSubmitStatus('success');
        onSuccess?.();
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || '受取確認に失敗しました');
        onError?.(result.error || '受取確認に失敗しました');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('予期しないエラーが発生しました');
      onError?.('予期しないエラーが発生しました');
      console.error('受取確認エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // テンプレート適用
  const applyTemplate = (type: keyof typeof reviewTemplates) => {
    const template = reviewTemplates[type];
    setFormData(prev => ({
      ...prev,
      photographer_review: template.photographer,
      photo_quality_comment: template.photo,
      service_comment: template.service,
      photographer_rating: type === 'excellent' ? 5 : type === 'good' ? 4 : 3,
      photo_quality_rating: type === 'excellent' ? 5 : type === 'good' ? 4 : 3,
      service_rating: type === 'excellent' ? 5 : type === 'good' ? 4 : 3,
    }));
    setShowTemplates(false);
  };

  // 満足度に基づく自動評価
  const handleSatisfactionChange = (satisfied: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_satisfied: satisfied,
      photographer_rating: satisfied ? 4 : 2,
      photo_quality_rating: satisfied ? 4 : 2,
      service_rating: satisfied ? 4 : 2,
      would_recommend: satisfied,
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          写真受取確認 & レビュー
        </CardTitle>
        <p className="text-sm text-gray-600">
          写真を確認して、カメラマンとサービスの評価をお願いします。
        </p>
      </CardHeader>

      <CardContent>
        {submitStatus === 'success' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              受取確認とレビューが完了しました！エスクロー決済が処理されます。
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
          {/* 配信情報サマリー */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-gray-900">配信された写真</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">写真枚数:</span>
                <span className="ml-2 font-medium">
                  {delivery.photo_count}枚
                </span>
              </div>
              <div>
                <span className="text-gray-600">画質:</span>
                <span className="ml-2 font-medium">{delivery.resolution}</span>
              </div>
              <div>
                <span className="text-gray-600">配信方法:</span>
                <span className="ml-2 font-medium">
                  {delivery.delivery_method === 'external_url'
                    ? '外部URL'
                    : '直接配信'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">配信日時:</span>
                <span className="ml-2 font-medium">
                  {new Date(delivery.delivered_at).toLocaleString('ja-JP')}
                </span>
              </div>
            </div>

            {delivery.photographer_message && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <h5 className="text-sm font-medium text-blue-900 mb-1">
                  カメラマンからのメッセージ
                </h5>
                <p className="text-sm text-blue-800">
                  {delivery.photographer_message}
                </p>
              </div>
            )}
          </div>

          {/* 総合満足度 */}
          <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-pink-500" />
              <Label className="text-base font-medium">
                総合的に満足されましたか？
              </Label>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={formData.is_satisfied ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSatisfactionChange(true)}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                満足
              </Button>
              <Button
                type="button"
                variant={!formData.is_satisfied ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleSatisfactionChange(false)}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                不満
              </Button>
            </div>
          </div>

          {/* 詳細評価 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                詳細評価
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-3 w-3" />
                テンプレート
              </Button>
            </div>

            {/* レビューテンプレート */}
            {showTemplates && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('excellent')}
                  className="text-xs"
                >
                  ⭐⭐⭐⭐⭐
                  <br />
                  大満足
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('good')}
                  className="text-xs"
                >
                  ⭐⭐⭐⭐
                  <br />
                  満足
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('average')}
                  className="text-xs"
                >
                  ⭐⭐⭐
                  <br />
                  普通
                </Button>
              </div>
            )}

            {/* カメラマン評価 */}
            <div className="space-y-3">
              <StarRating
                label="カメラマンの対応"
                value={formData.photographer_rating}
                onChange={rating =>
                  setFormData(prev => ({
                    ...prev,
                    photographer_rating: rating,
                  }))
                }
                size="lg"
              />
              <Textarea
                placeholder="カメラマンの対応についてのコメント（任意）"
                value={formData.photographer_review || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    photographer_review: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            {/* 写真品質評価 */}
            <div className="space-y-3">
              <StarRating
                label="写真の品質"
                value={formData.photo_quality_rating}
                onChange={rating =>
                  setFormData(prev => ({
                    ...prev,
                    photo_quality_rating: rating,
                  }))
                }
                size="lg"
              />
              <Textarea
                placeholder="写真の品質についてのコメント（任意）"
                value={formData.photo_quality_comment || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    photo_quality_comment: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            {/* サービス評価 */}
            <div className="space-y-3">
              <StarRating
                label="サービス全体"
                value={formData.service_rating}
                onChange={rating =>
                  setFormData(prev => ({ ...prev, service_rating: rating }))
                }
                size="lg"
              />
              <Textarea
                placeholder="サービス全体についてのコメント（任意）"
                value={formData.service_comment || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    service_comment: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>

          {/* 推奨度 */}
          <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="recommend"
                checked={formData.would_recommend}
                onCheckedChange={checked =>
                  setFormData(prev => ({ ...prev, would_recommend: !!checked }))
                }
              />
              <Label htmlFor="recommend" className="font-medium">
                このカメラマンを他の人に推奨しますか？
              </Label>
            </div>
            {formData.would_recommend && (
              <Textarea
                placeholder="推奨する理由をお聞かせください（任意）"
                value={formData.recommend_reason || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    recommend_reason: e.target.value,
                  }))
                }
                rows={2}
              />
            )}
          </div>

          {/* 問題報告 */}
          {!formData.is_satisfied && (
            <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <Label className="font-medium text-red-900">
                どのような問題がありましたか？（複数選択可）
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'quality', label: '写真の品質' },
                  { value: 'quantity', label: '写真の枚数' },
                  { value: 'timing', label: '遅延・時間' },
                  { value: 'communication', label: 'コミュニケーション' },
                  { value: 'professional', label: 'プロ意識' },
                  { value: 'other', label: 'その他' },
                ].map(issue => (
                  <div
                    key={issue.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={issue.value}
                      checked={formData.issues?.includes(issue.value) || false}
                      onCheckedChange={checked => {
                        const currentIssues = formData.issues || [];
                        const newIssues = checked
                          ? [...currentIssues, issue.value]
                          : currentIssues.filter(i => i !== issue.value);
                        setFormData(prev => ({ ...prev, issues: newIssues }));
                      }}
                    />
                    <Label htmlFor={issue.value} className="text-sm">
                      {issue.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.issues && formData.issues.length > 0 && (
                <Textarea
                  placeholder="詳細な問題の説明をお聞かせください"
                  value={formData.issue_description || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      issue_description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              )}
            </div>
          )}

          <Separator />

          {/* 評価サマリー */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h5 className="font-medium text-gray-900">評価サマリー</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formData.photographer_rating || '-'}
                </div>
                <div className="text-gray-600">カメラマン</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formData.photo_quality_rating || '-'}
                </div>
                <div className="text-gray-600">写真品質</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formData.service_rating || '-'}
                </div>
                <div className="text-gray-600">サービス</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium">
                平均評価:{' '}
                <span className="text-yellow-600">
                  {formData.photographer_rating &&
                  formData.photo_quality_rating &&
                  formData.service_rating
                    ? (
                        (formData.photographer_rating +
                          formData.photo_quality_rating +
                          formData.service_rating) /
                        3
                      ).toFixed(1)
                    : '-'}
                </span>
              </div>
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
                処理中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                受取確認とレビューを送信
              </>
            )}
          </Button>

          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription className="text-sm">
              レビューは他のユーザーがカメラマンを選ぶ際の参考になります。
              正直で建設的なフィードバックをお願いします。
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
}
