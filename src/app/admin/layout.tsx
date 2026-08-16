"use client";

import React from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';

// Shared shell for every /admin/* page — this is what makes the sidebar
// (and header/footer) persistent across navigation instead of each page
// mounting its own copy. Before this, /admin/members and /admin/users were
// separate pages that each rendered AdminHeader/AdminFooter directly and
// had no sidebar at all — navigating to either dropped the left nav
// entirely, since it only ever lived inline inside the main dashboard
// page's own component tree.
//
// The sidebar only shows once `isAdmin` resolves true — during the loading
// check and on the sign-in gate itself (the actual passcode form lives in
// /admin's own page content) there's nothing to navigate to yet.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20 selection:text-on-surface">
      <AdminHeader />

      <main className="flex-1 relative z-10 py-12 md:py-16 bg-white">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {isAdmin ? (
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <AdminSidebar />
              <div className="min-w-0 flex-1 w-full">
                {children}
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      <AdminFooter />
    </div>
  );
}
