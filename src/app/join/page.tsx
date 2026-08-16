"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { registerMember } from '@/lib/db';

// Public, no-login signup for the birthday/anniversary discount program.
// Reachable two ways: a shopper browsing the site, or an in-store QR code
// (printed with ?src=store so we can tell the two apart — see `source` on
// the member record). No password is created here — this is a lightweight
// membership record, not a website login; someone who also wants to log in
// and shop can create a full account separately with the same email.
function JoinForm() {
  const searchParams = useSearchParams();
  const inStore = searchParams.get('src') === 'store';

  const [form, setForm] = useState({ name: '', email: '', phone: '', birthday: '', anniversary: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; alreadyRegistered?: boolean; error?: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    setResult(null);
    const res = await registerMember({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      birthday: form.birthday || undefined,
      anniversary: form.anniversary || undefined,
      source: inStore ? 'in_store_qr' : 'online',
    });
    setResult(res);
    setSubmitting(false);
  };

  if (result?.ok || result?.alreadyRegistered) {
    return (
      <div className="max-w-md w-full space-y-5 relative z-10 p-8 border border-on-surface/5 bg-surface-dim/30 shadow-sm rounded-sm text-center">
        <span className="material-symbols-outlined text-[48px] text-gold-leaf">celebration</span>
        <h2 className="font-display text-[24px] font-semibold text-on-surface">
          {result.alreadyRegistered ? "You're already one of us" : "Welcome to the Circle"}
        </h2>
        <p className="font-body text-[14px] text-on-surface-variant leading-relaxed">
          {result.alreadyRegistered
            ? 'This email is already registered. Just show up (or check out) on your birthday or anniversary — the discount applies automatically.'
            : "You're registered. On your birthday and anniversary, a discount is applied automatically at checkout — online or in-store. Nothing else to do."}
        </p>
        <Link href="/" className="inline-block text-[12px] text-zinc-500 hover:text-zinc-800 underline">
          Return to the Atelier Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full space-y-6 relative z-10 p-8 border border-on-surface/5 bg-surface-dim/30 shadow-sm rounded-sm">
      <div className="text-center space-y-2">
        <span className="material-symbols-outlined text-[40px] text-gold-leaf">redeem</span>
        <h1 className="font-display text-[26px] font-semibold text-on-surface">Join the Circle</h1>
        <p className="font-body text-[13.5px] text-on-surface-variant leading-relaxed">
          A discount on us, every birthday and anniversary — online or in-store. Just tell us the dates.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">Full Name</label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">Email Address</label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">Phone Number <span className="text-zinc-400 normal-case font-normal">(optional)</span></label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">Birthday</label>
            <input
              type="date"
              name="birthday"
              value={form.birthday}
              onChange={handleChange}
              className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[13px] outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">Anniversary</label>
            <input
              type="date"
              name="anniversary"
              value={form.anniversary}
              onChange={handleChange}
              className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[13px] outline-none"
            />
          </div>
        </div>
        <p className="text-[10.5px] text-zinc-400">Leave either date blank if it doesn&apos;t apply — you&apos;ll still get the discount for whichever one you provide.</p>

        {result?.error && !result.alreadyRegistered && (
          <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-sm px-3 py-2">{result.error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#0D1B2A] text-white py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all rounded-sm shadow-md disabled:opacity-60"
        >
          {submitting ? 'Joining…' : 'Join the Circle'}
        </button>
      </form>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 py-20 bg-white relative">
        <div className="fixed inset-0 marble-overlay z-0"></div>
        <Suspense fallback={null}>
          <JoinForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
