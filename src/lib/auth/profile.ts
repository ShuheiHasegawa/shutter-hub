import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export type UserType = 'model' | 'photographer' | 'organizer';

export interface CreateProfileData {
  user_type: UserType;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  phone?: string;
}

export async function createProfile(
  user: User,
  profileData: CreateProfileData
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email!,
      display_name:
        profileData.display_name || user.user_metadata?.full_name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      user_type: profileData.user_type,
      bio: profileData.bio,
      location: profileData.location,
      website: profileData.website,
      instagram_handle: profileData.instagram_handle,
      twitter_handle: profileData.twitter_handle,
      phone: profileData.phone,
      is_verified: false,
    })
    .select()
    .single();

  return { data, error };
}

export async function getProfile(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data, error };
}

export async function updateProfile(
  userId: string,
  updates: Partial<CreateProfileData>
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}
