import { createClient } from '@/lib/supabase/client';
import {
  PhotoSessionSlot,
  CreatePhotoSessionSlotData,
  UpdatePhotoSessionSlotData,
  SlotBookingResult,
  TimeSlotCalculation,
  SlotStatistics,
} from '@/types/photo-session';
import { addMinutes, format, parseISO } from 'date-fns';

// クライアントサイド用関数
export async function getPhotoSessionSlots(
  photoSessionId: string
): Promise<PhotoSessionSlot[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('photo_session_slots')
    .select('*')
    .eq('photo_session_id', photoSessionId)
    .eq('is_active', true)
    .order('slot_number');

  if (error) {
    console.error('Error fetching photo session slots:', error);
    throw new Error('スロット情報の取得に失敗しました');
  }

  return data || [];
}

export async function createPhotoSessionSlot(
  photoSessionId: string,
  slotData: CreatePhotoSessionSlotData
): Promise<PhotoSessionSlot> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('photo_session_slots')
    .insert({
      photo_session_id: photoSessionId,
      ...slotData,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating photo session slot:', error);
    throw new Error('スロットの作成に失敗しました');
  }

  return data;
}

export async function updatePhotoSessionSlot(
  slotData: UpdatePhotoSessionSlotData
): Promise<PhotoSessionSlot> {
  const supabase = createClient();

  const { id, ...updateData } = slotData;

  const { data, error } = await supabase
    .from('photo_session_slots')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating photo session slot:', error);
    throw new Error('スロットの更新に失敗しました');
  }

  return data;
}

export async function deletePhotoSessionSlot(slotId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('photo_session_slots')
    .update({ is_active: false })
    .eq('id', slotId);

  if (error) {
    console.error('Error deleting photo session slot:', error);
    throw new Error('スロットの削除に失敗しました');
  }
}

// スロット予約関連
export async function createSlotBooking(
  slotId: string
): Promise<SlotBookingResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('ログインが必要です');
  }

  const { data, error } = await supabase.rpc('create_slot_booking', {
    p_slot_id: slotId,
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error creating slot booking:', error);
    throw new Error('予約の作成に失敗しました');
  }

  return data[0];
}

export async function cancelSlotBooking(
  bookingId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('ログインが必要です');
  }

  const { data, error } = await supabase.rpc('cancel_slot_booking', {
    p_booking_id: bookingId,
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error cancelling slot booking:', error);
    throw new Error('予約のキャンセルに失敗しました');
  }

  return data[0];
}

// サーバーサイド用関数（Server Componentで使用）
export async function getPhotoSessionSlotsServer(): Promise<
  PhotoSessionSlot[]
> {
  // Server Componentでのみ使用可能
  // 実装は後で追加
  return [];
}

// ユーティリティ関数
export function calculateSlotTimes(
  baseStartTime: string,
  slots: { duration_minutes: number; break_duration_minutes: number }[]
): TimeSlotCalculation[] {
  const calculations: TimeSlotCalculation[] = [];
  let currentStartTime = parseISO(baseStartTime);

  slots.forEach((slot, index) => {
    const startTime = currentStartTime;
    const endTime = addMinutes(startTime, slot.duration_minutes);
    const nextSlotStartTime = addMinutes(endTime, slot.break_duration_minutes);

    calculations.push({
      slot_number: index + 1,
      start_time: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(endTime, "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: slot.duration_minutes,
      break_duration_minutes: slot.break_duration_minutes,
      next_slot_start_time:
        index < slots.length - 1
          ? format(nextSlotStartTime, "yyyy-MM-dd'T'HH:mm")
          : undefined,
    });

    currentStartTime = nextSlotStartTime;
  });

  return calculations;
}

export function calculateDiscountedPrice(
  originalPrice: number,
  discountType: string,
  discountValue: number
): number {
  switch (discountType) {
    case 'percentage':
      return Math.round(originalPrice * (1 - discountValue / 100));
    case 'fixed_amount':
      return Math.max(0, originalPrice - discountValue);
    default:
      return originalPrice;
  }
}

export function formatSlotTime(startTime: string, endTime: string): string {
  const start = format(parseISO(startTime), 'HH:mm');
  const end = format(parseISO(endTime), 'HH:mm');
  return `${start} - ${end}`;
}

export function getSlotAvailabilityStatus(
  currentParticipants: number,
  maxParticipants: number
): {
  status: 'available' | 'few_left' | 'full';
  message: string;
} {
  const remaining = maxParticipants - currentParticipants;

  if (remaining === 0) {
    return { status: 'full', message: '満席' };
  } else if (remaining <= 2) {
    return { status: 'few_left', message: `残り${remaining}名` };
  } else {
    return { status: 'available', message: `空きあり (${remaining}名)` };
  }
}

// 統計情報取得
export async function getSlotStatistics(
  photoSessionId: string
): Promise<SlotStatistics> {
  const supabase = createClient();

  const { data: slots, error } = await supabase
    .from('photo_session_slots')
    .select(
      `
      *,
      bookings!inner(id, created_at)
    `
    )
    .eq('photo_session_id', photoSessionId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching slot statistics:', error);
    throw new Error('統計情報の取得に失敗しました');
  }

  const totalSlots = slots.length;
  const bookedSlots = slots.filter(
    slot => slot.current_participants > 0
  ).length;
  const availableSlots = totalSlots - bookedSlots;
  const totalRevenue = slots.reduce((sum, slot) => {
    const discountedPrice = calculateDiscountedPrice(
      slot.price_per_person,
      slot.discount_type,
      slot.discount_value
    );
    return sum + discountedPrice * slot.current_participants;
  }, 0);
  const averagePrice = totalSlots > 0 ? totalRevenue / totalSlots : 0;

  // 時間帯別予約数の計算
  const hourlyBookings: { [hour: number]: number } = {};
  slots.forEach(slot => {
    const hour = parseISO(slot.start_time).getHours();
    hourlyBookings[hour] =
      (hourlyBookings[hour] || 0) + slot.current_participants;
  });

  const peakHours = Object.entries(hourlyBookings)
    .map(([hour, bookings]) => ({ hour: parseInt(hour), bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 3);

  return {
    total_slots: totalSlots,
    available_slots: availableSlots,
    booked_slots: bookedSlots,
    total_revenue: totalRevenue,
    average_price: averagePrice,
    peak_hours: peakHours,
  };
}
