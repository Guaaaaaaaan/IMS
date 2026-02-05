import { supabase } from '../lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface UserProfile {
  id: string; // usually same as user_id or uuid
  user_id: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export const signInWithPassword = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getMyProfile = async (userId: string) => {
  return await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
};

export const ensureProfileExists = async (user: User) => {
  // 1. Try to fetch existing
  const { data: existing, error: fetchError } = await getMyProfile(user.id);
  
  if (existing) {
    return { data: existing as UserProfile, error: null };
  }

  // 2. If missing, insert default 'viewer'
  // using upsert with onConflict on user_id to be safe
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { 
        user_id: user.id, 
        email: user.email, 
        role: 'viewer' 
      }, 
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  return { data: data as UserProfile, error };
};

// Admin function to list all users (from public.profiles)
export const listUsers = async () => {
  return await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
};

// Admin function to update a user's role
export const updateUserRole = async (userId: string, newRole: UserRole) => {
  return await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('user_id', userId)
    .select()
    .single();
};
