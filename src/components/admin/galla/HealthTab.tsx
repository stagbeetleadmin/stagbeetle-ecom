"use client";

import React, { useMemo, useState } from 'react';
import type { StockHealthReport, StockHealthStatus } from '@/lib/gallaStockPull';
import { FilterChip, StockFixActions, downloadCsv, fmtTime, smallButton } from './shared';

// Health & Sync tab: every size, worst problems first, with inline fixes.

export const STATUS_META: Record<StockHealthStatus, { label: string; hint: string; className: string }> = {
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

export const ISSUE_STATUSES: StockHealthStatus[] = ['not_in_galla_open', 'mismatch', 'untracked', 'not_in_galla'];
type Filter = 'issues' | 'all' | StockHealthStatus;

export default function HealthTab({ report, loading, onChanged, onViewLogs }: {
  report: StockHealthReport | null;
  loading: boolean;
  onChanged: (msg: string) => void;
  onViewLogs: (codes: string[]) => void;
}) {
  const [filter, setFilter] = useState<Filter>('issues');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    return report.rows.filter(r =>
      (filter === 'all' || (filter === 'issues' ? ISSUE_STATUSES.includes(r.status) : r.status === filter)) &&
      (!q || r.sku.toLowerCase().includes(q) || r.product_title.toLowerCase().includes(q) || (r.galla_sku ?? '').toLowerCase().includes(q)));
  }, [report, filter, query]);

  const issues = report ? ISSUE_STATUSES.reduce((n, s) => n + report.counts[s], 0) : 0;
  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: 'issues', label: 'All issues', count: issues },
    ...ISSUE_STATUSES.map(s => ({ key: s as Filter, label: STATUS_META[s].label, count: report?.counts[s] })),
    { key: 'in_sync', label: 'In sync', count: report?.counts.in_sync },
    { key: 'all', label: 'All sizes', count: report?.rows.length },
  ];

  const exportCsv = () => report && downloadCsv(
    `galla-stock-check-${report.checked_at.slice(0, 16).replace(/[:T]/g, '-')}.csv`,
    ['Product', 'Size', 'SKU', 'Galla barcode', 'Site qty', 'Galla qty', 'Status', 'Last synced', 'Possible Galla barcodes'],
    report.rows.map(r => [
      r.product_title, r.size, r.sku, r.galla_sku, r.site_qty ?? 'unlimited (no count)', r.galla_qty ?? 'not in Galla',
      STATUS_META[r.status].label, r.last_synced_at ?? '', r.suggestions.join(' '),
    ]),
  );

  return (
    <section className="border border-on-surface/5 bg-white rounded-sm p-4 md:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}{f.count !== undefined && <span className="opacity-70"> · {f.count}</span>}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product, SKU or barcode"
            className="w-full lg:w-64 border border-on-surface/15 rounded-sm px-3 py-2 text-[12.5px]" />
          <button type="button" onClick={exportCsv} disabled={!report} className={`${smallButton} shrink-0 inline-flex items-center gap-1 py-2`}>
            <span className="material-symbols-outlined text-[15px]">download</span> CSV
          </button>
        </div>
      </div>

      {filter !== 'all' && filter !== 'issues' && <p className="text-[12px] text-on-surface-variant">{STATUS_META[filter].hint}</p>}

      {!report ? (
        <p className="text-[13px] text-zinc-400 py-8 text-center">{loading ? 'Comparing every size with Galla…' : 'No report loaded.'}</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-green-700 py-8 text-center">Nothing here — every size in this view is fine.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-[12.5px] min-w-[960px]">
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
                  <td className="py-2.5 px-2 max-w-[240px] font-semibold text-on-surface">{r.product_title || '—'}</td>
                  <td className="py-2.5 px-2">{r.size}</td>
                  <td className="py-2.5 px-2 font-mono text-[11.5px]">
                    <div>{r.sku}</div>
                    <div className="text-on-surface-variant">{r.galla_sku ?? '—'}</div>
                    {r.suggestions.length > 0 && <div className="text-[10.5px] text-amber-700 mt-0.5">Galla has: {r.suggestions.join(', ')}</div>}
                  </td>
                  <td className="py-2.5 px-2 text-right font-semibold">{r.site_qty ?? <span className="text-red-700" title="No count — sells as unlimited">∞</span>}</td>
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
                    <div className="flex flex-col gap-1.5 items-start">
                      {r.status !== 'in_sync' && (
                        <StockFixActions
                          key={`${r.variant_id}-${r.site_qty}-${r.galla_sku}`}
                          target={{ key: r.variant_id, product_id: r.product_id, product_sku: r.product_sku, size: r.size, sku: r.sku, site_qty: r.site_qty, suggestions: r.suggestions, inGalla: r.galla_qty !== null }}
                          onDone={onChanged}
                        />
                      )}
                      <button type="button" onClick={() => onViewLogs([r.sku, r.galla_sku].filter((c): c is string => !!c))} className={smallButton}>LOGS</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
