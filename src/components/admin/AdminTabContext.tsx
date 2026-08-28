"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// The four dashboard views under /admin. These are NOT separate routes — they
// live in one page component that toggles between them — so switching them must
// be pure client state, not navigation. Routing a query-only change
// (/admin?tab=orders) through router.push() is what was silently failing:
// /admin is a statically prerendered route, and the App Router treats a
// query-only push to an already-active static route as a no-op, so the URL (and
// therefore useSearchParams / activeTab) never updated.
export type DashboardTab = 'analytics' | 'products' | 'coupons' | 'orders';
export const DASHBOARD_TABS: DashboardTab[] = ['analytics', 'products', 'coupons', 'orders'];

const isTab = (v: string | null | undefined): v is DashboardTab =>
  !!v && (DASHBOARD_TABS as string[]).includes(v);

interface AdminTabValue {
  activeTab: DashboardTab;
  /**
   * Switch the visible dashboard tab. Updates client state immediately and,
   * when already on /admin, keeps the URL shareable via history.replaceState
   * (Next's router stays in sync with native history calls) — no server
   * round-trip, no middleware. On a different /admin/* route it does the state
   * change only; the caller is responsible for the actual route push.
   */
  setActiveTab: (t: DashboardTab) => void;
}

const AdminTabContext = createContext<AdminTabValue | null>(null);

export function AdminTabProvider({ children }: { children: ReactNode }) {
  // Server-safe default so hydration matches; a deep link to /admin?tab=orders
  // is picked up right after mount.
  const [activeTab, setTab] = useState<DashboardTab>('analytics');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    if (isTab(fromUrl)) setTab(fromUrl);
  }, []);

  const setActiveTab = useCallback((t: DashboardTab) => {
    setTab(t);
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      const url = t === 'analytics' ? '/admin' : `/admin?tab=${t}`;
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);

  return (
    <AdminTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AdminTabContext.Provider>
  );
}

export function useAdminTab(): AdminTabValue {
  const ctx = useContext(AdminTabContext);
  if (!ctx) throw new Error('useAdminTab must be used within <AdminTabProvider>');
  return ctx;
}
