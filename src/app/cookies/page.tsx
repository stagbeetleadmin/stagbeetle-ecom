"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

const cookieCategories = [
  {
    id: 'essential',
    name: 'Essential Cookies',
    description: 'These cookies are necessary for the website to function and cannot be switched off. They are set in response to actions you take, such as logging in or adding items to your cart.',
    required: true,
  },
  {
    id: 'analytics',
    name: 'Analytics Cookies',
    description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. All information collected is aggregated and anonymous.',
    required: false,
  },
  {
    id: 'marketing',
    name: 'Marketing Cookies',
    description: 'These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant adverts on other sites.',
    required: false,
  },
  {
    id: 'personalisation',
    name: 'Personalisation Cookies',
    description: 'These cookies enable the website to provide enhanced functionality and personalisation, such as remembering your size preferences and recently viewed products.',
    required: false,
  },
];

export default function CookiesPage() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    essential: true,
    analytics: true,
    marketing: false,
    personalisation: true,
  });
  const [saved, setSaved] = useState(false);

  const handleToggle = (id: string) => {
    if (id === 'essential') return;
    setPreferences(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const handleSave = () => {
    // In a real implementation, persist to localStorage/cookie
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_cookie_prefs', JSON.stringify(preferences));
    }
    setSaved(true);
  };

  const handleAcceptAll = () => {
    const all = Object.fromEntries(cookieCategories.map(c => [c.id, true]));
    setPreferences(all);
    setSaved(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">COOKIE PREFERENCES</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">LEGAL</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-4 leading-tight">Cookie Preferences</h1>
          <p className="font-body text-[14px] text-on-surface-variant mb-12 leading-relaxed max-w-2xl">
            We use cookies to enhance your experience, analyse site performance, and personalise content. You can manage your preferences below. For more information, see our{' '}
            <Link href="/privacy" className="text-gold-leaf hover:underline">Privacy Policy</Link>.
          </p>

          <div className="space-y-4 mb-10">
            {cookieCategories.map((category) => (
              <div key={category.id} className="border border-on-surface/8 p-6 flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-body text-[15px] font-semibold text-on-surface">{category.name}</h3>
                    {category.required && (
                      <span className="font-label-caps text-[8px] tracking-widest text-on-surface-variant/50 border border-on-surface/10 px-2 py-0.5">ALWAYS ON</span>
                    )}
                  </div>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed">{category.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(category.id)}
                  disabled={category.required}
                  aria-label={`Toggle ${category.name}`}
                  className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gold-leaf/50 ${
                    preferences[category.id]
                      ? 'bg-gold-leaf'
                      : 'bg-on-surface/15'
                  } ${category.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                      preferences[category.id] ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSave}
              className="bg-primary text-white px-10 py-4 font-label-caps text-[11px] tracking-[0.2em] hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all font-semibold"
            >
              SAVE PREFERENCES
            </button>
            <button
              onClick={handleAcceptAll}
              className="border border-primary/20 text-primary px-10 py-4 font-label-caps text-[11px] tracking-[0.2em] hover:bg-primary/5 transition-all"
            >
              ACCEPT ALL
            </button>
          </div>

          {saved && (
            <p className="mt-6 text-[13px] text-gold-leaf font-semibold animate-fade-in">
              ✓ Your preferences have been saved.
            </p>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
