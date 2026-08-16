"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import {
  Member, MemberDiscountConfig, MemberDiscountResult,
  getMemberDiscountConfig, setMemberDiscountConfig,
  searchMembers, getRecentMembers, registerMember, deleteMember, getMemberDiscount,
} from '@/lib/db';

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border border-on-surface/5 bg-white rounded-sm p-6 md:p-8 space-y-4">
      <div>
        <h2 className="font-display text-[18px] md:text-[20px] font-semibold text-on-surface">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function AdminMembersPage() {
  const { isAdmin, loading: authLoading } = useAuth();

  // Discount settings
  const [config, setConfig] = useState<MemberDiscountConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState('');

  // Lookup / search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [eligibility, setEligibility] = useState<Record<string, MemberDiscountResult | null | 'checking'>>({});

  // Recent members
  const [recent, setRecent] = useState<Member[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Quick add (in-store, admin-typed)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', birthday: '', anniversary: '' });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // Derived directly at render time rather than via state+effect — it's a
  // pure function of the current origin, nothing to synchronize.
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?src=store` : '';

  // Deliberately doesn't set recentLoading synchronously — the initial
  // `useState(true)` default already covers first paint, and a later
  // refresh (after adding/removing a member) reads better as a silent swap
  // than a loading flash over the table that's already showing.
  const loadRecent = useCallback(() => {
    getRecentMembers().then(setRecent).finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    getMemberDiscountConfig().then(setConfig);
    loadRecent();
  }, [isAdmin, loadRecent]);

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    setConfigMsg('');
    const ok = await setMemberDiscountConfig(config);
    setConfigMsg(ok ? 'Saved.' : 'Failed to save — please try again.');
    setSavingConfig(false);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const res = await searchMembers(query);
    setResults(res);
    setEligibility({});
    setSearching(false);
  };

  const checkEligibility = async (member: Member) => {
    setEligibility(prev => ({ ...prev, [member.id]: 'checking' }));
    const res = await getMemberDiscount(member.email, member.phone);
    setEligibility(prev => ({ ...prev, [member.id]: res }));
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) return;
    setAdding(true);
    setAddMsg('');
    const res = await registerMember({ ...addForm, source: 'admin' });
    if (res.ok) {
      setAddMsg(`Added ${addForm.name}.`);
      setAddForm({ name: '', email: '', phone: '', birthday: '', anniversary: '' });
      loadRecent();
    } else {
      setAddMsg(res.error || 'Failed to add member.');
    }
    setAdding(false);
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`Remove ${member.name} (${member.email}) from the membership list?`)) return;
    const ok = await deleteMember(member.id);
    if (ok) {
      setRecent(prev => prev.filter(m => m.id !== member.id));
      setResults(prev => prev.filter(m => m.id !== member.id));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24 text-center px-6">
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
        </main>
        <Footer />
      </div>
    );
  }

  const renderEligibility = (member: Member) => {
    const state = eligibility[member.id];
    if (state === undefined) {
      return (
        <button
          type="button"
          onClick={() => checkEligibility(member)}
          className="text-[10.5px] font-bold text-[#052A42] hover:underline uppercase tracking-wide"
        >
          Check eligibility
        </button>
      );
    }
    if (state === 'checking') return <span className="text-[11px] text-zinc-400">Checking…</span>;
    if (state === null) return <span className="text-[11px] text-zinc-400">Not eligible today</span>;
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
        🎉 {state.discount_percent}% off — {state.reason}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20">
      <Header />
      <main className="flex-1 relative py-12 md:py-16 bg-white">
        <div className="fixed inset-0 marble-overlay z-0"></div>
        <div className="max-w-[860px] mx-auto px-6 md:px-12 relative z-10 space-y-6">

          <div className="border-b border-on-surface/10 pb-6">
            <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE ADMIN</span>
            <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Membership &amp; Birthday/Anniversary Discounts</h1>
            <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
              Manage the discount program, look up whether a customer at the register is a member and eligible right now, and register new members in-store.
            </p>
            <Link href="/admin" className="inline-block mt-4 text-[11px] font-label-caps font-semibold text-zinc-500 hover:text-gold-leaf underline uppercase tracking-wider">
              ← Back to Dashboard
            </Link>
          </div>

          {/* Discount settings */}
          <Section title="Discount Settings" subtitle="Applies automatically at online checkout, and is what the eligibility check below (and in-store lookups) is based on.">
            {!config ? (
              <p className="text-[12px] text-zinc-400">Loading…</p>
            ) : (
              <div className="space-y-4">
                <label className="flex items-center gap-2.5 text-[13px] font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={config.active}
                    onChange={(e) => setConfig({ ...config, active: e.target.checked })}
                    className="w-4 h-4 accent-[#052A42]"
                  />
                  Program active
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant block">Birthday Discount (%)</label>
                    <input
                      type="number" min={0} max={100}
                      value={config.birthday_percent}
                      onChange={(e) => setConfig({ ...config, birthday_percent: Number(e.target.value) })}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant block">Anniversary Discount (%)</label>
                    <input
                      type="number" min={0} max={100}
                      value={config.anniversary_percent}
                      onChange={(e) => setConfig({ ...config, anniversary_percent: Number(e.target.value) })}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant block">Window (± days)</label>
                    <input
                      type="number" min={0} max={30}
                      value={config.window_days}
                      onChange={(e) => setConfig({ ...config, window_days: Number(e.target.value) })}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10.5px] text-zinc-400">
                  e.g. a window of 3 means the discount is live from 3 days before the date through 3 days after it, not just the exact day.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    className="bg-[#052A42] text-white text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-[#052A42]/90 transition-colors disabled:opacity-60"
                  >
                    {savingConfig ? 'Saving…' : 'Save Settings'}
                  </button>
                  {configMsg && <span className="text-[12px] text-zinc-500">{configMsg}</span>}
                </div>
              </div>
            )}
          </Section>

          {/* In-store QR / link */}
          <Section title="In-Store Self-Registration" subtitle="Print this as a QR code for the register/counter — customers scan it, fill in their details on their own phone, and are registered instantly. No password, no app.">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {joinUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`}
                  alt="QR code to join the membership program in-store"
                  width={140}
                  height={140}
                  className="border border-zinc-200 rounded-sm shrink-0"
                />
              )}
              <div className="space-y-2 min-w-0">
                <p className="text-[12px] text-zinc-500">Link (works the same, for a poster or a text message too):</p>
                <code className="block text-[11.5px] font-mono bg-zinc-50 border border-zinc-200 rounded-sm px-2.5 py-2 break-all">{joinUrl}</code>
                <p className="text-[10.5px] text-zinc-400">Tagged with <code className="font-mono">?src=store</code> so registrations from this poster are distinguishable from online sign-ups.</p>
              </div>
            </div>
          </Section>

          {/* Member lookup */}
          <Section title="Member Lookup" subtitle="Search by name, email, or phone to check whether a customer at the register is a member, and whether their discount is live right now.">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, or phone…"
                className="flex-1 bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-[#052A42] text-white text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-[#052A42]/90 transition-colors disabled:opacity-60"
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </form>
            {results.length > 0 && (
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-sm overflow-hidden">
                {results.map(m => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-zinc-800">{m.name}</p>
                      <p className="text-[11.5px] text-zinc-500">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                      <p className="text-[10.5px] text-zinc-400">Birthday {fmtDate(m.birthday)} · Anniversary {fmtDate(m.anniversary)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {renderEligibility(m)}
                      <button
                        type="button"
                        onClick={() => handleDelete(m)}
                        className="text-[10.5px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wide"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {query.trim() && !searching && results.length === 0 && (
              <p className="text-[12px] text-zinc-400">No members found.</p>
            )}
          </Section>

          {/* Quick add — in-store, admin-typed */}
          <Section title="Register a Member (In-Store)" subtitle="For a customer at the register without their phone handy — enter their details directly instead of the QR code.">
            <form onSubmit={handleQuickAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text" required placeholder="Full name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
              />
              <input
                type="email" required placeholder="Email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
              />
              <input
                type="tel" placeholder="Phone (optional)"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className="bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
              />
              <div />
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-label-caps font-semibold text-on-surface-variant block">Birthday</label>
                <input
                  type="date"
                  value={addForm.birthday}
                  onChange={(e) => setAddForm({ ...addForm, birthday: e.target.value })}
                  className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-label-caps font-semibold text-on-surface-variant block">Anniversary</label>
                <input
                  type="date"
                  value={addForm.anniversary}
                  onChange={(e) => setAddForm({ ...addForm, anniversary: e.target.value })}
                  className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={adding}
                  className="bg-gold-leaf text-obsidian-charcoal text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-gold-leaf/90 transition-colors disabled:opacity-60"
                >
                  {adding ? 'Adding…' : 'Add Member'}
                </button>
                {addMsg && <span className="text-[12px] text-zinc-500">{addMsg}</span>}
              </div>
            </form>
          </Section>

          {/* Recent members */}
          <Section title="Recently Registered">
            {recentLoading ? (
              <p className="text-[12px] text-zinc-400">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="text-[12px] text-zinc-400">No members yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold">
                      <th className="pb-2">NAME</th>
                      <th className="pb-2">CONTACT</th>
                      <th className="pb-2">BIRTHDAY</th>
                      <th className="pb-2">ANNIVERSARY</th>
                      <th className="pb-2">SOURCE</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-on-surface/5">
                    {recent.map(m => (
                      <tr key={m.id}>
                        <td className="py-2 font-semibold text-on-surface">{m.name}</td>
                        <td className="py-2 text-on-surface-variant">{m.email}{m.phone ? ` · ${m.phone}` : ''}</td>
                        <td className="py-2 text-on-surface-variant">{fmtDate(m.birthday)}</td>
                        <td className="py-2 text-on-surface-variant">{fmtDate(m.anniversary)}</td>
                        <td className="py-2 text-on-surface-variant capitalize">{m.source.replace('_', ' ')}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(m)}
                            className="text-[10.5px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wide"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
