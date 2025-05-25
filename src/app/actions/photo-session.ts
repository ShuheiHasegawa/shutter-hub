'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface PhotoSessionData {
  title: string;
  description?: string;
  location: string;
  address?: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  price_per_person: number;
  is_published: boolean;
}

export async function createPhotoSessionAction(data: PhotoSessionData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data: session, error } = await supabase
      .from('photo_sessions')
      .insert({
        ...data,
        organizer_id: user.id,
        current_participants: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('撮影会作成エラー:', error);
      return { success: false, error: '撮影会の作成に失敗しました' };
    }

    revalidatePath('/photo-sessions');
    revalidatePath('/dashboard');

    return { success: true, data: session };
  } catch (error) {
    console.error('撮影会作成エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

export async function updatePhotoSessionAction(
  sessionId: string,
  data: PhotoSessionData
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 撮影会の所有者確認
    const { data: existingSession } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', sessionId)
      .single();

    if (!existingSession || existingSession.organizer_id !== user.id) {
      return { success: false, error: '権限がありません' };
    }

    const { data: session, error } = await supabase
      .from('photo_sessions')
      .update(data)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('撮影会更新エラー:', error);
      return { success: false, error: '撮影会の更新に失敗しました' };
    }

    revalidatePath('/photo-sessions');
    revalidatePath(`/photo-sessions/${sessionId}`);
    revalidatePath('/dashboard');

    return { success: true, data: session };
  } catch (error) {
    console.error('撮影会更新エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

export async function canJoinPhotoSessionAction(
  sessionId: string,
  userId: string
) {
  try {
    const supabase = await createClient();

    // 撮影会情報を取得
    const { data: session } = await supabase
      .from('photo_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return { canJoin: false, reason: '撮影会が見つかりません' };
    }

    // 既に予約済みかチェック
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('photo_session_id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .single();

    if (existingBooking) {
      return { canJoin: false, reason: '既に予約済みです' };
    }

    // 満席チェック
    if (session.current_participants >= session.max_participants) {
      return { canJoin: false, reason: 'この撮影会は満席です' };
    }

    // 開始時刻チェック
    const startTime = new Date(session.start_time);
    const now = new Date();
    if (startTime <= now) {
      return {
        canJoin: false,
        reason: 'この撮影会は既に開始または終了しています',
      };
    }

    // 公開チェック
    if (!session.is_published) {
      return { canJoin: false, reason: 'この撮影会は公開されていません' };
    }

    return { canJoin: true, reason: null };
  } catch (error) {
    console.error('参加可能性チェックエラー:', error);
    return { canJoin: false, reason: '予期しないエラーが発生しました' };
  }
}
