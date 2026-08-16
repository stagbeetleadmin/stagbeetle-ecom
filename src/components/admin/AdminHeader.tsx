"use client";

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';

// Dedicated chrome for every /admin/* page — deliberately NOT the storefront
// Header/Footer. Those carry customer-facing nav ("New Arrivals", "Men",
// "Our Story"), a cart icon, an announcement banner, and a full multi-column
// footer of shop/policy/social links — none of which belong in a tool an
// admin uses to manage the catalog, coupons, orders, and membership
// program. Keeping this as its own always-admin component (rather than
// branching the storefront Header on `isAdmin`) also means there's no
// dependency on that flag having resolved yet — no flash of customer nav
// while auth is still bootstrapping.
//
// No nav links up here at all — not even a "Home" button. The logo itself
// already links to /admin, and the persistent sidebar (AdminSidebar, via
// admin/layout.tsx) covers every destination on every admin page now, so a
// second "way home" up here was pure redundancy.
//
// No "View Live Site" link — deliberately. Opening the storefront in a new
// tab is still the same browser: same localStorage, same Supabase Auth
// session, same cart. It wouldn't actually show what a customer sees
// either (the storefront header switches to admin-only nav for anyone
// signed in as admin, on every page, not just /admin) — it would just be
// the admin's own account poking at their own real cart/wishlist under a
// confusing label. Genuinely previewing the customer experience means a
// separate/incognito browser session, not a link this header can provide.
//
// Logo is rendered exactly as the storefront header does — same size,
// same color, same showText — intentionally not shrunk or inverted for
// this "admin" context, since customers occasionally do land here
// (auth-required redirects, shared links) and should see the same mark.
export default function AdminHeader() {
  const { logout } = useAuth();

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-[100]">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-2 shrink-0">
          <Logo className="w-auto h-10 text-[#052A42]" showText={true} />
        </Link>

        <button
          type="button"
          onClick={() => logout()}
          className="text-[11px] font-bold text-[#052A42] hover:text-white uppercase tracking-wide border border-[#052A42]/20 hover:bg-[#052A42] rounded-sm px-3.5 py-2 transition-colors shrink-0"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
