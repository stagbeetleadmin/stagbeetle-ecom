"use client";

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { StockHealthReport, PullResult } from '@/lib/gallaStockPull';
import HealthTab, { ISSUE_STATUSES } from '@/components/admin/galla/HealthTab';
import ValidationTab from '@/components/admin/galla/ValidationTab';
import LogsTab from '@/components/admin/galla/LogsTab';
import { adminFetch, errorMessage, fmtTime } from '@/components/admin/galla/shared';

// Galla stock control centre: "Sync from Galla now" plus three views —
//   Health & Sync  every size vs Galla's live count, worst first
//   Validation     every product × size against each stock rule (checklist)
//   Sync logs      what Galla pushed, what was rejected, what each sync changed
// The tab and log search live in the URL (?tab=logs&codes=SKU,BARCODE), so a
// size's "Logs" button and a shared link land on the same view.

interface Activity {
  last_galla_push: { at: string; status: string; sku: string | null } | null;
  last_pull: { at: string; changed: number } | null;
  rejected_last_24h: number;
  last_rejected_at: string | null;
}

type Tab = 'health' | 'validation' | 'logs';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'health', label: 'Health & Sync', icon: 'monitor_heart' },
  { key: 'validation', label: 'Validation checklist', icon: 'checklist' },
  { key: 'logs', label: 'Sync logs', icon: 'history' },
];

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

function InventorySyncInner() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab = tabParam === 'validation' || tabParam === 'logs' ? tabParam : 'health';
  const codes = (searchParams.get('codes') || '').split(',').filter(Boolean);

  const [report, setReport] = useState<StockHealthReport | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastSync, setLastSync] = useState<PullResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // bumps Validation/Logs after a sync or fix

  const navigate = (next: Tab, nextCodes: string[] = []) => {
    const params = new URLSearchParams();
    if (next !== 'health') params.set('tab', next);
    if (nextCodes.length) params.set('codes', nextCodes.join(','));
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
  };

  const fetchReport = useCallback(() =>
    adminFetch('/api/admin/galla-sync')
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        setReport(body.report); setActivity(body.activity); setError('');
      })
      .catch(e => setError(`Could not load the stock check: ${errorMessage(e)}`))
      .finally(() => setLoading(false)), []);

  useEffect(() => { if (isAdmin) fetchReport(); }, [isAdmin, fetchReport]);

  const recheck = () => { setLoading(true); setError(''); setRefreshKey(k => k + 1); return fetchReport(); };
  const onChanged = (msg: string) => { setNotice(msg); recheck(); };

  const syncNow = async () => {
    if (!window.confirm('Pull current stock from Galla and overwrite the site\'s count for every size Galla stocks?')) return;
    setSyncing(true); setError(''); setNotice('');
    try {
      const res = await adminFetch('/api/admin/galla-sync', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setLastSync(body.result); setReport(body.report); setActivity(body.activity);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setError(`Sync failed: ${errorMessage(e)}`);
    } finally {
      setSyncing(false);
    }
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

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-on-surface/10 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">INVENTORY · GALLA</span>
          <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Stock Sync &amp; Health Check</h1>
          <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Every size on the site against Galla&apos;s live count for our store location. Galla pushes each change automatically,
            and a full sync also runs daily at 3:00 AM. Use &ldquo;Sync from Galla now&rdquo; to sync immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button type="button" onClick={recheck} disabled={loading || syncing}
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
          sub={activity?.rejected_last_24h
            ? <>Last {fmtTime(activity.last_rejected_at)} — <button type="button" className="underline" onClick={() => navigate('logs')}>see why</button></>
            : 'A wrong API key in Galla shows up here'}
        />
        <StatCard
          label="LAST FULL SYNC"
          value={activity?.last_pull ? fmtTime(activity.last_pull.at) : activity ? 'None logged' : '…'}
          sub={activity?.last_pull ? `${activity.last_pull.changed} size(s) changed` : 'Logged only when something changed'}
        />
      </div>

      <div className="flex gap-1 border-b border-on-surface/10 overflow-x-auto" role="tablist">
        {TABS.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => navigate(t.key)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}>
            <span className="material-symbols-outlined text-[17px]">{t.icon}</span>
            {t.label}
            {t.key === 'health' && report && issues > 0 && <span className="ml-1 text-[10px] bg-red-600 text-white rounded-full px-1.5">{issues}</span>}
          </button>
        ))}
      </div>

      {tab === 'health' && <HealthTab report={report} loading={loading} onChanged={onChanged} onViewLogs={c => navigate('logs', c)} />}
      {tab === 'validation' && <ValidationTab refreshKey={refreshKey} onChanged={onChanged} onViewLogs={c => navigate('logs', c)} />}
      {tab === 'logs' && <LogsTab key={codes.join(',')} codes={codes} refreshKey={refreshKey} onCodesChange={c => navigate('logs', c)} />}
    </div>
  );
}

export default function AdminInventorySyncPage() {
  return (
    <Suspense fallback={null}>
      <InventorySyncInner />
    </Suspense>
  );
}
