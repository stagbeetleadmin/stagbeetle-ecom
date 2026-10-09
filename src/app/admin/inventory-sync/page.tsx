"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { setInventoryManual, setGallaSkuForVariant } from '@/lib/db';
import type { StockHealthReport, StockHealthRow, StockHealthStatus, PullResult } from '@/lib/gallaStockPull';

// Stock health check against Galla: every size on the site next to Galla's
// live count, a "Sync now" button (same pull as the daily cron), and inline
// fixes for the sizes a sync can't fix on its own. Backed by /api/admin/galla-sync.

interface Activity {
  last_galla_push: { at: string; status: string; sku: string | null } | null;
  last_pull: { at: string; changed: number } | null;
  rejected_last_24h: number;
  last_rejected_at: string | null;
}

const STATUS_META: Record<StockHealthStatus, { label: string; hint: string; className: string }> = {
  not_in_galla_open: {
    label: 'Unlimited — not in Galla',
    hint: 'Galla has no item with this barcode and the site has no count, so this size can be ordered without limit. Set a count or fix the barcode.',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  mismatch: {
    label: 'Out of sync',
    hint: 'Site count differs from Galla. "Sync from Galla now" fixes it.',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  untracked: {
    label: 'Not synced yet',
    hint: 'In Galla, but no count on the site yet (sells as unlimited). "Sync from Galla now" fixes it.',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  not_in_galla: {
    label: 'Manual only',
    hint: 'Not in Galla, so its hand-entered count is never synced. Fix the barcode if Galla does stock it.',
    className: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  },
  in_sync: {
    label: 'In sync',
    hint: 'Site count equals Galla.',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
};

const ISSUE_STATUSES: StockHealthStatus[] = ['not_in_galla_open', 'mismatch', 'untracked', 'not_in_galla'];
type Filter = 'issues' | 'all' | StockHealthStatus;

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function StatCard({ label, value, sub, tone = 'neutral' }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'neutral' | 'good' | 'bad' }) {
  const toneClass = tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-green-700' : 'text-on-surface';
  return (
    <div className="border border-on-surface/5 bg-white rounded-sm p-4 min-w-0">
      <span className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.2em] block">{label}</span>
      <p className={`text-[15px] font-semibold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-[11.5px] text-on-surface-variant mt-0.5 leading-relaxed">{sub}</p>}
    </div>
  );
}

function RowActions({ row, onDone }: { row: StockHealthRow; onDone: (msg: string) => void }) {
  const [qty, setQty] = useState(row.site_qty?.toString() ?? '');
  const [barcode, setBarcode] = useState(row.suggestions[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notInGalla = row.status === 'not_in_galla_open' || row.status === 'not_in_galla';

  const saveQty = async () => {
    const n = parseInt(qty, 10);
    if (!Number.isFinite(n) || n < 0) { setError('Enter 0 or more'); return; }
    setBusy(true); setError('');
    const saved = await setInventoryManual(row.product_id, row.product_sku, row.size, n);
    setBusy(false);
    if (!saved) { setError('Save failed'); return; }
    onDone(`${row.sku}: stock set to ${n}${notInGalla ? '' : ' (the next Galla sync will overwrite this with Galla\'s count)'}`);
  };

  const saveBarcode = async () => {
    if (!barcode.trim()) return;
    setBusy(true); setError('');
    const saved = await setGallaSkuForVariant(row.product_id, row.product_sku, row.size, barcode.trim().toUpperCase());
    setBusy(false);
    if (!saved) { setError('Save failed'); return; }
    onDone(`${row.sku}: Galla barcode set to ${barcode.trim().toUpperCase()} — run "Sync from Galla now" to pull its count`);
  };

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <div className="flex gap-1.5">
        <input
          type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty"
          className="w-16 border border-on-surface/15 rounded-sm px-2 py-1 text-[12px]"
          aria-label={`Stock for ${row.sku}`}
        />
        <button type="button" disabled={busy} onClick={saveQty}
          className="px-2.5 py-1 text-[10px] font-label-caps tracking-wider font-semibold border border-on-surface/15 rounded-sm hover:border-primary hover:text-primary disabled:opacity-50">
          SET STOCK
        </button>
      </div>
      {notInGalla && (
        <div className="flex gap-1.5">
          <input
            list={`sugg-${row.variant_id}`} value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Galla barcode"
            className="w-28 border border-on-surface/15 rounded-sm px-2 py-1 text-[12px] font-mono"
            aria-label={`Galla barcode for ${row.sku}`}
          />
          <datalist id={`sugg-${row.variant_id}`}>
            {row.suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
          <button type="button" disabled={busy || !barcode.trim()} onClick={saveBarcode}
            className="px-2.5 py-1 text-[10px] font-label-caps tracking-wider font-semibold border border-on-surface/15 rounded-sm hover:border-primary hover:text-primary disabled:opacity-50">
            SET BARCODE
          </button>
        </div>
      )}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

export default function AdminInventorySyncPage() {
  const { isAdmin } = useAuth();
  const [report, setReport] = useState<StockHealthReport | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastSync, setLastSync] = useState<PullResult | null>(null);
  const [filter, setFilter] = useState<Filter>('issues');
  const [query, setQuery] = useState('');

  const fetchReport = useCallback(() =>
    fetch('/api/admin/galla-sync', { cache: 'no-store' })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        setReport(body.report); setActivity(body.activity); setError('');
      })
      .catch(e => setError(`Could not load the stock check: ${errorMessage(e)}`))
      .finally(() => setLoading(false)), []);

  const load = () => { setLoading(true); setError(''); return fetchReport(); };

  useEffect(() => { if (isAdmin) fetchReport(); }, [isAdmin, fetchReport]);

  const syncNow = async () => {
    if (!window.confirm('Pull current stock from Galla and overwrite the site\'s count for every size Galla stocks?')) return;
    setSyncing(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/admin/galla-sync', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setLastSync(body.result); setReport(body.report); setActivity(body.activity);
    } catch (e) {
      setError(`Sync failed: ${errorMessage(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const rows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    return report.rows.filter(r =>
      (filter === 'all' || (filter === 'issues' ? ISSUE_STATUSES.includes(r.status) : r.status === filter)) &&
      (!q || r.sku.toLowerCase().includes(q) || r.product_title.toLowerCase().includes(q) || (r.galla_sku ?? '').toLowerCase().includes(q)));
  }, [report, filter, query]);

  const downloadCsv = () => {
    if (!report) return;
    const header = ['Product', 'Size', 'SKU', 'Galla barcode', 'Site qty', 'Galla qty', 'Status', 'Last synced', 'Possible Galla barcodes'];
    const lines = report.rows.map(r => [
      r.product_title, r.size, r.sku, r.galla_sku, r.site_qty ?? 'unlimited (no count)', r.galla_qty ?? 'not in Galla',
      STATUS_META[r.status].label, r.last_synced_at ?? '', r.suggestions.join(' '),
    ].map(csvCell).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `galla-stock-check-${report.checked_at.slice(0, 16).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24 text-center px-6">
        <div className="max-w-sm space-y-4">
          <span className="material-symbols-outlined text-[40px] text-gold-leaf">lock</span>
          <h1 className="font-display text-[22px] font-semibold text-on-surface">Admin Access Required</h1>
          <Link href="/admin" className="inline-block bg-primary text-white px-6 py-3 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all">
            GO TO ADMIN SIGN IN
          </Link>
        </div>
      </div>
    );
  }

  const issues = report ? ISSUE_STATUSES.reduce((n, s) => n + report.counts[s], 0) : 0;
  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: 'issues', label: 'All issues', count: issues },
    ...ISSUE_STATUSES.map(s => ({ key: s as Filter, label: STATUS_META[s].label, count: report?.counts[s] })),
    { key: 'in_sync', label: 'In sync', count: report?.counts.in_sync },
    { key: 'all', label: 'All sizes', count: report?.rows.length },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-on-surface/10 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">INVENTORY · GALLA</span>
          <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Stock Sync &amp; Health Check</h1>
          <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Every size on the site next to Galla&apos;s live count for our store location. Galla pushes each change automatically,
            and a full sync also runs daily at 3:00 AM. Use &ldquo;Sync from Galla now&rdquo; to sync immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button type="button" onClick={load} disabled={loading || syncing}
            className="px-4 py-3 text-[11px] font-label-caps tracking-widest font-semibold border border-on-surface/15 rounded-sm hover:border-primary hover:text-primary disabled:opacity-50">
            {loading ? 'CHECKING…' : 'RE-CHECK'}
          </button>
          <button type="button" onClick={syncNow} disabled={syncing || loading}
            className="px-5 py-3 text-[11px] font-label-caps tracking-widest font-semibold bg-primary text-white rounded-sm hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all disabled:opacity-50 inline-flex items-center gap-2">
            <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>sync</span>
            {syncing ? 'SYNCING…' : 'SYNC FROM GALLA NOW'}
          </button>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 text-red-700 text-[13px] rounded-sm p-4">{error}</div>}
      {notice && <div className="border border-green-200 bg-green-50 text-green-800 text-[13px] rounded-sm p-4">{notice}</div>}
      {lastSync && (
        <div className="border border-green-200 bg-green-50 text-green-900 text-[13px] rounded-sm p-4 space-y-1">
          <p className="font-semibold">
            Sync complete — {lastSync.applied.length} size(s) updated, {lastSync.unchanged} already correct
            {lastSync.failed.length > 0 && <span className="text-red-700">, {lastSync.failed.length} failed</span>}
            {lastSync.skipped_recent_local_change.length > 0 && `, ${lastSync.skipped_recent_local_change.length} skipped (sold online in the last few minutes — Galla may not have caught up yet)`}.
          </p>
          {lastSync.applied.length > 0 && (
            <p className="text-[12px] leading-relaxed">{lastSync.applied.map(c => `${c.sku} ${c.before ?? '—'}→${c.after}`).join(' · ')}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="SIZES NEEDING ATTENTION"
          value={report ? issues : '…'}
          tone={report ? (issues ? 'bad' : 'good') : 'neutral'}
          sub={report ? `of ${report.rows.length} sizes · checked ${fmtTime(report.checked_at)}` : undefined}
        />
        <StatCard
          label="LAST UPDATE PUSHED BY GALLA"
          value={activity?.last_galla_push ? fmtTime(activity.last_galla_push.at) : activity ? 'None yet' : '…'}
          sub={activity?.last_galla_push ? `${activity.last_galla_push.sku ?? ''} · ${activity.last_galla_push.status}` : 'Galla sends these after each store sale or stock change'}
        />
        <StatCard
          label="REJECTED GALLA CALLS (24H)"
          value={activity ? activity.rejected_last_24h : '…'}
          tone={activity ? (activity.rejected_last_24h ? 'bad' : 'good') : 'neutral'}
          sub={activity?.rejected_last_24h ? `Last ${fmtTime(activity.last_rejected_at)} — check the API key in Galla matches INVENTORY_SYNC_API_KEY` : 'Wrong API key shows up here'}
        />
        <StatCard
          label="LAST FULL SYNC"
          value={activity?.last_pull ? fmtTime(activity.last_pull.at) : activity ? 'None logged' : '…'}
          sub={activity?.last_pull ? `${activity.last_pull.changed} size(s) changed` : 'Logged only when something changed'}
        />
      </div>

      <section className="border border-on-surface/5 bg-white rounded-sm p-4 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filters.map(f => (
              <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all ${
                  filter === f.key ? 'bg-primary text-white border-primary' : 'border-on-surface/15 text-on-surface-variant hover:border-primary hover:text-primary'
                }`}>
                {f.label}{f.count !== undefined && <span className="opacity-70"> · {f.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product, SKU or barcode"
              className="w-full lg:w-64 border border-on-surface/15 rounded-sm px-3 py-2 text-[12.5px]" />
            <button type="button" onClick={downloadCsv} disabled={!report}
              className="shrink-0 px-3 py-2 text-[10px] font-label-caps tracking-wider font-semibold border border-on-surface/15 rounded-sm hover:border-primary hover:text-primary disabled:opacity-50 inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">download</span> CSV
            </button>
          </div>
        </div>

        {filter !== 'all' && filter !== 'issues' && (
          <p className="text-[12px] text-on-surface-variant">{STATUS_META[filter].hint}</p>
        )}

        {!report ? (
          <p className="text-[13px] text-zinc-400 py-8 text-center">{loading ? 'Comparing every size with Galla…' : 'No report loaded.'}</p>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-green-700 py-8 text-center">Nothing here — every size in this view is fine.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-[12.5px] min-w-[900px]">
              <thead>
                <tr className="text-left text-[10px] font-label-caps tracking-wider text-on-surface-variant border-b border-on-surface/10">
                  <th className="py-2 px-2">PRODUCT</th>
                  <th className="py-2 px-2">SIZE</th>
                  <th className="py-2 px-2">SKU / GALLA BARCODE</th>
                  <th className="py-2 px-2 text-right">SITE</th>
                  <th className="py-2 px-2 text-right">GALLA</th>
                  <th className="py-2 px-2">STATUS</th>
                  <th className="py-2 px-2">FIX</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.variant_id} className="border-b border-on-surface/5 align-top">
                    <td className="py-2.5 px-2 max-w-[240px]">
                      <span className="font-semibold text-on-surface">{r.product_title || '—'}</span>
                    </td>
                    <td className="py-2.5 px-2">{r.size}</td>
                    <td className="py-2.5 px-2 font-mono text-[11.5px]">
                      <div>{r.sku}</div>
                      <div className="text-on-surface-variant">{r.galla_sku ?? '—'}</div>
                      {r.suggestions.length > 0 && (
                        <div className="text-[10.5px] text-amber-700 mt-0.5">Galla has: {r.suggestions.join(', ')}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold">{r.site_qty ?? <span className="text-red-700">∞</span>}</td>
                    <td className="py-2.5 px-2 text-right">
                      {r.galla_qty === null ? <span className="text-zinc-400">—</span> : r.galla_qty}
                      {r.galla_qty !== null && r.galla_qty < 0 && <div className="text-[10px] text-zinc-500">shown as 0</div>}
                    </td>
                    <td className="py-2.5 px-2">
                      <span title={STATUS_META[r.status].hint}
                        className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_META[r.status].className}`}>
                        {STATUS_META[r.status].label}
                      </span>
                      {r.last_synced_at && <div className="text-[10.5px] text-zinc-400 mt-1">{fmtTime(r.last_synced_at)}</div>}
                    </td>
                    <td className="py-2.5 px-2">
                      {r.status === 'in_sync' ? <span className="text-zinc-300">—</span> : (
                        <RowActions key={`${r.variant_id}-${r.site_qty}-${r.galla_sku}`} row={r} onDone={msg => { setNotice(msg); load(); }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
