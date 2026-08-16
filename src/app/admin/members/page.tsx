"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Member, MemberDiscountConfig, MemberDiscountResult,
  getMemberDiscountConfig, setMemberDiscountConfig,
  searchMembers, getMembersCount, registerMember, deleteMember, getMemberDiscount, redeemMemberDiscount,
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
  const { isAdmin } = useAuth();

  // Discount settings
  const [config, setConfig] = useState<MemberDiscountConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState('');

  // Lookup / search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [eligibility, setEligibility] = useState<Record<string, MemberDiscountResult | null | 'checking'>>({});

  // Total member count — the full roster (with pagination) lives on its
  // own page now; this hub just needs the headline number.
  const [totalMembers, setTotalMembers] = useState<number | null>(null);

  // Quick add (in-store, admin-typed)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', birthday: '', anniversary: '' });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // QR download
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // Derived directly at render time rather than via state+effect — it's a
  // pure function of the current origin, nothing to synchronize.
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?src=store` : '';
  const qrImageUrl = joinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(joinUrl)}` : '';

  const refreshCount = useCallback(() => {
    getMembersCount().then(setTotalMembers);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    getMemberDiscountConfig().then(setConfig);
    refreshCount();
  }, [isAdmin, refreshCount]);

  // Fetches the same QR image shown on the page (as a Blob rather than
  // just linking to it) and saves it locally — a plain <a download> on a
  // cross-origin image URL gets silently ignored by most browsers (the
  // `download` attribute only reliably applies to same-origin/blob/data
  // URLs), so this is what actually makes "download" work for a QR meant
  // to be printed and kept at the register.
  const handleDownloadQr = async () => {
    if (!qrImageUrl) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch(qrImageUrl);
      if (!res.ok) throw new Error('Failed to fetch QR image');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'stagbeetle-circle-qr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setDownloadError("Couldn't download the QR right now — please try again.");
    } finally {
      setDownloading(false);
    }
  };

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

  // In-store sales go through Galla (the POS), not this site's checkout —
  // there was previously no trigger anywhere that could record an in-store
  // redemption at all. This is that trigger: staff confirm the discount was
  // actually given at the register, and it's marked used for the year right
  // here, the same DB-enforced-unique redemption ledger checkout writes to.
  const [markingAvailed, setMarkingAvailed] = useState<string | null>(null);
  const handleMarkAvailed = async (member: Member) => {
    const state = eligibility[member.id];
    if (!state || state === 'checking' || state.already_redeemed) return;
    setMarkingAvailed(member.id);
    const ok = await redeemMemberDiscount(member.email, member.phone, state.reason, state.period_year, 'in-store');
    if (ok) {
      setEligibility(prev => ({ ...prev, [member.id]: { ...state, already_redeemed: true, redeemed_at: new Date().toISOString() } }));
    }
    setMarkingAvailed(null);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.phone.trim()) return;
    setAdding(true);
    setAddMsg('');
    const res = await registerMember({ ...addForm, source: 'admin' });
    if (res.ok) {
      setAddMsg(`Added ${addForm.name}.`);
      setAddForm({ name: '', email: '', phone: '', birthday: '', anniversary: '' });
      refreshCount();
    } else {
      setAddMsg(res.error || 'Failed to add member.');
    }
    setAdding(false);
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`Remove ${member.name} (${member.email}) from the membership list?`)) return;
    const ok = await deleteMember(member.id);
    if (ok) {
      setResults(prev => prev.filter(m => m.id !== member.id));
      setTotalMembers(prev => (prev !== null ? prev - 1 : prev));
    }
  };

  // authLoading is handled by admin/layout.tsx (full-screen spinner, this
  // page doesn't even mount until it resolves) — nothing to do here.

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
    if (state.already_redeemed) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
          🎂 Availed {state.redeemed_at ? new Date(state.redeemed_at).toLocaleDateString() : ''} — {state.reason}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
          🎉 {state.discount_percent}% off — {state.reason}
        </span>
        <button
          type="button"
          onClick={() => handleMarkAvailed(member)}
          disabled={markingAvailed === member.id}
          className="text-[10.5px] font-bold text-white bg-[#052A42] hover:bg-[#052A42]/90 rounded-sm px-2 py-1 uppercase tracking-wide disabled:opacity-50"
          title="Confirm the discount was given at the register — marks it used for this year"
        >
          {markingAvailed === member.id ? 'Marking…' : 'Mark as Availed'}
        </button>
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">

          <div className="border-b border-on-surface/10 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE ADMIN</span>
              <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Membership &amp; Birthday/Anniversary Discounts</h1>
              <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
                Manage the discount program, look up whether a customer at the register is a member and eligible right now, and register new members in-store.
              </p>
            </div>
            <Link href="/admin/members/list" className="text-right shrink-0 group">
              <span className="font-display text-[32px] font-semibold text-[#052A42] leading-none block group-hover:text-gold-leaf transition-colors">
                {totalMembers === null ? '—' : totalMembers.toLocaleString()}
              </span>
              <span className="text-[10.5px] font-label-caps text-on-surface-variant tracking-wider uppercase group-hover:text-gold-leaf transition-colors">
                Total Members · View All →
              </span>
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
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant block">Anniversary Window (± days)</label>
                    <input
                      type="number" min={0} max={30}
                      value={config.window_days}
                      onChange={(e) => setConfig({ ...config, window_days: Number(e.target.value) })}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10.5px] text-zinc-400">
                  Birthday discount is live for the member&apos;s entire birthday month (e.g. a June 14th birthday is eligible any day in June) — not
                  a day-count window. The window above applies to the anniversary discount only: a window of 3 means it&apos;s live from 3 days
                  before the date through 3 days after it, not just the exact day. Either discount can only be used <strong>once per year</strong> —
                  redeeming it on an order blocks it from applying again until next year.
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
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(joinUrl)}`}
                  alt="QR code to join the membership program in-store"
                  width={140}
                  height={140}
                  className="border border-zinc-200 rounded-sm shrink-0"
                />
              )}
              <div className="space-y-2.5 min-w-0">
                <p className="text-[12px] text-zinc-500">Link (works the same, for a poster or a text message too):</p>
                <code className="block text-[11.5px] font-mono bg-zinc-50 border border-zinc-200 rounded-sm px-2.5 py-2 break-all">{joinUrl}</code>
                <p className="text-[10.5px] text-zinc-400">Tagged with <code className="font-mono">?src=store</code> so registrations from this poster are distinguishable from online sign-ups.</p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    disabled={downloading || !joinUrl}
                    className="inline-flex items-center gap-1.5 bg-[#052A42] text-white text-[11px] font-bold px-3.5 py-2 rounded-sm hover:bg-[#052A42]/90 transition-colors disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    {downloading ? 'Preparing…' : 'Download QR (PNG, 600×600)'}
                  </button>
                  {downloadError && <span className="text-[11px] text-red-600">{downloadError}</span>}
                </div>
              </div>
            </div>
          </Section>

          {/* Member lookup */}
          <Section
            title="Member Lookup"
            subtitle="Search by name, email, or phone to check whether a customer at the register is a member, and whether their discount is live right now. Once given, click &quot;Mark as Availed&quot; to record it — each member gets one discount per year, and it resets automatically at their next birthday month or anniversary."
          >
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
                type="tel" required placeholder="Phone"
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

          {/* Full roster lives on its own paginated page now — this is just
              the pointer to it (also linked from the stat in the header above). */}
          <Link
            href="/admin/members/list"
            className="flex items-center justify-between border border-on-surface/5 bg-white rounded-sm p-6 md:p-8 hover:border-gold-leaf/40 transition-colors group"
          >
            <div>
              <h2 className="font-display text-[16px] font-semibold text-on-surface group-hover:text-gold-leaf transition-colors">View Full Member List</h2>
              <p className="text-[12.5px] text-on-surface-variant mt-1">Every member, paginated, with search — the foundation for a future bulk WhatsApp/email send.</p>
            </div>
            <span className="material-symbols-outlined text-[22px] text-zinc-300 group-hover:text-gold-leaf transition-colors shrink-0">arrow_forward</span>
          </Link>

    </div>
  );
}
