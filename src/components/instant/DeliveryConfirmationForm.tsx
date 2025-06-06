'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, CheckCircle, AlertTriangle, Loader2, Gift } from 'lucide-react';
import { confirmDeliveryWithReview } from '@/app/actions/instant-payment';
import type {
  ConfirmDeliveryData,
  InstantBooking,
} from '@/types/instant-photo';

export function DeliveryConfirmationForm({
  booking,
  onSuccess,
  onError,
}: {
  booking: InstantBooking;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}) {
  const [formData, setFormData] = useState<Partial<ConfirmDeliveryData>>({
    booking_id: booking.id,
    is_satisfied: true,
    photographer_rating: 5,
    photo_quality_rating: 5,
    service_rating: 5,
    would_recommend: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirmDelivery = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await confirmDeliveryWithReview(
        formData as ConfirmDeliveryData
      );
      if (result.success) {
        setSubmitStatus('success');
        onSuccess?.();
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || '確認処理に失敗しました');
        onError?.(result.error || '確認処理に失敗しました');
      }
    } catch (error) {
      console.error('配信確認エラー:', error);
      setSubmitStatus('error');
      setErrorMessage('予期しないエラーが発生しました');
      onError?.('予期しないエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-green-600" />
          写真受取確認
        </CardTitle>
        <p className="text-sm text-gray-600">
          写真の受取確認とレビューをお願いします
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {submitStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              受取確認が完了しました！決済が実行され、取引が完了しました。
            </AlertDescription>
          </Alert>
        )}

        {submitStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {submitStatus !== 'success' && (
          <>
            <div className="space-y-4">
              <Label>写真の品質に満足していますか？</Label>
              <RadioGroup
                value={formData.is_satisfied ? 'satisfied' : 'not_satisfied'}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    is_satisfied: value === 'satisfied',
                  }))
                }
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="satisfied" id="satisfied" />
                  <Label htmlFor="satisfied">満足している</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_satisfied" id="not_satisfied" />
                  <Label htmlFor="not_satisfied">満足していない</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.is_satisfied && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>カメラマンの評価</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setFormData(prev => ({
                            ...prev,
                            photographer_rating: star,
                          }))
                        }
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= (formData.photographer_rating || 0)
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photographer_review">コメント（任意）</Label>
                  <Textarea
                    id="photographer_review"
                    placeholder="カメラマンへのコメントをお聞かせください"
                    value={formData.photographer_review || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        photographer_review: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleConfirmDelivery}
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  確認中...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  受取確認
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
