"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type DashboardTab = 'analytics' | 'products' | 'coupons' | 'orders';
const DASHBOARD_TABS: { tab: DashboardTab; label: string; icon: string; tooltip: string }[] = [
  { tab: 'analytics', label: 'ATELIER ANALYTICS', icon: 'query_stats', tooltip: 'Sales, revenue, and best-selling garments at a glance' },
  { tab: 'products', label: 'GARMENT CATALOG', icon: 'apparel', tooltip: 'Add, edit, and manage every product in the store' },
  { tab: 'coupons', label: 'DISCOUNT COUPONS', icon: 'sell', tooltip: 'Create and manage promo codes' },
  { tab: 'orders', label: 'ORDER REGISTRY', icon: 'receipt_long', tooltip: 'View and update customer orders and shipping status' },
];

const PAGE_LINKS = [
  { href: '/admin/users', label: 'REGISTERED USERS', icon: 'group', tooltip: 'Everyone with a real website account — search, edit contact details' },
  { href: '/admin/members', label: 'MEMBERSHIP & DISCOUNTS', icon: 'redeem', tooltip: 'Birthday/anniversary discount program — settings, lookup, and sign-ups' },
  { href: '/admin/integration', label: 'GALLA INTEGRATION DOCS', icon: 'sync_alt', tooltip: 'Reference for the in-store POS inventory sync' },
];

// The one, persistent left-hand nav for every /admin/* page — lives in
// admin/layout.tsx so it stays mounted and visible across navigation
// instead of only existing inside the main dashboard page's own JSX.
// Before this, clicking "Registered Users" or "Membership & Discounts" (a
// real route change, not a tab) took the sidebar away entirely, since it
// only existed inline in that one page's component tree — only the
// destination page's own content ever rendered, full-width, no nav.
//
// Reads the current tab/route directly from the URL (usePathname/
// useSearchParams) rather than through props or lifted state, so it can
// live in the layout while /admin's own page component independently
// derives which tab to render — no coordination needed between the two,
// the URL is the single source of truth both read from.
function AdminSidebarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('admin-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { window.localStorage.setItem('admin-sidebar-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const isDashboardHome = pathname === '/admin';
  const tabParam = searchParams.get('tab');
  const activeTab: DashboardTab = isDashboardHome && tabParam && DASHBOARD_TABS.some(t => t.tab === tabParam)
    ? (tabParam as DashboardTab)
    : 'analytics';

  const itemClass = (active: boolean) =>
    `w-full flex items-center gap-3 rounded-sm text-[12px] font-label-caps tracking-wider transition-all font-semibold ${
      collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'
    } ${active ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface'}`;

  return (
    <div
      className={`relative shrink-0 w-full bg-surface-dim/40 border border-on-surface/5 p-4 rounded-sm space-y-1.5 transition-[width] duration-200 lg:sticky lg:top-20 lg:self-start ${
        collapsed ? 'lg:w-[68px] lg:p-2.5' : 'lg:w-64'
      }`}
    >
      {/* Collapse/expand handle — sits on the sidebar's outer edge, not in the
          nav list itself, so it reads as a panel control rather than another
          menu item. Chevron mirrors the classic edge-toggle idiom (VS Code, Gmail). */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden lg:flex absolute -top-3 -right-3 w-7 h-7 items-center justify-center rounded-full bg-white border border-on-surface/15 shadow-md text-zinc-500 hover:text-primary hover:border-primary/40 transition-all z-10"
      >
        <span className="material-symbols-outlined text-[16px]">
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      {DASHBOARD_TABS.map(({ tab, label, icon, tooltip }) => (
        <button
          key={tab}
          type="button"
          onClick={() => router.push(`/admin?tab=${tab}`)}
          title={collapsed ? `${label} — ${tooltip}` : tooltip}
          className={itemClass(isDashboardHome && activeTab === tab)}
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
          {!collapsed && label}
        </button>
      ))}

      <div className="border-t border-on-surface/10 my-2"></div>

      {PAGE_LINKS.map(({ href, label, icon, tooltip }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} title={collapsed ? `${label} — ${tooltip}` : tooltip} className={itemClass(active)}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {!collapsed && label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminSidebar() {
  return (
    <Suspense fallback={<div className="hidden lg:block w-64 shrink-0" />}>
      <AdminSidebarInner />
    </Suspense>
  );
}
