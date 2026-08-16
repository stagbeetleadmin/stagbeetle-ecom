"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Logo from './Logo';

export default function LoginModal() {
  const { 
    isLoginModalOpen, 
    closeLoginModal, 
    loginWithGoogle, 
    loginWithEmailPhone,
    loginWithEmailPassword,
    registerWithEmailPassword
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'guest'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    await loginWithGoogle();
    // If OAuth redirect happens, page navigates away.
    // If it fails, reset the spinner.
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setAuthLoading(true);

    try {
      if (activeTab === 'signin') {
        if (!email.trim() || !password.trim()) {
          setFormError('Please enter both email and password.');
          setAuthLoading(false);
          return;
        }
        if (email.trim().toLowerCase() === 'stagbeetlebilling@gmail.com') {
          setFormError('Admin accounts cannot log in here. Please use the administrative portal.');
          setAuthLoading(false);
          return;
        }
        const res = await loginWithEmailPassword(email.trim(), password.trim());
        if (res.error) {
          setFormError(res.error);
        }
      } else if (activeTab === 'signup') {
        if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
          setFormError('Please fill in all fields.');
          setAuthLoading(false);
          return;
        }
        if (email.trim().toLowerCase() === 'stagbeetlebilling@gmail.com') {
          setFormError('Admin accounts cannot be registered.');
          setAuthLoading(false);
          return;
        }
        const res = await registerWithEmailPassword(
          name.trim(),
          email.trim(),
          password.trim(),
          phone.trim()
        );
        if (res.error) {
          setFormError(res.error);
        }
      } else if (activeTab === 'guest') {
        if (!name.trim() || !email.trim() || !phone.trim()) {
          setFormError('Please fill in all fields.');
          setAuthLoading(false);
          return;
        }
        if (email.trim().toLowerCase() === 'stagbeetlebilling@gmail.com') {
          setFormError('Admin email cannot be used for guest checkout.');
          setAuthLoading(false);
          return;
        }
        const res = await loginWithEmailPhone(name.trim(), email.trim(), phone.trim());
        if (res.error) {
          setFormError(res.error);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) closeLoginModal(); }}
    >
      <div className="bg-white w-full max-w-sm shadow-2xl flex flex-col overflow-hidden rounded-sm text-zinc-800">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start">
          <div className="flex flex-col items-start">
            <Logo className="h-8 w-auto text-[#0D1B2A] mb-2" showText={true} />
            <h3 className="text-[22px] font-bold text-gray-900 leading-tight">
              Sign in to your account
            </h3>
          </div>
          <button
            onClick={closeLoginModal}
            className="mt-1 text-gray-400 hover:text-gray-700 transition-colors animate-float"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">

          {/* ── Google Button ── */}
          <button
            onClick={handleGoogleClick}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:border-gray-500 bg-white hover:bg-gray-50 py-3 px-4 rounded-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              /* Official Google G SVG */
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            <span className="text-[13px] font-semibold text-gray-700">
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Tab toggle ── */}
          <div className="flex rounded-sm border border-gray-200 overflow-hidden text-[10px] font-bold uppercase tracking-wider">
            <button
              onClick={() => { setActiveTab('signin'); setFormError(''); }}
              className={`flex-1 py-2.5 transition-colors ${
                activeTab === 'signin'
                  ? 'bg-[#0D1B2A] text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setFormError(''); }}
              className={`flex-1 py-2.5 border-l border-r border-gray-200 transition-colors ${
                activeTab === 'signup'
                  ? 'bg-[#0D1B2A] text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => { setActiveTab('guest'); setFormError(''); }}
              className={`flex-1 py-2.5 transition-colors ${
                activeTab === 'guest'
                  ? 'bg-[#0D1B2A] text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Guest
            </button>
          </div>

          {/* ── Auth Form ── */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Full Name field (signup and guest) */}
            {(activeTab === 'signup' || activeTab === 'guest') && (
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Eleanor Vance"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 focus:border-[#C5A059] outline-none py-2 px-3 text-[13px] text-gray-800 placeholder:text-gray-300 transition-colors rounded-sm"
                />
              </div>
            )}

            {/* Email Address field (all tabs) */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="eleanor@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 focus:border-[#C5A059] outline-none py-2 px-3 text-[13px] text-gray-800 placeholder:text-gray-300 transition-colors rounded-sm"
              />
            </div>

            {/* Password field (signin and signup) */}
            {(activeTab === 'signin' || activeTab === 'signup') && (
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-200 focus:border-[#C5A059] outline-none py-2 pl-3 pr-9 text-[13px] text-gray-800 placeholder:text-gray-300 transition-colors rounded-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(o => !o)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Phone Number field (signup and guest) */}
            {(activeTab === 'signup' || activeTab === 'guest') && (
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-200 focus:border-[#C5A059] outline-none py-2 px-3 text-[13px] text-gray-800 placeholder:text-gray-300 transition-colors rounded-sm"
                />
              </div>
            )}

            {formError && (
              <p className="text-[11px] text-red-500 font-medium leading-relaxed">{formError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#0D1B2A] text-white py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#C5A059] transition-colors rounded-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {authLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {authLoading ? 'Verifying…' : activeTab === 'signin' ? 'Sign In' : activeTab === 'signup' ? 'Create Account' : 'Continue as Guest'}
            </button>
          </form>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-600">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
            <span className="material-symbols-outlined text-[13px] text-green-500">lock</span>
            Secured by Supabase Auth
          </span>
          <span className="text-[10px] text-gray-400 font-medium">256-bit TLS</span>
        </div>

      </div>
    </div>
  );
}
