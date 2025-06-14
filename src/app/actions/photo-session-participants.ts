'use server';

import { createClient } from '@/lib/supabase/server';

export interface PhotoSessionParticipant {
  id: string;
  user_id: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'waitlisted';
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
    email: string;
  };
}

export async function getPhotoSessionParticipants(
  sessionId: string
): Promise<PhotoSessionParticipant[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
        id,
        user_id,
        status,
        created_at,
        user:profiles!bookings_user_id_fkey(
          id,
          display_name,
          avatar_url,
          email
        )
      `
      )
      .eq('photo_session_id', sessionId)
      .in('status', ['confirmed', 'pending'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      user: Array.isArray(item.user) ? item.user[0] : item.user,
    })) as PhotoSessionParticipant[];
  } catch (error) {
    console.error('Error in getPhotoSessionParticipants:', error);
    return [];
  }
}

export async function checkUserParticipation(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('photo_session_id', sessionId)
      .eq('user_id', userId)
      .in('status', ['confirmed', 'pending'])
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking participation:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkUserParticipation:', error);
    return false;
  }
}
