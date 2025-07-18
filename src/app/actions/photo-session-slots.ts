'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import { CreatePhotoSessionSlotData } from '@/types/photo-session';

export interface PhotoSessionWithSlotsData {
  title: string;
  description?: string;
  location: string;
  address?: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  price_per_person: number;
  booking_type?: string;
  allow_multiple_bookings?: boolean;
  booking_settings?: Record<string, unknown>;
  is_published: boolean;
  image_urls?: string[];
  slots?: CreatePhotoSessionSlotData[];
}

export async function createPhotoSessionWithSlotsAction(
  data: PhotoSessionWithSlotsData
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // スロットがある場合は、撮影会の参加者数をスロットの合計に設定
    let maxParticipants = data.max_participants;
    if (data.slots && data.slots.length > 0) {
      maxParticipants = data.slots.reduce(
        (sum, slot) => sum + slot.max_participants,
        0
      );
    }

    // 撮影会を作成
    const { data: session, error: sessionError } = await supabase
      .from('photo_sessions')
      .insert({
        title: data.title,
        description: data.description,
        location: data.location,
        address: data.address,
        start_time: data.start_time,
        end_time: data.end_time,
        max_participants: maxParticipants,
        price_per_person: data.price_per_person,
        booking_type: data.booking_type || 'first_come',
        allow_multiple_bookings: data.allow_multiple_bookings || false,
        booking_settings: data.booking_settings || {},
        is_published: data.is_published,
        image_urls: data.image_urls || [],
        organizer_id: user.id,
        current_participants: 0,
      })
      .select()
      .single();

    if (sessionError) {
      logger.error('撮影会作成エラー:', sessionError);
      return { success: false, error: '撮影会の作成に失敗しました' };
    }

    // スロットがある場合はスロットも作成
    if (data.slots && data.slots.length > 0) {
      const slotsToInsert = data.slots.map(slot => ({
        ...slot,
        photo_session_id: session.id,
      }));

      const { error: slotsError } = await supabase
        .from('photo_session_slots')
        .insert(slotsToInsert);

      if (slotsError) {
        logger.error('スロット作成エラー:', slotsError);
        // 撮影会は作成されているので削除
        await supabase.from('photo_sessions').delete().eq('id', session.id);
        return { success: false, error: 'スロットの作成に失敗しました' };
      }
    }

    revalidatePath('/photo-sessions');
    revalidatePath('/dashboard');

    return { success: true, data: session };
  } catch (error) {
    logger.error('撮影会作成エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

export async function updatePhotoSessionWithSlotsAction(
  sessionId: string,
  data: PhotoSessionWithSlotsData
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

    // スロットがある場合は、撮影会の参加者数をスロットの合計に設定
    let maxParticipants = data.max_participants;
    if (data.slots && data.slots.length > 0) {
      maxParticipants = data.slots.reduce(
        (sum, slot) => sum + slot.max_participants,
        0
      );
    }

    // 撮影会を更新
    const { data: session, error: sessionError } = await supabase
      .from('photo_sessions')
      .update({
        title: data.title,
        description: data.description,
        location: data.location,
        address: data.address,
        start_time: data.start_time,
        end_time: data.end_time,
        max_participants: maxParticipants,
        price_per_person: data.price_per_person,
        booking_type: data.booking_type || 'first_come',
        allow_multiple_bookings: data.allow_multiple_bookings || false,
        booking_settings: data.booking_settings || {},
        is_published: data.is_published,
        image_urls: data.image_urls || [],
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (sessionError) {
      logger.error('撮影会更新エラー:', sessionError);
      return { success: false, error: '撮影会の更新に失敗しました' };
    }

    // 既存のスロットを削除
    await supabase
      .from('photo_session_slots')
      .delete()
      .eq('photo_session_id', sessionId);

    // 新しいスロットを作成
    if (data.slots && data.slots.length > 0) {
      const slotsToInsert = data.slots.map(slot => ({
        ...slot,
        photo_session_id: sessionId,
      }));

      const { error: slotsError } = await supabase
        .from('photo_session_slots')
        .insert(slotsToInsert);

      if (slotsError) {
        logger.error('スロット更新エラー:', slotsError);
        return { success: false, error: 'スロットの更新に失敗しました' };
      }
    }

    revalidatePath('/photo-sessions');
    revalidatePath(`/photo-sessions/${sessionId}`);
    revalidatePath('/dashboard');

    return { success: true, data: session };
  } catch (error) {
    logger.error('撮影会更新エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
