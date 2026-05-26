"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, upsertProfile, supabase } from '@/lib/db';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoginModalOpen: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPhone: (name: string, email: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  saveAddress: (address: string, city: string, zip: string, country: string) => Promise<void>;
  triggerLoginModal: (onSuccessCallback?: () => void) => void;
  closeLoginModal: () => void;
  setAdminStatus: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helper: build a UserProfile from a Supabase auth user ───────────────────
function profileFromSupabaseUser(supabaseUser: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, string>;
}): UserProfile {
  return {
    id: supabaseUser.id,
    name:
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'User',
    email: supabaseUser.email || '',
    phone: supabaseUser.phone || supabaseUser.user_metadata?.phone || '',
  };
}

// ─── Helper: fetch profile from Supabase profiles table ──────────────────────
async function fetchProfile(id: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as UserProfile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdminState] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(false); // false by default — modal never blocks on this
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);

  // ── Resolve and persist a profile for a logged-in Supabase user ────────────
  const resolveAndSetProfile = useCallback(async (supabaseUser: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, string>;
  }) => {
    // Try to load existing profile first
    let profile = await fetchProfile(supabaseUser.id);

    if (!profile) {
      // First login — create profile from OAuth metadata
      profile = profileFromSupabaseUser(supabaseUser);
      await upsertProfile(profile);
    } else {
      // Merge any new OAuth metadata (e.g. name updated in Google)
      const merged: UserProfile = {
        ...profile,
        name: profile.name || supabaseUser.user_metadata?.full_name || profile.name,
        email: profile.email || supabaseUser.email || '',
      };
      if (merged.name !== profile.name || merged.email !== profile.email) {
        await upsertProfile(merged);
        profile = merged;
      }
    }

    setUser(profile);
    return profile;
  }, []);

  // ── Bootstrap: check existing session on mount ─────────────────────────────
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      // ── One-time cleanup: wipe stale mock data from old sessions ──────────
      // Old mock profiles had IDs like "usr_xxx" with fake names/emails.
      // Old product cache may have broken lh3.googleusercontent.com images.
      // We version the cache with a key — bump this string to force a wipe.
      const CACHE_VERSION = 'v2';
      if (typeof window !== 'undefined') {
        const cachedVersion = localStorage.getItem('stag_beetle_cache_version');
        if (cachedVersion !== CACHE_VERSION) {
          localStorage.removeItem('stag_beetle_user');
          localStorage.removeItem('stag_beetle_products');
          localStorage.removeItem('stag_beetle_profiles');
          localStorage.removeItem('stag_beetle_admin_session');
          localStorage.setItem('stag_beetle_cache_version', CACHE_VERSION);
        }
      }

      // ── Supabase path ──────────────────────────────────────────────────────
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            await resolveAndSetProfile(session.user);
          }
        } catch (e) {
          console.warn('Supabase session bootstrap failed:', e);
        }
      }

      // ── localStorage fallback (email/phone login or no Supabase) ──────────
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('stag_beetle_user');
        if (storedUser && mounted) {
          try {
            const parsed = JSON.parse(storedUser) as UserProfile;
            // If Supabase is configured, only trust localStorage for real
            // email/phone sessions (id starts with 'usr_').
            // Discard any old mock accounts (those also start with 'usr_' but
            // were created with fake data — they'll be re-created on next
            // email/phone login). Never restore a stale mock if Supabase
            // already confirmed no active session above.
            if (supabase) {
              // Supabase is live — only restore email/phone sessions,
              // never restore old mock Google accounts
              const isEmailPhoneSession = parsed.id?.startsWith('usr_');
              if (isEmailPhoneSession) {
                setUser(prev => prev ?? parsed);
              } else {
                // Stale mock Google account — clear it
                localStorage.removeItem('stag_beetle_user');
              }
            } else {
              // No Supabase — trust whatever is stored
              setUser(prev => prev ?? parsed);
            }
          } catch { /* ignore */ }
        }
        if (localStorage.getItem('stag_beetle_admin_session') === 'true' && mounted) {
          setIsAdminState(true);
        }
      }
    };

    bootstrap();

    // ── Supabase real-time auth state listener ─────────────────────────────
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          if (event === 'SIGNED_IN' && session?.user) {
            const profile = await resolveAndSetProfile(session.user);
            setIsLoginModalOpen(false);
            // Fire any pending success callback
            setOnSuccessCallback(prev => {
              if (prev) { prev(); return null; }
              return null;
            });
            if (typeof window !== 'undefined') {
              localStorage.setItem('stag_beetle_user', JSON.stringify(profile));
            }
          }

          if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsAdminState(false);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('stag_beetle_user');
              localStorage.removeItem('stag_beetle_admin_session');
            }
          }

          if (event === 'TOKEN_REFRESHED' && session?.user) {
            // Silently refresh profile in background
            resolveAndSetProfile(session.user);
          }
        }
      );
      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => { mounted = false; };
  }, [resolveAndSetProfile]);

  // ── Google OAuth — triggers real Supabase redirect ─────────────────────────
  const loginWithGoogle = async () => {
    if (!supabase) {
      console.error('Supabase is not configured. Cannot sign in with Google.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      console.error('Google OAuth error:', error.message);
    }
  };

  // ── Email + Phone login (no Supabase auth, profile-only) ──────────────────
  const loginWithEmailPhone = async (name: string, email: string, phone: string) => {
    const profile: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      email,
      phone,
      country: 'India',
    };

    if (supabase) {
      try {
        await upsertProfile(profile);
      } catch (e) {
        console.warn('Profile save to Supabase failed, using localStorage:', e);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_user', JSON.stringify(profile));
    }

    setUser(profile);
    setIsLoginModalOpen(false);

    setOnSuccessCallback(prev => {
      if (prev) { prev(); return null; }
      return null;
    });
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsAdminState(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stag_beetle_user');
      localStorage.removeItem('stag_beetle_admin_session');
    }
  };

  // ── Save shipping address ──────────────────────────────────────────────────
  const saveAddress = async (address: string, city: string, zip: string, country: string) => {
    if (!user) return;
    const updated: UserProfile = { ...user, address, city, zip, country };
    await upsertProfile(updated);
    setUser(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_user', JSON.stringify(updated));
    }
  };

  const triggerLoginModal = (onSuccess?: () => void) => {
    if (onSuccess) setOnSuccessCallback(() => onSuccess);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setOnSuccessCallback(null);
  };

  const setAdminStatus = (status: boolean) => {
    setIsAdminState(status);
    if (typeof window !== 'undefined') {
      if (status) localStorage.setItem('stag_beetle_admin_session', 'true');
      else localStorage.removeItem('stag_beetle_admin_session');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isLoginModalOpen,
      loading,
      loginWithGoogle,
      loginWithEmailPhone,
      logout,
      saveAddress,
      triggerLoginModal,
      closeLoginModal,
      setAdminStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
