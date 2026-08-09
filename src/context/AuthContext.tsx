"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, upsertProfile, supabase, supabaseTimeout } from '@/lib/db';

interface MfaFactor {
  id: string;
  status: string;
  friendlyName?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoginModalOpen: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPhone: (name: string, email: string, phone: string) => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  registerWithEmailPassword: (name: string, email: string, password: string, phone: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  saveAddress: (address: string, city: string, zip: string, country: string, phone?: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  triggerLoginModal: (onSuccessCallback?: () => void) => void;
  closeLoginModal: () => void;
  // Two-factor auth (Supabase TOTP) — currently only enforced for the admin
  // account. mfaPending means: password check passed, but the session is
  // still aal1 while a verified authenticator exists — admin access is held
  // back until verifyMfaCode succeeds.
  mfaPending: boolean;
  verifyMfaCode: (code: string) => Promise<{ error: string | null }>;
  enrollMfa: () => Promise<{ qrCode: string | null; secret: string | null; factorId: string | null; error: string | null }>;
  confirmMfaEnrollment: (factorId: string, code: string) => Promise<{ error: string | null }>;
  unenrollMfa: (factorId: string) => Promise<{ error: string | null }>;
  getMfaFactors: () => Promise<MfaFactor[]>;
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
  if (id.startsWith('usr_')) return null;
  try {
    const { data, error } = await supabaseTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single(),
      4000
    );
    if (error || !data) return null;
    return data as UserProfile;
  } catch (e) {
    console.warn("fetchProfile query timed out or failed:", e);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdminState] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true); // true by default to avoid flickering/stale rendering on mount
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // ── Resolve and persist a profile for a logged-in Supabase user ────────────
  const resolveAndSetProfile = useCallback(async (supabaseUser: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, string>;
  }) => {
    // Check admin status immediately before any async network calls to avoid stale state delays
    const isAdminEmail = supabaseUser.email?.toLowerCase() === 'stagbeetlebilling@gmail.com';
    if (isAdminEmail && supabase) {
      // Step-up check: if this account has a verified authenticator enrolled,
      // the session needs to actually be at aal2 before it counts as admin —
      // a correct password alone isn't enough once MFA is turned on. A brand
      // new admin with no factor enrolled yet has nextLevel === currentLevel,
      // so this is a no-op until they set MFA up from the Security panel.
      let requiresStepUp = false;
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
          requiresStepUp = true;
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedTotp = factorsData?.totp?.find(f => f.status === 'verified');
          setMfaFactorId(verifiedTotp?.id || null);
        }
      } catch (e) {
        console.warn('MFA assurance-level check failed — denying admin by default:', e);
        requiresStepUp = true; // fail closed, not open
      }

      if (requiresStepUp) {
        setIsAdminState(false);
        setMfaPending(true);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('stag_beetle_admin_session');
        }
      } else {
        setIsAdminState(true);
        setMfaPending(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('stag_beetle_admin_session', 'true');
        }
      }
    } else {
      setIsAdminState(false);
      setMfaPending(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('stag_beetle_admin_session');
      }
    }

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
      setLoading(true);
      try {
        // ── Detect OAuth error query parameters and fall back ──────────────────
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          
          // Also check hash (in case it is redirected as a hash fragment)
          const hashClean = window.location.hash.startsWith('#') 
            ? window.location.hash.substring(1) 
            : window.location.hash;
          const hashParams = new URLSearchParams(hashClean);

          const error = searchParams.get('error') || hashParams.get('error');
          const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
          const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

          if (error || errorCode || errorDesc) {
            console.warn('OAuth redirect error detected, initiating simulated Google profile fallback:', errorDesc);
            
            // Clear query parameters and hash immediately to keep URL clean
            window.history.replaceState({}, document.title, window.location.pathname);

            // Auto-login with a simulated Google profile
            const mockGoogleUser: UserProfile = {
              id: `usr_google_${Date.now()}`,
              name: 'Google User',
              email: 'google-user@example.com',
              phone: '+91 98765 43210',
              country: 'India',
            };
            
            setUser(mockGoogleUser);
            if (typeof window !== 'undefined') {
              localStorage.setItem('stag_beetle_user', JSON.stringify(mockGoogleUser));
            }
            try {
              await upsertProfile(mockGoogleUser);
            } catch (e) {
              console.warn('Upsert simulated Google profile failed:', e);
            }
            return;
          }
        }

        // ── One-time cleanup: wipe stale mock data from old sessions ──────────
        const CACHE_VERSION = 'v3';
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
            const { data: { session } } = await supabaseTimeout(supabase.auth.getSession(), 4000);
            if (session?.user && mounted) {
              await resolveAndSetProfile(session.user);
            }
          } catch (e) {
            console.warn('Supabase session bootstrap failed or timed out:', e);
          }
        }

        // ── localStorage fallback (email/phone login or no Supabase) ──────────
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('stag_beetle_user');
          if (storedUser && mounted) {
            try {
              const parsed = JSON.parse(storedUser) as UserProfile;
              if (supabase) {
                const isEmailPhoneSession = parsed.id?.startsWith('usr_');
                if (isEmailPhoneSession) {
                  setUser(prev => prev ?? parsed);
                } else {
                  localStorage.removeItem('stag_beetle_user');
                }
              } else {
                setUser(prev => prev ?? parsed);
              }
            } catch { /* ignore */ }
          }
          if (localStorage.getItem('stag_beetle_admin_session') === 'true' && mounted) {
            setIsAdminState(true);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
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
            // Only sign out if the user is a real Supabase user
            // Mock sessions (email/phone or google fallback) have IDs starting with 'usr_'
            const stored = typeof window !== 'undefined' ? localStorage.getItem('stag_beetle_user') : null;
            let isRealSupabaseUser = false;
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed?.id && !parsed.id.startsWith('usr_')) {
                  isRealSupabaseUser = true;
                }
              } catch {}
            }

            if (isRealSupabaseUser) {
              setUser(null);
              setIsAdminState(false);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('stag_beetle_user');
                localStorage.removeItem('stag_beetle_admin_session');
              }
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

  // ── Email + Password login (real Supabase Auth) ───────────────────────────
  const loginWithEmailPassword = async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Supabase is not configured' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        const profile = await resolveAndSetProfile(data.user);
        setIsLoginModalOpen(false);
        setOnSuccessCallback(prev => {
          if (prev) { prev(); return null; }
          return null;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('stag_beetle_user', JSON.stringify(profile));
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred' };
    }
  };

  // ── MFA: verify a code against the pending step-up challenge ──────────────
  // Called after a correct password when resolveAndSetProfile found a
  // verified authenticator but the session hasn't stepped up to aal2 yet.
  const verifyMfaCode = async (code: string) => {
    if (!supabase) return { error: 'Supabase is not configured' };
    if (!mfaFactorId) return { error: 'No pending verification — please sign in again.' };
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: code.trim() });
      if (error) return { error: error.message };
      // Session is now aal2 — re-resolve so isAdmin actually flips true
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser) {
        const profile = await resolveAndSetProfile(freshUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('stag_beetle_user', JSON.stringify(profile));
        }
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Verification failed.' };
    }
  };

  // ── MFA: begin enrolling a new authenticator (TOTP) ────────────────────────
  // Must be called from an already-authenticated session. Returns a QR code
  // (SVG data URI, straight from Supabase — no extra QR library needed) plus
  // the secret for manual entry, and the factorId to confirm with next.
  const enrollMfa = async () => {
    if (!supabase) return { qrCode: null, secret: null, factorId: null, error: 'Supabase is not configured' };
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' });
      if (error) return { qrCode: null, secret: null, factorId: null, error: error.message };
      return { qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id, error: null };
    } catch (err) {
      return { qrCode: null, secret: null, factorId: null, error: err instanceof Error ? err.message : 'Enrollment failed.' };
    }
  };

  // ── MFA: confirm enrollment with the first code from the authenticator app ─
  // Activates the factor and, since this runs in the current session, also
  // elevates it to aal2 immediately — no forced re-login right after setup.
  const confirmMfaEnrollment = async (factorId: string, code: string) => {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (error) return { error: error.message };
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser) await resolveAndSetProfile(freshUser);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Verification failed.' };
    }
  };

  // ── MFA: remove an authenticator (lost device, resetting, etc.) ───────────
  const unenrollMfa = async (factorId: string) => {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not remove authenticator.' };
    }
  };

  // ── MFA: list enrolled factors, for the Security panel's status display ───
  const getMfaFactors = async (): Promise<MfaFactor[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data) return [];
      return (data.totp || []).map(f => ({ id: f.id, status: f.status, friendlyName: f.friendly_name }));
    } catch {
      return [];
    }
  };

  // ── Email + Password registration (real Supabase Auth) ────────────────────
  const registerWithEmailPassword = async (name: string, email: string, password: string, phone: string) => {
    if (!supabase) {
      return { error: 'Supabase is not configured' };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone
          }
        }
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        const profile = await resolveAndSetProfile(data.user);
        setIsLoginModalOpen(false);
        setOnSuccessCallback(prev => {
          if (prev) { prev(); return null; }
          return null;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('stag_beetle_user', JSON.stringify(profile));
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred' };
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsAdminState(false);
    setMfaPending(false);
    setMfaFactorId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stag_beetle_user');
      localStorage.removeItem('stag_beetle_admin_session');
    }
  };

  // ── Save shipping address ──────────────────────────────────────────────────
  const saveAddress = async (address: string, city: string, zip: string, country: string, phone?: string) => {
    if (!user) return;
    const updated: UserProfile = { ...user, address, city, zip, country, ...(phone?.trim() ? { phone: phone.trim() } : {}) };
    await upsertProfile(updated);
    setUser(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_user', JSON.stringify(updated));
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = { ...user, ...updates };
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

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isLoginModalOpen,
      loading,
      loginWithGoogle,
      loginWithEmailPhone,
      loginWithEmailPassword,
      registerWithEmailPassword,
      logout,
      saveAddress,
      updateProfile,
      triggerLoginModal,
      closeLoginModal,
      mfaPending,
      verifyMfaCode,
      enrollMfa,
      confirmMfaEnrollment,
      unenrollMfa,
      getMfaFactors,
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
