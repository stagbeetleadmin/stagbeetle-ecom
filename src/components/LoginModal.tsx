"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, loginWithGoogle, loginWithEmailPhone, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<'google' | 'email'>('google');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');

  if (!isLoginModalOpen) return null;

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setFormError('Please fill in all fields.');
      return;
    }
    setFormError('');
    loginWithEmailPhone(name, email, phone);
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) closeLoginModal(); }}
    >
      <div className="bg-white w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#FCFAF6]">
          <div>
            <p className="text-[9px] font-bold tracking-[0.35em] text-[#C5A059] uppercase mb-0.5">Membership Access</p>
            <h3 className="text-[20px] font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              Sign In
            </h3>
          </div>
          <button onClick={closeLoginModal} className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Close">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] font-semibold tracking-widest text-gray-400 uppercase">Signing you in…</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(['google', 'email'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 pb-3 text-[11px] font-bold tracking-wider uppercase transition-all border-b-2 ${
                    activeTab === tab
                      ? 'border-[#C5A059] text-gray-900'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  {tab === 'google' ? 'Google' : 'Email & Phone'}
                </button>
              ))}
            </div>

            {/* ── Google Tab ── */}
            {activeTab === 'google' && (
              <div className="space-y-4">
                <p className="text-[13px] text-gray-500 leading-relaxed text-center">
                  Sign in with your Google account. Your profile and order history will be saved automatically.
                </p>

                <button
                  onClick={loginWithGoogle}
                  className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 py-3 px-4 transition-all group"
                >
                  {/* Google G logo */}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900">
                    Continue with Google
                  </span>
                </button>

                <p className="text-[10px] text-gray-400 text-center">
                  You will be redirected to Google to complete sign-in securely.
                </p>
              </div>
            )}

            {/* ── Email & Phone Tab ── */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Enter your details to save your cart and shipping address across sessions.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Full Name</label>
                    <input type="text" required placeholder="Amit Kumar"
                      value={name} onChange={e => setName(e.target.value)}
                      className="w-full border border-gray-200 focus:border-[#C5A059] outline-none py-2.5 px-3 text-[13px] text-gray-800 placeholder:text-gray-300 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Email Address</label>
                    <input type="email" required placeholder="amit@example.in"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-200 focus:border-[#C5A059] outline-none py-2.5 px-3 text-[13px] text-gray-800 placeholder:text-gray-300 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Phone Number</label>
                    <input type="tel" required placeholder="+91 98765 43210"
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full border border-gray-200 focus:border-[#C5A059] outline-none py-2.5 px-3 text-[13px] text-gray-800 placeholder:text-gray-300 transition-colors"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-[12px] text-red-500 font-medium">{formError}</p>
                )}

                <button type="submit"
                  className="w-full bg-[#0D1B2A] text-white py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#C5A059] transition-colors">
                  Continue
                </button>
              </form>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center justify-between text-[10px] text-gray-400 font-semibold tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px] text-green-500">lock</span>
            Secured by Supabase Auth
          </span>
          <span>256-bit TLS</span>
        </div>

      </div>
    </div>
  );
}
