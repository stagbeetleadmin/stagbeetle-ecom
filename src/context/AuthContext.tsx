"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, upsertProfile, supabase, supabaseTimeout, withOneRetry } from '@/lib/db';

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
  // account, which multiple staff across stores share. mfaPending means:
  // password check passed, but the session is still aal1 while at least one
  // verified authenticator exists — admin access is held back until
  // verifyMfaCode succeeds. Each staff member enrolls their own factor (own
  // phone, own name), so mfaFactors lists all of them for the login screen's
  // "which device is this" picker — verifying any one is sufficient.
  mfaPending: boolean;
  mfaFactors: MfaFactor[];
  verifyMfaCode: (factorId: string, code: string) => Promise<{ error: string | null }>;
  enrollMfa: (friendlyName: string) => Promise<{ qrCode: string | null; secret: string | null; factorId: string | null; error: string | null }>;
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
// Returns a discriminated result rather than plain `UserProfile | null` —
// resolveAndSetProfile below needs to tell "confirmed: no profile row exists
// yet" (a genuinely new user) apart from "couldn't confirm either way, the
// query timed out". Collapsing those two into one `null` used to make a mere
// timeout look identical to a first-ever login, which made resolveAndSetProfile
// create-and-upsert a bare, OAuth-metadata-only profile over whatever was
// really stored — silently erasing address/city/etc, and any manually-edited
// name or phone, on nothing more than a slow network.
type ProfileFetchResult =
  | { status: 'found'; profile: UserProfile }
  | { status: 'not_found' }
  | { status: 'unknown' };

async function fetchProfile(id: string): Promise<ProfileFetchResult> {
  if (!supabase) return { status: 'not_found' };
  if (id.startsWith('usr_')) return { status: 'not_found' };
  try {
    // Same 8s-timeout-plus-one-retry budget the product catalog gets — this
    // used to be a tighter, unretried 4s here, so a momentary blip failed
    // profile loading (and by extension, admin access) sooner than it needed to.
    const { data, error } = await withOneRetry(() =>
      supabaseTimeout(
        supabase!
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()
      )
    );
    if (error) {
      if (error.code === 'PGRST116') return { status: 'not_found' }; // confirmed: no matching row
      console.warn('fetchProfile query error:', error.message);
      return { status: 'unknown' };
    }
    if (!data) return { status: 'not_found' };
    return { status: 'found', profile: data as UserProfile };
  } catch (e: any) {
    console.warn('fetchProfile query timed out or failed — status unknown:', e.message || e);
    return { status: 'unknown' };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdminState] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true); // true by default to avoid flickering/stale rendering on mount
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);

  // Step-up check, split out so it can run concurrently with the profile
  // fetch below instead of adding a sequential round-trip — this alone was
  // making the admin login noticeably slower than before MFA existed.
  // Pure (no setState) so Promise.all can run it alongside fetchProfile.
  const checkAdminStepUp = useCallback(async (): Promise<{ requiresStepUp: boolean; factors: MfaFactor[] }> => {
    if (!supabase) return { requiresStepUp: false, factors: [] };
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
        // Every verified factor is a legitimate staff member's own device —
        // list all of them so the login screen can ask "which one is yours"
        // rather than only ever accepting whichever enrolled first.
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedTotp = (factorsData?.totp || []).filter(f => f.status === 'verified');
        return { requiresStepUp: true, factors: verifiedTotp.map(f => ({ id: f.id, status: f.status, friendlyName: f.friendly_name })) };
      }
      return { requiresStepUp: false, factors: [] };
    } catch (e) {
      console.warn('MFA assurance-level check failed — denying admin by default:', e);
      return { requiresStepUp: true, factors: [] }; // fail closed, not open
    }
  }, []);

  // ── Resolve and persist a profile for a logged-in Supabase user ────────────
  const resolveAndSetProfile = useCallback(async (supabaseUser: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, string>;
  }) => {
    // Check admin status immediately before any async network calls to avoid stale state delays
    const isAdminEmail = supabaseUser.email?.toLowerCase() === 'stagbeetlebilling@gmail.com';
    console.log(`[Auth] resolveAndSetProfile: resolving ${supabaseUser.email || supabaseUser.id} (isAdminEmail=${isAdminEmail})`);

    // The step-up check (admin only, a Supabase Auth MFA call) and the
    // profile fetch (everyone, a Postgres read) are independent — running
    // them together instead of one-after-the-other cuts login latency
    // roughly in half for the admin account.
    const [stepUp, profile0] = await Promise.all([
      isAdminEmail && supabase ? checkAdminStepUp() : Promise.resolve({ requiresStepUp: false, factors: [] as MfaFactor[] }),
      fetchProfile(supabaseUser.id),
    ]);

    if (isAdminEmail && supabase) {
      if (stepUp.requiresStepUp) {
        console.log(`[Auth] resolveAndSetProfile: admin email but MFA step-up required (${stepUp.factors.length} factor(s) available) — NOT granting admin yet`);
        setIsAdminState(false);
        setMfaPending(true);
        setMfaFactors(stepUp.factors);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('stag_beetle_admin_session');
        }
      } else {
        console.log('[Auth] resolveAndSetProfile: admin email, aal2 confirmed — granting admin');
        setIsAdminState(true);
        setMfaPending(false);
        setMfaFactors([]);
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

    // Resolve the actual profile object from what fetchProfile found.
    let profile: UserProfile;

    if (profile0.status === 'found') {
      profile = profile0.profile;
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
    } else if (profile0.status === 'not_found') {
      // Confirmed by Supabase: no profile row exists yet — a genuine first
      // login, safe to create.
      console.log('[Auth] resolveAndSetProfile: no existing profile — creating one from OAuth metadata');
      profile = profileFromSupabaseUser(supabaseUser);
      await upsertProfile(profile);
    } else {
      // 'unknown' — the profile read timed out or errored, so we genuinely
      // don't know whether a real profile exists. Treating that the same as
      // "not found" would create-and-upsert a bare {id, name, email, phone}
      // object over whatever's actually stored, silently erasing address/
      // city/etc and any manually-edited name or phone. Instead: show the
      // best data we already have (the cached copy from localStorage, if
      // it's for this same user — set during the optimistic-paint step in
      // bootstrap — otherwise a bare OAuth-derived stand-in for display
      // only) and deliberately skip upsertProfile entirely, so a mere
      // network hiccup can never overwrite real saved data.
      console.warn('[Auth] resolveAndSetProfile: profile fetch inconclusive (timeout/error) — keeping last known profile, not overwriting saved data');
      let cachedForThisUser: UserProfile | null = null;
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('stag_beetle_user');
          const parsed = cached ? (JSON.parse(cached) as UserProfile) : null;
          if (parsed && parsed.id === supabaseUser.id) cachedForThisUser = parsed;
        } catch { /* ignore */ }
      }
      profile = cachedForThisUser || profileFromSupabaseUser(supabaseUser);
    }

    setUser(profile);
    return profile;
  }, [checkAdminStepUp]);

  // ── Bootstrap: check existing session on mount ─────────────────────────────
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      console.log('[Auth] bootstrap: starting (mount/refresh)');
      setLoading(true);
      // Declared outside the try block so the `finally` below (and the
      // fallback logic further down) can still read what this run learned,
      // even if something earlier throws.
      let haveUser = false;
      let supabaseConfirmedNoSession = false;
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

        // ── Optimistic first paint ──────────────────────────────────────────────
        // Hydrate from whatever's cached locally, synchronously, and drop
        // `loading` right away — a gated page (e.g. /admin) can render
        // immediately instead of blocking on a Supabase round trip (worst
        // case several seconds, between the retry and the timeout) before
        // showing anything at all. The verification below still runs, in
        // the background, and corrects this if it turns out to be wrong
        // (expired session, revoked admin access, etc). This is a
        // first-paint speed optimization only — every real read/write is
        // still independently authorized server-side via RLS, so an
        // optimistic isAdmin=true here can't grant access beyond what the
        // actual session already allows; worst case is a brief flash of the
        // wrong UI, never a real permissions bypass.
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('stag_beetle_user');
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser) as UserProfile;
              setUser(parsed);
              haveUser = true;
              if (localStorage.getItem('stag_beetle_admin_session') === 'true') {
                console.log('[Auth] bootstrap: optimistic paint — restoring cached session + admin flag for', parsed.email || parsed.id);
                setIsAdminState(true);
              } else {
                console.log('[Auth] bootstrap: optimistic paint — restoring cached session for', parsed.email || parsed.id);
              }
            } catch { /* ignore */ }
          }
        }
        setLoading(false); // the page can render now — verification continues below, in the background

        // ── Supabase path (background verification / correction) ──────────────
        // haveUser / supabaseConfirmedNoSession (declared above, outside the
        // try) track what THIS bootstrap run actually confirmed, so the
        // correction pass below can tell "Supabase confirmed there's no
        // session" apart from "we don't actually know because the call
        // timed out". Collapsing those two cases used to wipe a perfectly
        // valid cached session (and could leave isAdmin=true with no user
        // at all — a broken, contradictory state) just because one request
        // was slow.
        if (supabase) {
          try {
            console.log('[Auth] bootstrap: verifying session with Supabase in the background...');
            const { data: { session } } = await withOneRetry(() => supabaseTimeout(supabase!.auth.getSession()));
            if (session?.user && mounted) {
              console.log('[Auth] bootstrap: verified — session confirmed for', session.user.email || session.user.id);
              await resolveAndSetProfile(session.user);
              haveUser = true;
            } else {
              console.log('[Auth] bootstrap: verified — Supabase confirmed no active session');
              supabaseConfirmedNoSession = true;
            }
          } catch (e: any) {
            console.warn('[Auth] bootstrap: verification failed or timed out — status unknown, keeping the optimistic cached state as-is:', e.message || e);
          }
        }

        // ── Correction pass ─────────────────────────────────────────────────────
        if (typeof window !== 'undefined' && mounted) {
          if (supabase && supabaseConfirmedNoSession) {
            // Supabase actively confirmed there is no session. If we
            // optimistically painted a cached one above, it was stale (e.g.
            // the session genuinely expired since the last visit) — clear
            // it rather than leaving the UI showing a login that doesn't
            // actually exist server-side. Email/phone sessions are never
            // Supabase-backed in the first place, so this doesn't apply to them.
            const storedUser = localStorage.getItem('stag_beetle_user');
            let isEmailPhoneSession = false;
            try { isEmailPhoneSession = !!(storedUser && (JSON.parse(storedUser) as UserProfile).id?.startsWith('usr_')); } catch { /* ignore */ }
            if (storedUser && !isEmailPhoneSession) {
              console.warn('[Auth] bootstrap: cached session was stale — Supabase confirmed logged out, clearing optimistic state');
              setUser(null);
              setIsAdminState(false);
              haveUser = false;
              localStorage.removeItem('stag_beetle_user');
              localStorage.removeItem('stag_beetle_admin_session');
            }
          }

          // Only ever treat isAdmin as true alongside an actual signed-in
          // user. isAdmin=true with user=null is exactly the "stuck,
          // half-logged-in admin" state a timed-out refresh could produce
          // before this fix — looks logged in in the UI, but there's no
          // session behind it, and logout has nothing coherent to clear.
          if (!haveUser && localStorage.getItem('stag_beetle_admin_session') === 'true') {
            console.warn('[Auth] bootstrap: found admin flag with no resolved user — discarding it instead of entering a broken half-logged-in state');
            localStorage.removeItem('stag_beetle_admin_session');
            setIsAdminState(false);
          }
        }
      } finally {
        if (mounted) {
          // Reads the locally-tracked flags from this run, not the `user`/
          // `isAdmin` state — this effect only runs once per mount, so
          // those would be stale closures over their initial (null/false)
          // values and would always print the same thing regardless of
          // what bootstrap actually resolved.
          console.log(`[Auth] bootstrap: finished — haveUser=${haveUser} supabaseConfirmedNoSession=${supabaseConfirmedNoSession}`);
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
          console.log(`[Auth] onAuthStateChange: ${event} (session user: ${session?.user?.email || session?.user?.id || 'none'})`);

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

            console.log(`[Auth] onAuthStateChange: SIGNED_OUT — isRealSupabaseUser=${isRealSupabaseUser} (false usually means logout() already cleared local state; true means an external sign-out — e.g. a token revoked from another device/tab — is what triggered this)`);
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
            console.log('[Auth] onAuthStateChange: TOKEN_REFRESHED — silently re-resolving profile for', session.user.email || session.user.id);
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
  // Called after a correct password when resolveAndSetProfile found at least
  // one verified authenticator but the session hasn't stepped up to aal2
  // yet. factorId identifies which staff member's device is being used —
  // the login screen collects this via a picker when more than one exists.
  const verifyMfaCode = async (factorId: string, code: string) => {
    if (!supabase) return { error: 'Supabase is not configured' };
    if (!factorId) return { error: 'No device selected — please sign in again.' };
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
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
  // Must be called from an already-authenticated session. Multiple staff
  // share this one admin account, so each enrollment is named (e.g. "Amit —
  // Store 1") rather than assuming there's only ever one device on the
  // account. Returns a QR code (SVG data URI, straight from Supabase — no
  // extra QR library needed) plus the secret for manual entry, and the
  // factorId to confirm with next.
  const enrollMfa = async (friendlyName: string) => {
    if (!supabase) return { qrCode: null, secret: null, factorId: null, error: 'Supabase is not configured' };
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: friendlyName.trim() });
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
    console.log('[Auth] logout() called — clearing local session immediately');
    // Clear local state FIRST, unconditionally. The remote sign-out below
    // used to run first with no timeout — if Supabase's auth endpoint was
    // slow/unreachable, this function would hang before ever reaching the
    // lines that actually log the user out, so "Log out" silently did
    // nothing. Local state should never be gated on a possibly-hanging
    // network call; the remote call below is now best-effort cleanup only.
    setUser(null);
    setIsAdminState(false);
    setMfaPending(false);
    setMfaFactors([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stag_beetle_user');
      localStorage.removeItem('stag_beetle_admin_session');
    }

    if (supabase) {
      try {
        await withOneRetry(() => supabaseTimeout(supabase!.auth.signOut()));
        console.log('[Auth] logout() — remote sign-out confirmed');
      } catch (e: any) {
        console.warn('[Auth] logout() — remote sign-out failed or timed out (local session was already cleared):', e.message || e);
      }
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
      mfaFactors,
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
