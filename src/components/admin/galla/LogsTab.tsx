"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { SYNC_LOG_TYPE_LABELS, type SyncLogEntry, type SyncLogType } from '@/lib/gallaSyncLog';
import { FilterChip, errorMessage, fmtTime, smallButton } from './shared';

// Sync Logs tab: every Galla push, rejected call, full sync, CSV import and
// online order sent to Galla, newest first — filterable down to one size.

const TYPE_TONE: Record<SyncLogType, string> = {
  galla_push: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  pull: 'bg-violet-50 text-violet-700 border-violet-200',
  csv: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  order: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  other: 'bg-zinc-50 text-zinc-600 border-zinc-200',
};

const TYPES: ('all' | SyncLogType)[] = ['all', 'galla_push', 'rejected', 'pull', 'order', 'csv'];
const DAY_OPTIONS = [1, 7, 30, 90];

export default function LogsTab({ codes, onCodesChange, refreshKey }: {
  codes: string[];
  onCodesChange: (codes: string[]) => void;
  refreshKey: number;
}) {
  const [type, setType] = useState<'all' | SyncLogType>('all');
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(codes.join(', '));
  const [entries, setEntries] = useState<SyncLogEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(() => {
    const params = new URLSearchParams({ type, days: String(days), page: String(page) });
    if (problemsOnly) params.set('problems', '1');
    if (codes.length) params.set('codes', codes.join(','));
    return fetch(`/api/admin/galla-sync/logs?${params}`, { cache: 'no-store' })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        setEntries(body.entries); setTotal(body.total); setPageSize(body.page_size); setError('');
      })
      .catch(e => setError(`Could not load logs: ${errorMessage(e)}`))
      .finally(() => setLoading(false));
  }, [type, days, page, problemsOnly, codes]);

  useEffect(() => { fetchLogs(); }, [fetchLogs, refreshKey]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setPage(0);
    onCodesChange(search.split(/[,\s]+/).map(s => s.trim()).filter(Boolean));
  };
  const changeFilter = (fn: () => void) => { setLoading(true); setPage(0); fn(); };
  const toggle = (id: string) => setOpen(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="border border-on-surface/5 bg-white rounded-sm p-4 md:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => (
            <FilterChip key={t} active={type === t} onClick={() => changeFilter(() => setType(t))}>
              {t === 'all' ? 'Everything' : SYNC_LOG_TYPE_LABELS[t]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[12px] text-on-surface">
            <input type="checkbox" checked={problemsOnly} onChange={e => changeFilter(() => setProblemsOnly(e.target.checked))} />
            Problems only
          </label>
          <select value={days} onChange={e => changeFilter(() => setDays(Number(e.target.value)))}
            className="border border-on-surface/15 rounded-sm px-2 py-1.5 text-[12px]" aria-label="Time range">
            {DAY_OPTIONS.map(d => <option key={d} value={d}>{d === 1 ? 'Last 24 hours' : `Last ${d} days`}</option>)}
          </select>
        </div>
      </div>

      <form onSubmit={applySearch} className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SKU or Galla barcode, e.g. SHIRT-M-M or WINGSF.SM"
          className="flex-1 border border-on-surface/15 rounded-sm px-3 py-2 text-[12.5px] font-mono" />
        <button type="submit" className={`${smallButton} py-2`}>SEARCH</button>
        {codes.length > 0 && (
          <button type="button" className={`${smallButton} py-2`} onClick={() => { setSearch(''); setLoading(true); setPage(0); onCodesChange([]); }}>CLEAR</button>
        )}
      </form>

      {codes.length > 0 && <p className="text-[12px] text-on-surface-variant">Showing entries about <span className="font-mono">{codes.join(', ')}</span>. Rejected Galla calls carry no SKU, so they only appear without a search.</p>}
      {error && <div className="border border-red-200 bg-red-50 text-red-700 text-[13px] rounded-sm p-3">{error}</div>}

      {loading && !entries ? (
        <p className="text-[13px] text-zinc-400 py-8 text-center">Loading logs…</p>
      ) : entries && entries.length === 0 ? (
        <p className="text-[13px] text-on-surface-variant py-8 text-center">No log entries match these filters.</p>
      ) : (
        <ul className={`divide-y divide-on-surface/5 ${loading ? 'opacity-60' : ''}`}>
          {entries?.map(e => (
            <li key={e.id} className="py-3 flex gap-3">
              <span className={`material-symbols-outlined text-[18px] mt-0.5 ${e.ok ? 'text-green-600' : 'text-red-600'}`}>{e.ok ? 'check_circle' : 'error'}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_TONE[e.type]}`}>{SYNC_LOG_TYPE_LABELS[e.type]}</span>
                  <span className="text-[11px] text-on-surface-variant">{fmtTime(e.at)}</span>
                  <span className={`text-[10.5px] font-mono ${e.ok ? 'text-on-surface-variant' : 'text-red-700'}`}>{e.status}</span>
                </div>
                <p className="text-[12.5px] text-on-surface break-words">{e.summary}</p>
                {e.detail && <p className="text-[12px] text-red-700 break-words">{e.detail}</p>}
                <button type="button" onClick={() => toggle(e.id)} className="text-[11px] text-on-surface-variant underline">
                  {open.has(e.id) ? 'Hide raw data' : 'Raw data'}
                </button>
                {open.has(e.id) && (
                  <pre className="bg-[#0D1B2A] text-[#dfe6ec] text-[11px] leading-relaxed rounded-sm p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-72">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
          <span>{total} entries · page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0 || loading} onClick={() => { setLoading(true); setPage(p => p - 1); }} className={smallButton}>NEWER</button>
            <button type="button" disabled={page + 1 >= pages || loading} onClick={() => { setLoading(true); setPage(p => p + 1); }} className={smallButton}>OLDER</button>
          </div>
        </div>
      )}
    </section>
  );
}
