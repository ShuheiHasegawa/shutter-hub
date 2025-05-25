'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoSessionReviewForm } from './PhotoSessionReviewForm';
import { ReviewList } from './ReviewList';
import { Separator } from '@/components/ui/separator';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PhotoSessionReviewWrapperProps {
  photoSessionId: string;
  bookingId?: string;
  canWriteReview: boolean;
}

export function PhotoSessionReviewWrapper({
  photoSessionId,
  bookingId,
  canWriteReview,
}: PhotoSessionReviewWrapperProps) {
  const router = useRouter();
  const tReviews = useTranslations('reviews');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleReviewSuccess = () => {
    // レビュー投稿成功後にページをリフレッシュ
    router.refresh();
    setShowReviewForm(false);
  };

  const handleAddReviewClick = () => {
    setShowReviewForm(true);
    // レビューフォームまでスクロール
    setTimeout(() => {
      const reviewForm = document.querySelector('[data-review-form]');
      if (reviewForm) {
        reviewForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      <Separator />

      {/* レビュー投稿フォーム */}
      {canWriteReview && bookingId && showReviewForm && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            {tReviews('form.title')}
          </h2>
          <PhotoSessionReviewForm
            photoSessionId={photoSessionId}
            bookingId={bookingId}
            onSuccess={handleReviewSuccess}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      {/* レビュー一覧 */}
      <div>
        <ReviewList
          photoSessionId={photoSessionId}
          showAddReviewButton={canWriteReview && !!bookingId && !showReviewForm}
          onAddReviewClick={handleAddReviewClick}
        />
      </div>
    </div>
  );
}
