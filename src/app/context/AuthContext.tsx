import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
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

  const mountedRef = useRef(true);
  const userRef = useRef<User | null>(null);

  const safeSetUser = (nextUser: User | null) => {
    userRef.current = nextUser;
    if (mountedRef.current) {
      setUser(nextUser);
    }
  };

  const safeSetSession = (nextSession: Session | null) => {
    if (mountedRef.current) {
      setSession(nextSession);
    }
  };

  const safeSetProfile = (nextProfile: UserProfile | null) => {
    if (mountedRef.current) {
      setProfile(nextProfile);
    }
  };

  const safeSetLoading = (nextLoading: boolean) => {
    if (mountedRef.current) {
      setLoading(nextLoading);
    }
  };

  const clearLocalStorage = () => {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('Failed to clear localStorage:', err);
    }
  };

  const signOut = async (redirectToLogin: boolean = false) => {
    try {
      await apiSignOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }

    clearLocalStorage();
    safeSetProfile(null);
    safeSetUser(null);
    safeSetSession(null);
    safeSetLoading(false);

    if (redirectToLogin) {
      window.location.assign('/login');
    }
  };

  const loadProfile = async (currentUser: User) => {
    try {
      const { data: existing, error } = await getMyProfile(currentUser.id);

      if (existing) {
        safeSetProfile(existing as UserProfile);
        return;
      }

      if (error) {
        console.error('getMyProfile error:', error);
      }

      const { data: created, error: createError } = await ensureProfileExists(currentUser);
      if (created) {
        safeSetProfile(created);
        return;
      }

      console.error('Failed to ensure profile:', createError);
      safeSetProfile({
        id: 'temp',
        user_id: currentUser.id,
        email: currentUser.email || '',
        role: 'viewer'
      });
    } catch (err) {
      console.error('Auth context profile load error:', err);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const forceSignOut = async (reason?: unknown) => {
      console.error('Forcing sign-out due to auth session error:', reason);
      // Immediately clear state so AuthGuard can redirect
      clearLocalStorage();
      safeSetProfile(null);
      safeSetUser(null);
      safeSetSession(null);
      safeSetLoading(false);
      // Redirect right away to break loading loops
      window.location.assign('/login');
      // Best-effort signOut in background (don’t block UI)
      void apiSignOut().catch((err) => {
        console.error('Background signOut failed:', err);
      });
    };

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      return await new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout: ${label}`));
        }, ms);
        promise
          .then((value) => {
            clearTimeout(timer);
            resolve(value);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });
    };

    const init = async () => {
      try {
        safetyTimer = setTimeout(() => {
          if (mountedRef.current) {
            console.warn('Auth init taking too long. Forcing sign out.');
            void forceSignOut('init-timeout');
          }
        }, 5000);

        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          4000,
          'getSession'
        );
        if (error) {
          await forceSignOut(error);
          return;
        }

        safeSetSession(session);
        safeSetUser(session?.user ?? null);

        if (session?.user) {
          await withTimeout(loadProfile(session.user), 5000, 'loadProfile');
        }
        safeSetLoading(false);
      } catch (err) {
        await forceSignOut(err);
        safeSetLoading(false);
      } finally {
        if (safetyTimer) clearTimeout(safetyTimer);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mountedRef.current) return;

        safeSetSession(newSession);
        const newUser = newSession?.user ?? null;
        const currentUserId = userRef.current?.id;
        safeSetUser(newUser);

        if (newUser) {
          if (newUser.id !== currentUserId) {
            safeSetLoading(true);
            await loadProfile(newUser);
            safeSetLoading(false);
          }
        } else {
          safeSetProfile(null);
          safeSetLoading(false);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const userRole = profile?.role || 'viewer';
  const isAdmin = userRole === 'admin';
  const canDelete = userRole === 'admin';
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
