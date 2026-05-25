"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, loginWithGoogle, loginWithEmailPhone, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'google' | 'phone'>('google');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');

  if (!isLoginModalOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setFormError('Please fill in all details.');
      return;
    }
    setFormError('');
    loginWithEmailPhone(name, email, phone);
  };

  const mockGoogleAccounts = [
    { name: "Amit Sharma", email: "amit.sharma@gmail.com", avatar: "AS" },
    { name: "Shubham Sahoo", email: "shubham.sahoo@stagbeetle.co.in", avatar: "SS" },
    { name: "Guest User", email: "guest@luxurysilhouette.com", avatar: "GU" }
  ];

  return (
    <div className="fixed inset-0 z-[250] overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-sm overflow-hidden shadow-2xl border border-on-surface/10 relative text-zinc-800 flex flex-col">
        
        {/* Luxury Top Header */}
        <div className="px-6 py-5 border-b border-on-surface/10 bg-surface-dim/40 flex justify-between items-center">
          <div>
            <span className="font-label-caps text-[9px] text-gold-leaf tracking-[0.3em] block mb-0.5">MEMBERSHIP ACCESS</span>
            <h3 className="font-display text-[20px] font-semibold text-on-surface">Enter the Atelier</h3>
          </div>
          <button 
            onClick={closeLoginModal}
            className="material-symbols-outlined text-[20px] text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            close
          </button>
        </div>

        {/* Loading Spinner Overlaid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-leaf"></div>
            <p className="text-[12px] font-label-caps tracking-widest text-zinc-500 font-semibold">Authorizing Session...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Tabs */}
            <div className="flex border-b border-zinc-100 text-[12px] font-label-caps tracking-wider font-bold">
              <button
                onClick={() => setActiveTab('google')}
                className={`flex-1 pb-3 text-center border-b-2 transition-all ${
                  activeTab === 'google' 
                    ? 'border-gold-leaf text-on-surface' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                GOOGLE ACCOUNT
              </button>
              <button
                onClick={() => setActiveTab('phone')}
                className={`flex-1 pb-3 text-center border-b-2 transition-all ${
                  activeTab === 'phone' 
                    ? 'border-gold-leaf text-on-surface' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                EMAIL & PHONE
              </button>
            </div>

            {/* Google Chooser Tab */}
            {activeTab === 'google' && (
              <div className="space-y-4">
                <p className="text-[12px] text-zinc-500 font-body leading-relaxed text-center">
                  Sign in instantly using a Google account to retrieve your order logs and saved shipping details.
                </p>

                <div className="space-y-2.5">
                  {mockGoogleAccounts.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => loginWithGoogle(account)}
                      className="w-full flex items-center justify-between p-3.5 bg-surface-dim hover:bg-gold-leaf/5 border border-on-surface/10 hover:border-gold-leaf/30 rounded-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary text-white font-bold text-[13px] tracking-wider rounded-full flex items-center justify-center group-hover:bg-gold-leaf group-hover:text-obsidian-charcoal transition-all">
                          {account.avatar}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-zinc-800">{account.name}</p>
                          <p className="text-[11px] text-zinc-400 font-mono">{account.email}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-zinc-300 group-hover:text-gold-leaf transition-colors">
                        arrow_forward_ios
                      </span>
                    </button>
                  ))}
                </div>

                <div className="text-center pt-2">
                  <p className="text-[10px] text-zinc-400 italic">
                    Auth requests are secured by G-Suite OAuth services.
                  </p>
                </div>
              </div>
            )}

            {/* Email & Phone Tab */}
            {activeTab === 'phone' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <p className="text-[12px] text-zinc-500 font-body leading-relaxed">
                  Enter your contact coordinates. We will link your orders and address settings directly to this identity.
                </p>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-label-caps font-semibold text-zinc-400">FULL NAME</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Amit Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[13px] outline-none text-on-surface"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-label-caps font-semibold text-zinc-400">EMAIL ADDRESS</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. amit@example.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[13px] outline-none text-on-surface"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-label-caps font-semibold text-zinc-400">PHONE NUMBER</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[13px] outline-none text-on-surface"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-[11px] text-red-600 font-medium">{formError}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3 font-label-caps text-label-caps tracking-[0.2em] font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-sm mt-3"
                >
                  VERIFY & REGISTER
                </button>
              </form>
            )}

          </div>
        )}

        {/* Security Seal */}
        <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 flex justify-between items-center text-[10px] text-zinc-400 font-semibold tracking-wider">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-green-600">lock</span> SECURED ACCESS
          </span>
          <span>128-BIT ENCRYPTION</span>
        </div>

      </div>
    </div>
  );
}
