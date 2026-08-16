"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { registerMember } from '@/lib/db';

// Public, no-login signup for the birthday/anniversary discount program.
// Reachable two ways: a shopper browsing the site, or an in-store QR code
// (printed with ?src=store so we can tell the two apart — see `source` on
// the member record). No password is created here — this is a lightweight
// membership record, not a website login; someone who also wants to log in
// and shop can create a full account separately with the same email.
//
// Split-screen landing layout on purpose: this page's whole job is to
// convert a scan/visit into a signup, so it's designed to read in one
// glance on desktop (brand + perks left, form right, both filling the
// viewport) rather than a long scroll of stacked sections. On mobile the
// two halves stack, with the pitch kept short so the form is reachable
// almost immediately.
function Perk({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="material-symbols-outlined text-gold-leaf text-[20px] shrink-0 mt-0.5">{icon}</span>
      <span className="text-[13.5px] text-white/80 leading-relaxed">
        <strong className="text-white font-semibold">{title}</strong> — {children}
      </span>
    </li>
  );
}

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
      <div className="w-full max-w-[400px] text-center space-y-4">
        <span className="material-symbols-outlined text-[52px] text-gold-leaf">celebration</span>
        <h2 className="font-display text-[24px] sm:text-[26px] font-semibold text-on-surface leading-tight">
          {result.alreadyRegistered ? "You're already one of us" : "Welcome to the Circle"}
        </h2>
        <p className="font-body text-[14px] text-on-surface-variant leading-relaxed">
          {result.alreadyRegistered
            ? 'This email is already registered. Just show up (or check out) on your birthday or anniversary — the discount applies automatically.'
            : "You're registered. On your birthday and anniversary, a discount is applied automatically at checkout — online or in-store. Nothing else to do."}
        </p>
        <Link href="/" className="inline-block text-[12px] text-zinc-500 hover:text-zinc-800 underline pt-2">
          Return to the Atelier Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] space-y-5">
      <div className="space-y-1.5 lg:hidden">
        <span className="font-label-caps text-[10px] tracking-[0.35em] text-gold-leaf">STAGBEETLE CIRCLE</span>
        <h1 className="font-display text-[26px] font-semibold text-on-surface leading-tight">A Gift, Every Year — On Us</h1>
        <p className="text-[13px] text-on-surface-variant leading-relaxed">A discount on your birthday and anniversary, automatically. No card, no app.</p>
      </div>
      <div className="hidden lg:block space-y-1">
        <span className="font-label-caps text-[10px] tracking-[0.35em] text-gold-leaf">JOIN IN 30 SECONDS</span>
        <h2 className="font-display text-[22px] font-semibold text-on-surface">Tell us the dates</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">Full Name</label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none transition-colors"
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
            className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">
            Phone Number <span className="text-zinc-400 normal-case font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none transition-colors"
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
              className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-2.5 text-[12.5px] outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">Anniversary</label>
            <input
              type="date"
              name="anniversary"
              value={form.anniversary}
              onChange={handleChange}
              className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-2.5 text-[12.5px] outline-none transition-colors"
            />
          </div>
        </div>
        <p className="text-[10.5px] text-zinc-400 !mt-2">Leave either date blank if it doesn&apos;t apply — you&apos;ll still get the discount for whichever one you provide.</p>

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
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-2">
        {/* Left — brand & perks. Fills the viewport on desktop; a short,
            single-glance pitch on mobile so the form starts right after it. */}
        <div className="relative bg-[#0D1B2A] text-white px-6 sm:px-10 lg:px-14 py-10 sm:py-14 lg:py-0 flex items-center overflow-hidden">
          <div className="absolute inset-0 marble-overlay opacity-[0.06] pointer-events-none"></div>
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold-leaf/10 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-[420px] mx-auto lg:mx-0 space-y-6 py-2">
            <span className="hidden lg:block font-label-caps text-[11px] tracking-[0.4em] text-gold-leaf">STAGBEETLE CIRCLE</span>
            <h1 className="hidden lg:block font-display text-[38px] xl:text-[44px] font-semibold leading-[1.08]">
              A Gift, Every Year — On Us
            </h1>
            <p className="hidden lg:block text-[14.5px] text-white/70 leading-relaxed">
              Join once. Get a discount automatically on your birthday and your anniversary — online or walking into any of our stores. No card to carry, nothing to remember.
            </p>
            <ul className="space-y-4 pt-1">
              <Perk icon="cake" title="Birthday discount">applied automatically at checkout, no code needed</Perk>
              <Perk icon="favorite" title="Anniversary discount">the same, every single year</Perk>
              <Perk icon="storefront" title="Online and in-store">just your email or phone number does it</Perk>
            </ul>
          </div>
        </div>

        {/* Right — the form itself */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:py-12 lg:py-16 bg-white">
          <Suspense fallback={null}>
            <JoinForm />
          </Suspense>
        </div>
      </main>
      <footer className="py-5 text-center text-[11px] text-zinc-400 border-t border-zinc-100 shrink-0">
        <Link href="/" className="underline hover:text-zinc-600">Return to the Atelier Homepage</Link>
      </footer>
    </div>
  );
}
