"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// Two-factor auth (Supabase TOTP) setup and management for the admin
// account — which multiple staff across stores share, so this manages a
// LIST of devices (one per person), not a single on/off toggle. Each
// person enrolls their own named factor here; any one of them is enough
// to satisfy the login-time challenge (see admin/page.tsx, driven by
// AuthContext's mfaPending + mfaFactors).
export default function SecurityPanel() {
  const { getMfaFactors, enrollMfa, confirmMfaEnrollment, unenrollMfa } = useAuth();

  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<{ id: string; friendlyName?: string }[]>([]);

  // "Add a device" flow: name -> QR/secret -> confirm code
  const [addingDevice, setAddingDevice] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [nameError, setNameError] = useState('');
  const [starting, setStarting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshFactors = useCallback(async () => {
    const all = await getMfaFactors();
    setFactors(all.filter(f => f.status === 'verified').map(f => ({ id: f.id, friendlyName: f.friendlyName })));
  }, [getMfaFactors]);

  // .then() form (not a synchronous call to an async helper) — the setState
  // calls only run once the promise settles, which the React Compiler lint
  // rule treats differently from a same-tick effect body call.
  useEffect(() => {
    getMfaFactors().then(all => {
      setFactors(all.filter(f => f.status === 'verified').map(f => ({ id: f.id, friendlyName: f.friendlyName })));
      setLoading(false);
    });
  }, [getMfaFactors]);

  const openAddDevice = () => {
    setStatusMsg(null);
    setDeviceName('');
    setNameError('');
    setAddingDevice(true);
  };

  const startEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = deviceName.trim();
    if (!name) { setNameError('Give this device a name, e.g. "Amit — Store 1", so you know whose it is later.'); return; }
    setNameError('');
    setStarting(true);
    try {
      // Clean up any abandoned unverified attempt under this same name first
      // (never touches other people's already-verified devices).
      const existing = await getMfaFactors();
      for (const f of existing) {
        if (f.status !== 'verified' && f.friendlyName === name) await unenrollMfa(f.id);
      }
      const res = await enrollMfa(name);
      if (res.error || !res.qrCode || !res.factorId) {
        setNameError(res.error || 'Could not start enrollment.');
        return;
      }
      setQrCode(res.qrCode);
      setSecret(res.secret);
      setPendingFactorId(res.factorId);
    } finally {
      setStarting(false);
    }
  };

  const cancelEnrollment = async () => {
    if (pendingFactorId) await unenrollMfa(pendingFactorId);
    setAddingDevice(false);
    setDeviceName('');
    setQrCode(null);
    setSecret(null);
    setPendingFactorId(null);
    setConfirmCode('');
    setConfirmError('');
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFactorId) return;
    setConfirmError('');
    if (confirmCode.trim().length < 6) { setConfirmError('Enter the 6-digit code from your authenticator app.'); return; }
    setConfirmSubmitting(true);
    try {
      const res = await confirmMfaEnrollment(pendingFactorId, confirmCode.trim());
      if (res.error) {
        setConfirmError(res.error);
        return;
      }
      setAddingDevice(false);
      setDeviceName('');
      setQrCode(null);
      setSecret(null);
      setPendingFactorId(null);
      setConfirmCode('');
      setStatusMsg({ type: 'success', text: 'Device added. It’ll be asked for a code every time it signs in from now on.' });
      await refreshFactors();
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleRemove = async (factorId: string, name?: string) => {
    if (!confirm(`Remove "${name || 'this device'}"? It will no longer be able to complete sign-in.`)) return;
    setRemovingId(factorId);
    try {
      const res = await unenrollMfa(factorId);
      if (res.error) {
        setStatusMsg({ type: 'error', text: res.error });
        return;
      }
      setStatusMsg({ type: 'success', text: `Removed "${name || 'device'}".` });
      await refreshFactors();
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-leaf"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="font-display text-[20px] font-semibold text-on-surface mb-1">Security</h3>
        <p className="text-[13px] text-zinc-500">
          Protects the administrator account this dashboard is gated behind — shared across your stores, so each
          staff member should add their own device below rather than sharing one.
        </p>
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-sm border text-[13px] font-medium ${statusMsg.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {statusMsg.text}
        </div>
      )}

      <div className="border border-on-surface/10 rounded-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`material-symbols-outlined text-[22px] mt-0.5 ${factors.length > 0 ? 'text-green-600' : 'text-zinc-300'}`}>
              {factors.length > 0 ? 'verified_user' : 'gpp_maybe'}
            </span>
            <div>
              <p className="font-semibold text-[14px] text-on-surface">
                Two-Factor Authentication
                {factors.length > 0 && <span className="text-zinc-400 font-normal"> — {factors.length} device{factors.length > 1 ? 's' : ''}</span>}
              </p>
              <p className="text-[12.5px] text-zinc-500 mt-0.5">
                {factors.length > 0
                  ? 'On — a code is required at sign-in, from any one of the devices below.'
                  : 'Off — signing in only requires the password. Adding a device is strongly recommended.'}
              </p>
            </div>
          </div>
          {!addingDevice && (
            <button
              type="button"
              onClick={openAddDevice}
              className="shrink-0 bg-[#052A42] text-white text-[11px] font-bold px-3.5 py-2 rounded-sm hover:bg-[#052A42]/90 transition-colors uppercase tracking-wider"
            >
              + Add a Device
            </button>
          )}
        </div>

        {factors.length > 0 && (
          <ul className="divide-y divide-on-surface/10 border-t border-on-surface/10 -mx-5 px-5">
            {factors.map(f => (
              <li key={f.id} className="flex items-center justify-between py-2.5">
                <span className="text-[13px] text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-zinc-400">smartphone</span>
                  {f.friendlyName || 'Unnamed device'}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(f.id, f.friendlyName)}
                  disabled={removingId === f.id}
                  className="text-[10.5px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider disabled:opacity-50"
                >
                  {removingId === f.id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {addingDevice && !qrCode && (
          <form onSubmit={startEnrollment} className="pt-4 border-t border-on-surface/10 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-label-caps font-semibold text-zinc-400 uppercase tracking-widest block">
                WHOSE DEVICE IS THIS?
              </label>
              <input
                type="text"
                placeholder="e.g. Amit — Store 1"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                autoFocus
                className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
              />
              <p className="text-[11px] text-zinc-400">A name per person/store keeps this list readable once a few devices are added.</p>
            </div>
            {nameError && <p className="text-[11px] text-red-600 font-medium">{nameError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={starting}
                className="bg-primary text-white text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all uppercase tracking-wider disabled:opacity-50"
              >
                {starting ? 'Starting…' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={() => setAddingDevice(false)}
                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 uppercase tracking-wider px-1 py-2.5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {addingDevice && qrCode && (
          <div className="pt-4 border-t border-on-surface/10 space-y-4">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="shrink-0 border border-on-surface/10 rounded-sm p-2 bg-white">
                {/* Supabase returns this as an SVG data URI — no QR library needed */}
                <img src={qrCode} alt="Scan with your authenticator app" width={140} height={140} />
              </div>
              <div className="space-y-2 text-[12.5px] text-zinc-500 flex-1">
                <p>1. On <strong className="text-on-surface">{deviceName}</strong>, scan this with an authenticator app (Google Authenticator, Authy, 1Password, etc).</p>
                <p>2. Can&apos;t scan? Enter this key manually:</p>
                {secret && (
                  <code className="block bg-zinc-50 border border-zinc-200 rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-zinc-700 break-all">{secret}</code>
                )}
                <p>3. Enter the 6-digit code it generates below to activate.</p>
              </div>
            </div>

            <form onSubmit={handleConfirm} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-label-caps font-semibold text-zinc-400 uppercase tracking-widest block">CODE</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  className="w-36 bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-center text-[16px] tracking-[0.3em] outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={confirmSubmitting || confirmCode.length < 6}
                className="bg-primary text-white text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmSubmitting ? 'Confirming…' : 'Confirm & Activate'}
              </button>
              <button
                type="button"
                onClick={cancelEnrollment}
                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 uppercase tracking-wider px-1 py-2.5"
              >
                Cancel
              </button>
            </form>
            {confirmError && <p className="text-[11px] text-red-600 font-medium">{confirmError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
