"use client";

import React, { useState } from 'react';
import { supabase, setInventoryManual, setGallaSkuForVariant } from '@/lib/db';

// Shared bits for the /admin/inventory-sync tabs.

// fetch() for the /api/admin/* routes: attaches the signed-in admin's access
// token, since the session lives in localStorage, not a cookie (see adminAuth.ts).
export const adminFetch = async (url: string, init: RequestInit = {}) => {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(url, { cache: 'no-store', ...init, headers });
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadCsv = (filename: string, header: string[], rows: unknown[][]) => {
  const blob = new Blob([[header, ...rows].map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const smallButton =
  'px-2.5 py-1 text-[10px] font-label-caps tracking-wider font-semibold border border-on-surface/15 rounded-sm hover:border-primary hover:text-primary disabled:opacity-50';

export interface FixTarget {
  key: string; // unique per row, for the datalist id
  product_id: string;
  product_sku: string;
  size: string;
  sku: string;
  site_qty: number | null;
  suggestions: string[];
  inGalla: boolean;
}

// Inline manual fixes: set a size's stock count, and (for sizes Galla doesn't
// recognise) set its Galla barcode. Uses the admin's own session, like the
// stock panel on the product form.
export function StockFixActions({ target, onDone }: { target: FixTarget; onDone: (msg: string) => void }) {
  const [qty, setQty] = useState(target.site_qty?.toString() ?? '');
  const [barcode, setBarcode] = useState(target.suggestions[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saveQty = async () => {
    const n = parseInt(qty, 10);
    if (!Number.isFinite(n) || n < 0) { setError('Enter 0 or more'); return; }
    setBusy(true); setError('');
    const saved = await setInventoryManual(target.product_id, target.product_sku, target.size, n);
    setBusy(false);
    if (!saved) { setError('Save failed'); return; }
    onDone(`${target.sku}: stock set to ${n}${target.inGalla ? ' (the next Galla sync will replace it with Galla\'s count)' : ''}`);
  };

  const saveBarcode = async () => {
    const code = barcode.trim().toUpperCase();
    if (!code) return;
    setBusy(true); setError('');
    const saved = await setGallaSkuForVariant(target.product_id, target.product_sku, target.size, code);
    setBusy(false);
    if (!saved) { setError('Save failed'); return; }
    onDone(`${target.sku}: Galla barcode set to ${code} — run "Sync from Galla now" to pull its count`);
  };

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <div className="flex gap-1.5">
        <input
          type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty"
          className="w-16 border border-on-surface/15 rounded-sm px-2 py-1 text-[12px]"
          aria-label={`Stock for ${target.sku}`}
        />
        <button type="button" disabled={busy} onClick={saveQty} className={smallButton}>SET STOCK</button>
      </div>
      {!target.inGalla && (
        <div className="flex gap-1.5">
          <input
            list={`sugg-${target.key}`} value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Galla barcode"
            className="w-28 border border-on-surface/15 rounded-sm px-2 py-1 text-[12px] font-mono"
            aria-label={`Galla barcode for ${target.sku}`}
          />
          <datalist id={`sugg-${target.key}`}>
            {target.suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
          <button type="button" disabled={busy || !barcode.trim()} onClick={saveBarcode} className={smallButton}>SET BARCODE</button>
        </div>
      )}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all ${
        active ? 'bg-primary text-white border-primary' : 'border-on-surface/15 text-on-surface-variant hover:border-primary hover:text-primary'
      }`}>
      {children}
    </button>
  );
}
