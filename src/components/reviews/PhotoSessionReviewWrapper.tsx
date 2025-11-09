'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoSessionReviewForm } from './PhotoSessionReviewForm';
import { Star } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface PhotoSessionReviewWrapperProps {
  photoSessionId: string;
  bookingId?: string;
  canWriteReview: boolean;
  existingReview?: {
    id: string;
    overall_rating: number;
    organization_rating?: number | null;
    communication_rating?: number | null;
    value_rating?: number | null;
    venue_rating?: number | null;
    title?: string | null;
    content?: string | null;
    pros?: string | null;
    cons?: string | null;
    is_anonymous?: boolean;
  };
}

export function PhotoSessionReviewWrapper({
  photoSessionId,
  bookingId,
  canWriteReview,
  existingReview,
}: PhotoSessionReviewWrapperProps) {
  const router = useRouter();
  const locale = useLocale();
  const tReviews = useTranslations('reviews');
  // レビューが書ける場合または編集可能な場合は初期状態でフォームを表示
  const [showReviewForm] = useState(
    (canWriteReview && !!bookingId) || !!existingReview
  );

  // 初期表示時にフォームまでスクロール
  useEffect(() => {
    if (showReviewForm) {
      setTimeout(() => {
        const reviewForm = document.querySelector('[data-review-form]');
        if (reviewForm) {
          reviewForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [showReviewForm]);

  const handleReviewSuccess = () => {
    // レビュー投稿・更新成功後に撮影会詳細ページにリダイレクト
    router.push(`/${locale}/photo-sessions/${photoSessionId}`);
  };

  const handleCancel = () => {
    // キャンセル時に撮影会詳細ページに戻る
    router.push(`/${locale}/photo-sessions/${photoSessionId}`);
  };

  return (
    <div className="space-y-6">
      {/* レビュー投稿フォーム */}
      {((canWriteReview && bookingId) || existingReview) && showReviewForm && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            {existingReview ? 'レビュー修正' : tReviews('form.title')}
          </h2>
          <PhotoSessionReviewForm
            photoSessionId={photoSessionId}
            bookingId={bookingId}
            existingReview={existingReview}
            onSuccess={handleReviewSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
