'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// レビューシステムのServer Actions

export interface CreatePhotoSessionReviewData {
  photo_session_id: string;
  booking_id: string;
  overall_rating: number;
  organization_rating?: number;
  communication_rating?: number;
  value_rating?: number;
  venue_rating?: number;
  title?: string;
  content?: string;
  pros?: string;
  cons?: string;
  is_anonymous?: boolean;
}

export interface CreateUserReviewData {
  photo_session_id: string;
  reviewee_id: string;
  booking_id: string;
  overall_rating: number;
  punctuality_rating?: number;
  communication_rating?: number;
  professionalism_rating?: number;
  cooperation_rating?: number;
  title?: string;
  content?: string;
  reviewer_role: 'organizer' | 'participant';
  reviewee_role: 'organizer' | 'participant';
  is_anonymous?: boolean;
}

export interface ReviewHelpfulVoteData {
  review_id: string;
  review_type: 'photo_session' | 'user';
  is_helpful: boolean;
}

export interface ReviewReportData {
  review_id: string;
  review_type: 'photo_session' | 'user';
  reason: 'spam' | 'inappropriate' | 'fake' | 'harassment' | 'other';
  description?: string;
}

// 撮影会レビューを作成
export async function createPhotoSessionReview(
  data: CreatePhotoSessionReviewData
) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 予約の確認（実際に参加したかチェック）
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', data.booking_id)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .single();

    if (bookingError || !booking) {
      return { error: 'Valid booking not found' };
    }

    // 撮影会が終了しているかチェック
    const { data: photoSession, error: sessionError } = await supabase
      .from('photo_sessions')
      .select('end_time')
      .eq('id', data.photo_session_id)
      .single();

    if (sessionError || !photoSession) {
      return { error: 'Photo session not found' };
    }

    const now = new Date();
    const endTime = new Date(photoSession.end_time);
    if (now < endTime) {
      return { error: 'Cannot review before photo session ends' };
    }

    // 重複レビューチェック
    const { data: existingReview, error: checkError } = await supabase
      .from('photo_session_reviews')
      .select('id')
      .eq('photo_session_id', data.photo_session_id)
      .eq('reviewer_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('レビューチェックエラー:', checkError);
      return { error: 'Failed to check existing review' };
    }

    if (existingReview) {
      return { error: 'Review already exists for this photo session' };
    }

    // レビュー作成
    const { data: review, error: createError } = await supabase
      .from('photo_session_reviews')
      .insert({
        photo_session_id: data.photo_session_id,
        reviewer_id: user.id,
        booking_id: data.booking_id,
        overall_rating: data.overall_rating,
        organization_rating: data.organization_rating,
        communication_rating: data.communication_rating,
        value_rating: data.value_rating,
        venue_rating: data.venue_rating,
        title: data.title,
        content: data.content,
        pros: data.pros,
        cons: data.cons,
        is_anonymous: data.is_anonymous || false,
        is_verified: true, // 予約確認済みなので検証済み
        status: 'published',
      })
      .select()
      .single();

    if (createError) {
      console.error('レビュー作成エラー:', createError);
      return { error: 'Failed to create review' };
    }

    revalidatePath('/photo-sessions');
    return { data: review };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// ユーザーレビューを作成
export async function createUserReview(data: CreateUserReviewData) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 予約の確認
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', data.booking_id)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .single();

    if (bookingError || !booking) {
      return { error: 'Valid booking not found' };
    }

    // 撮影会が終了しているかチェック
    const { data: photoSession, error: sessionError } = await supabase
      .from('photo_sessions')
      .select('end_time, organizer_id')
      .eq('id', data.photo_session_id)
      .single();

    if (sessionError || !photoSession) {
      return { error: 'Photo session not found' };
    }

    const now = new Date();
    const endTime = new Date(photoSession.end_time);
    if (now < endTime) {
      return { error: 'Cannot review before photo session ends' };
    }

    // 自分自身をレビューしようとしていないかチェック
    if (data.reviewee_id === user.id) {
      return { error: 'Cannot review yourself' };
    }

    // レビュー対象者が撮影会に参加していたかチェック
    const { error: revieweeBookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('photo_session_id', data.photo_session_id)
      .eq('user_id', data.reviewee_id)
      .eq('status', 'confirmed')
      .single();

    // 主催者の場合は予約がなくても良い
    if (revieweeBookingError && data.reviewee_role === 'participant') {
      return { error: 'Reviewee did not participate in this photo session' };
    }

    if (
      data.reviewee_role === 'organizer' &&
      data.reviewee_id !== photoSession.organizer_id
    ) {
      return { error: 'Invalid organizer review target' };
    }

    // 重複レビューチェック
    const { data: existingReview, error: checkError } = await supabase
      .from('user_reviews')
      .select('id')
      .eq('photo_session_id', data.photo_session_id)
      .eq('reviewer_id', user.id)
      .eq('reviewee_id', data.reviewee_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('ユーザーレビューチェックエラー:', checkError);
      return { error: 'Failed to check existing review' };
    }

    if (existingReview) {
      return { error: 'Review already exists for this user' };
    }

    // レビュー作成
    const { data: review, error: createError } = await supabase
      .from('user_reviews')
      .insert({
        photo_session_id: data.photo_session_id,
        reviewer_id: user.id,
        reviewee_id: data.reviewee_id,
        booking_id: data.booking_id,
        overall_rating: data.overall_rating,
        punctuality_rating: data.punctuality_rating,
        communication_rating: data.communication_rating,
        professionalism_rating: data.professionalism_rating,
        cooperation_rating: data.cooperation_rating,
        title: data.title,
        content: data.content,
        reviewer_role: data.reviewer_role,
        reviewee_role: data.reviewee_role,
        is_anonymous: data.is_anonymous || false,
        status: 'published',
      })
      .select()
      .single();

    if (createError) {
      console.error('ユーザーレビュー作成エラー:', createError);
      return { error: 'Failed to create user review' };
    }

    revalidatePath('/photo-sessions');
    return { data: review };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// レビューの役立ち評価を投票
export async function voteReviewHelpful(data: ReviewHelpfulVoteData) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 既存の投票をチェック
    const { data: existingVote, error: checkError } = await supabase
      .from('review_helpful_votes')
      .select('*')
      .eq('review_id', data.review_id)
      .eq('review_type', data.review_type)
      .eq('voter_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('投票チェックエラー:', checkError);
      return { error: 'Failed to check existing vote' };
    }

    if (existingVote) {
      // 既存の投票を更新
      const { data: vote, error: updateError } = await supabase
        .from('review_helpful_votes')
        .update({ is_helpful: data.is_helpful })
        .eq('id', existingVote.id)
        .select()
        .single();

      if (updateError) {
        console.error('投票更新エラー:', updateError);
        return { error: 'Failed to update vote' };
      }

      return { data: vote };
    } else {
      // 新しい投票を作成
      const { data: vote, error: createError } = await supabase
        .from('review_helpful_votes')
        .insert({
          review_id: data.review_id,
          review_type: data.review_type,
          voter_id: user.id,
          is_helpful: data.is_helpful,
        })
        .select()
        .single();

      if (createError) {
        console.error('投票作成エラー:', createError);
        return { error: 'Failed to create vote' };
      }

      return { data: vote };
    }
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// レビューを報告
export async function reportReview(data: ReviewReportData) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // 重複報告チェック
    const { data: existingReport, error: checkError } = await supabase
      .from('review_reports')
      .select('id')
      .eq('review_id', data.review_id)
      .eq('review_type', data.review_type)
      .eq('reporter_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('報告チェックエラー:', checkError);
      return { error: 'Failed to check existing report' };
    }

    if (existingReport) {
      return { error: 'Review already reported by you' };
    }

    // 報告作成
    const { data: report, error: createError } = await supabase
      .from('review_reports')
      .insert({
        review_id: data.review_id,
        review_type: data.review_type,
        reporter_id: user.id,
        reason: data.reason,
        description: data.description,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('報告作成エラー:', createError);
      return { error: 'Failed to create report' };
    }

    return { data: report };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 撮影会のレビュー一覧を取得
export async function getPhotoSessionReviews(photoSessionId: string) {
  try {
    const supabase = await createClient();

    const { data: reviews, error } = await supabase
      .from('photo_session_reviews')
      .select(
        `
        *,
        reviewer:profiles!photo_session_reviews_reviewer_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('photo_session_id', photoSessionId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('レビュー取得エラー:', error);
      return { error: 'Failed to fetch reviews' };
    }

    return { data: reviews };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// ユーザーのレビュー一覧を取得
export async function getUserReviews(userId: string) {
  try {
    const supabase = await createClient();

    const { data: reviews, error } = await supabase
      .from('user_reviews')
      .select(
        `
        *,
        reviewer:profiles!user_reviews_reviewer_id_fkey(
          id,
          display_name,
          avatar_url
        ),
        photo_session:photo_sessions(
          id,
          title,
          start_time
        )
      `
      )
      .eq('reviewee_id', userId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ユーザーレビュー取得エラー:', error);
      return { data: null, error: error.message };
    }

    return { data: reviews || [], error: null };
  } catch (error) {
    console.error('getUserReviews実行エラー:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ユーザーの評価統計を取得
export async function getUserRatingStats(userId: string) {
  try {
    const supabase = await createClient();

    const { data: stats, error } = await supabase
      .from('user_rating_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('評価統計取得エラー:', error);
      return { error: 'Failed to fetch rating stats' };
    }

    return { data: stats };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}

// 撮影会の評価統計を取得
export async function getPhotoSessionRatingStats(photoSessionId: string) {
  try {
    const supabase = await createClient();

    const { data: stats, error } = await supabase
      .from('photo_session_rating_stats')
      .select('*')
      .eq('photo_session_id', photoSessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('撮影会評価統計取得エラー:', error);
      return { error: 'Failed to fetch photo session rating stats' };
    }

    return { data: stats };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { error: 'Unexpected error occurred' };
  }
}
