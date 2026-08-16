"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UserProfile, getProfilesPage, registerMember, adminUpdateProfile } from '@/lib/db';

const PAGE_SIZE = 100;

// Registered customers — everyone with a real Supabase Auth account
// (email+password or Google). Distinct from the Membership list
// (/admin/members): a registered user doesn't automatically get birthday/
// anniversary perks, and a member doesn't need a website login at all.
// This page is where the two meet — "Make Member" on any row extends the
// loyalty program to an existing customer without them re-registering.
export default function AdminUsersPage() {
  const { isAdmin } = useAuth();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberStatus, setMemberStatus] = useState<Record<string, 'saving' | 'done' | 'error'>>({});

  // Inline phone editing — click the phone cell, edit, save. Only one row
  // at a time (editingId doubles as "is anything being edited right now").
  const [editingId, setEditingId] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const load = useCallback((targetPage: number, q: string) => {
    getProfilesPage(targetPage, PAGE_SIZE, q || undefined).then(res => {
      setProfiles(res.profiles);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load(page, activeQuery);
  }, [isAdmin, page, activeQuery, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(query.trim());
  };

  const handleMakeMember = async (profile: UserProfile) => {
    setMemberStatus(prev => ({ ...prev, [profile.id]: 'saving' }));
    const res = await registerMember({
      name: profile.name || profile.email,
      email: profile.email,
      phone: profile.phone,
      source: 'admin',
    });
    setMemberStatus(prev => ({ ...prev, [profile.id]: res.ok || res.alreadyRegistered ? 'done' : 'error' }));
  };

  const startEditPhone = (profile: UserProfile) => {
    setEditingId(profile.id);
    setPhoneDraft(profile.phone || '');
  };

  const cancelEditPhone = () => {
    setEditingId(null);
    setPhoneDraft('');
  };

  const saveEditPhone = async (profile: UserProfile) => {
    setSavingPhone(true);
    const ok = await adminUpdateProfile(profile.id, { phone: phoneDraft.trim() });
    if (ok) {
      setProfiles(prev => prev.map(p => (p.id === profile.id ? { ...p, phone: phoneDraft.trim() } : p)));
      setEditingId(null);
    }
    setSavingPhone(false);
  };

  const totalPages = total !== null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  // authLoading is handled by admin/layout.tsx — nothing to do here.

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24 text-center px-6">
        <div className="max-w-sm space-y-4">
          <span className="material-symbols-outlined text-[40px] text-gold-leaf">lock</span>
          <h1 className="font-display text-[22px] font-semibold text-on-surface">Admin Access Required</h1>
          <Link
            href="/admin"
            className="inline-block bg-primary text-white px-6 py-3 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all"
          >
            GO TO ADMIN SIGN IN
          </Link>
        </div>
      </div>
    );
  }

  const renderMemberAction = (profile: UserProfile) => {
    const status = memberStatus[profile.id];
    if (status === 'saving') return <span className="text-[11px] text-zinc-400">Adding…</span>;
    if (status === 'done') return <span className="text-[11px] font-bold text-green-700">✓ Member</span>;
    if (status === 'error') return <span className="text-[11px] text-red-600">Failed</span>;
    return (
      <button
        type="button"
        onClick={() => handleMakeMember(profile)}
        className="text-[10.5px] font-bold text-[#052A42] hover:underline uppercase tracking-wide"
      >
        Make Member
      </button>
    );
  };

  return (
    <div className="max-w-[1400px] space-y-6">

          <div className="border-b border-on-surface/10 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE ADMIN</span>
              <h1 className="font-display text-[26px] md:text-[30px] font-semibold text-on-surface">Registered Users</h1>
              <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-2xl">
                Everyone with a real website account (email/password or Google sign-in). Doesn&apos;t include the passwordless
                quick-checkout option, which never creates a server-side account — see below.
              </p>
            </div>
            <div className="text-right">
              <span className="font-display text-[32px] font-semibold text-[#052A42] leading-none block">
                {total === null ? '—' : total.toLocaleString()}
              </span>
              <span className="text-[10.5px] font-label-caps text-on-surface-variant tracking-wider uppercase">Registered Users</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, email, or phone…"
              className="flex-1 bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
            />
            <button
              type="submit"
              className="bg-[#052A42] text-white text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-[#052A42]/90 transition-colors"
            >
              Filter
            </button>
            {activeQuery && (
              <button
                type="button"
                onClick={() => { setQuery(''); setActiveQuery(''); setPage(1); }}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 px-2"
              >
                Clear
              </button>
            )}
          </form>

          <div className="border border-on-surface/5 bg-white rounded-sm overflow-hidden">
            {loading ? (
              <p className="text-[12px] text-zinc-400 p-6">Loading…</p>
            ) : profiles.length === 0 ? (
              <p className="text-[12px] text-zinc-400 p-6">{activeQuery ? 'No users match that search.' : 'No registered users yet.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold bg-surface-dim/60">
                      <th className="px-4 py-2.5">NAME</th>
                      <th className="px-4 py-2.5">EMAIL</th>
                      <th className="px-4 py-2.5">PHONE</th>
                      <th className="px-4 py-2.5">LOCATION</th>
                      <th className="px-4 py-2.5">LAST UPDATED</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-on-surface/5">
                    {profiles.map(p => (
                      <tr key={p.id} className="hover:bg-surface-dim/30">
                        <td className="px-4 py-2.5 font-semibold text-on-surface whitespace-nowrap">{p.name || '—'}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{p.email}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">
                          {editingId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="tel"
                                autoFocus
                                value={phoneDraft}
                                onChange={(e) => setPhoneDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEditPhone(p); if (e.key === 'Escape') cancelEditPhone(); }}
                                className="w-32 bg-white border border-gold-leaf rounded-sm py-1 px-1.5 text-[12px] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => saveEditPhone(p)}
                                disabled={savingPhone}
                                className="text-green-700 hover:text-green-900 disabled:opacity-50"
                                aria-label="Save phone"
                              >
                                <span className="material-symbols-outlined text-[16px]">check</span>
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditPhone}
                                className="text-zinc-400 hover:text-zinc-700"
                                aria-label="Cancel"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditPhone(p)}
                              className="flex items-center gap-1 hover:text-[#052A42] group"
                              title="Click to edit phone number"
                            >
                              {p.phone || '—'}
                              <span className="material-symbols-outlined text-[13px] text-zinc-300 group-hover:text-gold-leaf">edit</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{[p.city, p.country].filter(Boolean).join(', ') || '—'}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {renderMemberAction(p)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {total !== null && total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="border border-zinc-200 rounded-sm px-3 py-1.5 font-semibold text-zinc-600 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="font-semibold text-zinc-700">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="border border-zinc-200 rounded-sm px-3 py-1.5 font-semibold text-zinc-600 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-[12px] text-amber-900 leading-relaxed">
            <strong className="text-amber-700">Why this list might be shorter than you expect:</strong> the storefront also
            offers a passwordless &quot;name + email + phone&quot; quick option at checkout, which never creates a real account —
            it&apos;s saved only in that shopper&apos;s own browser. Those visitors placed real orders (visible in Order Registry)
            but won&apos;t appear here, since there&apos;s no server-side account for this page to show.
          </div>

    </div>
  );
}
