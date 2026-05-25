"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, getProfile, upsertProfile, supabase } from '@/lib/db';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoginModalOpen: boolean;
  loading: boolean;
  loginWithGoogle: (mockAccount?: { name: string; email: string }) => Promise<void>;
  loginWithEmailPhone: (name: string, email: string, phone: string) => Promise<void>;
  logout: () => void;
  saveAddress: (address: string, city: string, zip: string, country: string) => Promise<void>;
  triggerLoginModal: (onSuccessCallback?: () => void) => void;
  closeLoginModal: () => void;
  setAdminStatus: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);

  // Sync session on mount
  useEffect(() => {
    const syncSession = async () => {
      // 1. Check if Supabase auth is configured and active
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await getProfile(session.user.id);
            if (profile) {
              setUser(profile);
            } else {
              // Create profile from oauth details
              const newProfile: UserProfile = {
                id: session.user.id,
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || '',
                phone: session.user.phone || ''
              };
              await upsertProfile(newProfile);
              setUser(newProfile);
            }
          }
        } catch (e) {
          console.warn("Supabase auth session sync failed:", e);
        }
      }

      // 2. Check localStorage fallback if no Supabase session was found or configured
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('stag_beetle_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error(e);
          }
        }

        const storedAdmin = localStorage.getItem('stag_beetle_admin_session');
        if (storedAdmin === 'true') {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    };

    syncSession();

    // Set up Supabase auth listener if available
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile) {
            setUser(profile);
          }
        } else {
          setUser(null);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const loginWithGoogle = async (mockAccount?: { name: string; email: string }) => {
    setLoading(true);
    if (supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return;
      } catch (e) {
        console.warn("Supabase OAuth failed, simulating Google Login:", e);
      }
    }

    // Fallback: Mock Account Chooser login simulation
    const account = mockAccount || {
      name: "Amit Sharma",
      email: "amit.sharma@gmail.com"
    };

    const mockProfile: UserProfile = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      name: account.name,
      email: account.email,
      phone: "+91 98765 43210",
      address: "Atelier Suite 10, Lavelle Road",
      city: "Bengaluru",
      zip: "560001",
      country: "India"
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_user', JSON.stringify(mockProfile));
      // Save to mock database profile pool as well
      await upsertProfile(mockProfile);
    }
    
    setUser(mockProfile);
    setIsLoginModalOpen(false);
    setLoading(false);

    if (onSuccessCallback) {
      onSuccessCallback();
      setOnSuccessCallback(null);
    }
  };

  const loginWithEmailPhone = async (name: string, email: string, phone: string) => {
    setLoading(true);
    // Create new profile session
    const mockProfile: UserProfile = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      phone,
      country: 'India'
    };

    if (supabase) {
      try {
        // Upsert into Supabase profile matching user
        await upsertProfile(mockProfile);
      } catch (e) {
        console.warn("Supabase profile save failed, using local storage:", e);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_user', JSON.stringify(mockProfile));
      await upsertProfile(mockProfile);
    }

    setUser(mockProfile);
    setIsLoginModalOpen(false);
    setLoading(false);

    if (onSuccessCallback) {
      onSuccessCallback();
      setOnSuccessCallback(null);
    }
  };

  const logout = () => {
    if (supabase) {
      supabase.auth.signOut();
    }
    setUser(null);
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stag_beetle_user');
      localStorage.removeItem('stag_beetle_admin_session');
    }
  };

  const saveAddress = async (address: string, city: string, zip: string, country: string) => {
    if (!user) return;
    const updatedProfile = {
      ...user,
      address,
      city,
      zip,
      country
    };

    await upsertProfile(updatedProfile);
    setUser(updatedProfile);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_user', JSON.stringify(updatedProfile));
    }
  };

  const triggerLoginModal = (onSuccess?: () => void) => {
    if (onSuccess) {
      setOnSuccessCallback(() => onSuccess);
    }
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setOnSuccessCallback(null);
  };

  const setAdminStatus = (status: boolean) => {
    setIsAdmin(status);
    if (typeof window !== 'undefined') {
      if (status) {
        localStorage.setItem('stag_beetle_admin_session', 'true');
      } else {
        localStorage.removeItem('stag_beetle_admin_session');
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
        setAdminStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
