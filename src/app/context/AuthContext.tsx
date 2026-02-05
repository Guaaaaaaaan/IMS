import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { 
  UserRole, 
  UserProfile, 
  ensureProfileExists, 
  getMyProfile,
  signOut as apiSignOut
} from '../data/authApi';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to load profile
  const loadProfile = async (currentUser: User) => {
    try {
      // First try to get it
      const { data: existing, error } = await getMyProfile(currentUser.id);
      
      if (existing) {
        setProfile(existing as UserProfile);
      } else {
        // If not found, try to ensure it exists
        const { data: created, error: createError } = await ensureProfileExists(currentUser);
        if (created) {
          setProfile(created);
        } else {
          console.error("Failed to ensure profile:", createError);
          // Fallback to minimal profile in state if DB fails (e.g. RLS blocking creation?)
          // But ideally we should have a profile. 
          // Defaulting to viewer role in state so UI doesn't crash
          setProfile({ 
            id: 'temp', 
            user_id: currentUser.id, 
            email: currentUser.email || '', 
            role: 'viewer' 
          });
        }
      }
    } catch (err) {
      console.error("Auth context profile load error:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user);
        }
        setLoading(false);
      }
    };

    init();

    // 2. Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);

      if (newUser) {
        // Optimization: if user ID hasn't changed and we have profile, maybe skip?
        // But role might have changed, so safer to reload or have a refresh mechanism.
        // For now, reload profile on session change (e.g. sign in)
        if (user?.id !== newUser.id) {
            setLoading(true); // short loading state while switching users
            await loadProfile(newUser);
            setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await apiSignOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  // Role helpers
  const userRole = profile?.role || 'viewer';
  const isAdmin = userRole === 'admin';
  const canDelete = userRole === 'admin';
  // Staff can create/edit, Admin can too
  const canCreate = userRole === 'admin' || userRole === 'staff';
  const canEdit = userRole === 'admin' || userRole === 'staff';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role: userRole,
      loading,
      signOut,
      isAdmin,
      canCreate,
      canEdit,
      canDelete,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
