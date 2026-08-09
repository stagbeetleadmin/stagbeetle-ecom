"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// Two-factor auth (Supabase TOTP) setup and management for the admin account.
// Enrollment happens here, from an already-authenticated session; the actual
// login-time challenge lives on the admin gate itself (see admin/page.tsx),
// driven by AuthContext's mfaPending flag.
export default function SecurityPanel() {
  const { getMfaFactors, enrollMfa, confirmMfaEnrollment, unenrollMfa } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);

  // Enrollment-in-progress state
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const [removing, setRemoving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshFactors = useCallback(async () => {
    const factors = await getMfaFactors();
    const verified = factors.find(f => f.status === 'verified');
    setVerifiedFactorId(verified?.id || null);
    setLoading(false);
    return factors;
  }, [getMfaFactors]);

  // .then() form (not a synchronous call to the async refreshFactors helper
  // above) — the setState calls only run once the promise settles, which the
  // React Compiler lint rule treats differently from a same-tick effect body call.
  useEffect(() => {
    getMfaFactors().then(factors => {
      const verified = factors.find(f => f.status === 'verified');
      setVerifiedFactorId(verified?.id || null);
      setLoading(false);
    });
  }, [getMfaFactors]);

  const startEnrollment = async () => {
    setStatusMsg(null);
    // Clean up any abandoned unverified factor from a previous attempt first,
    // so re-enrolling never piles up dead factors or hits a name collision.
    const existing = await getMfaFactors();
    for (const f of existing) {
      if (f.status !== 'verified') await unenrollMfa(f.id);
    }
    const res = await enrollMfa();
    if (res.error || !res.qrCode || !res.factorId) {
      setStatusMsg({ type: 'error', text: res.error || 'Could not start enrollment.' });
      return;
    }
    setQrCode(res.qrCode);
    setSecret(res.secret);
    setPendingFactorId(res.factorId);
    setEnrolling(true);
  };

  const cancelEnrollment = async () => {
    if (pendingFactorId) await unenrollMfa(pendingFactorId);
    setEnrolling(false);
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
      setEnrolling(false);
      setQrCode(null);
      setSecret(null);
      setPendingFactorId(null);
      setConfirmCode('');
      setStatusMsg({ type: 'success', text: 'Two-factor authentication is now on. You’ll be asked for a code like this every time you sign in.' });
      await refreshFactors();
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!verifiedFactorId) return;
    if (!confirm('Turn off two-factor authentication? Signing in will only require your password after this.')) return;
    setRemoving(true);
    try {
      const res = await unenrollMfa(verifiedFactorId);
      if (res.error) {
        setStatusMsg({ type: 'error', text: res.error });
        return;
      }
      setStatusMsg({ type: 'success', text: 'Two-factor authentication has been turned off.' });
      await refreshFactors();
    } finally {
      setRemoving(false);
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
        <p className="text-[13px] text-zinc-500">Protects the administrator account this dashboard is gated behind.</p>
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-sm border text-[13px] font-medium ${statusMsg.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {statusMsg.text}
        </div>
      )}

      <div className="border border-on-surface/10 rounded-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`material-symbols-outlined text-[22px] mt-0.5 ${verifiedFactorId ? 'text-green-600' : 'text-zinc-300'}`}>
              {verifiedFactorId ? 'verified_user' : 'gpp_maybe'}
            </span>
            <div>
              <p className="font-semibold text-[14px] text-on-surface">Two-Factor Authentication</p>
              <p className="text-[12.5px] text-zinc-500 mt-0.5">
                {verifiedFactorId
                  ? 'On — an authenticator app code is required every time you sign in.'
                  : 'Off — signing in only requires your password. Turning this on is strongly recommended.'}
              </p>
            </div>
          </div>
          {verifiedFactorId ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="shrink-0 text-[11px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider disabled:opacity-50"
            >
              {removing ? 'Removing…' : 'Turn Off'}
            </button>
          ) : !enrolling && (
            <button
              type="button"
              onClick={startEnrollment}
              className="shrink-0 bg-[#052A42] text-white text-[11px] font-bold px-3.5 py-2 rounded-sm hover:bg-[#052A42]/90 transition-colors uppercase tracking-wider"
            >
              Enable
            </button>
          )}
        </div>

        {enrolling && qrCode && (
          <div className="mt-5 pt-5 border-t border-on-surface/10 space-y-4">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="shrink-0 border border-on-surface/10 rounded-sm p-2 bg-white">
                {/* Supabase returns this as an SVG data URI — no QR library needed */}
                <img src={qrCode} alt="Scan with your authenticator app" width={140} height={140} />
              </div>
              <div className="space-y-2 text-[12.5px] text-zinc-500 flex-1">
                <p>1. Scan this code with an authenticator app (Google Authenticator, Authy, 1Password, etc).</p>
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
