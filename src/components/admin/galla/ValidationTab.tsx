"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { VALIDATION_CHECKS, type CheckResult, type ValidationCheckKey } from '@/lib/gallaChecks';
import type { ValidationProduct, ValidationSizeRow } from '@/lib/gallaStockPull';
import { FilterChip, StockFixActions, downloadCsv, errorMessage, fmtTime, smallButton } from './shared';

// Validation checklist tab: every product, every size, a ✓/✗ per stock rule
// (rules and their meaning live in VALIDATION_CHECKS), with inline fixes.

const ICON: Record<CheckResult, { symbol: string; className: string; label: string }> = {
  pass: { symbol: 'check_circle', className: 'text-green-600', label: 'Pass' },
  fail: { symbol: 'cancel', className: 'text-red-600', label: 'Fail' },
  warn: { symbol: 'error', className: 'text-amber-500', label: 'Warning' },
  na: { symbol: 'remove', className: 'text-zinc-300', label: 'Not applicable' },
};

const hasFail = (r: ValidationSizeRow) => Object.values(r.checks).includes('fail');

type Filter = 'issues' | 'all' | ValidationCheckKey;

export default function ValidationTab({ refreshKey, onChanged, onViewLogs }: {
  refreshKey: number;
  onChanged: (msg: string) => void;
  onViewLogs: (codes: string[]) => void;
}) {
  const [products, setProducts] = useState<ValidationProduct[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('issues');
  const [query, setQuery] = useState('');
  const [toggled, setToggled] = useState<Set<string>>(new Set()); // products expanded/collapsed against their default
  const [showGuide, setShowGuide] = useState(false);

  const fetchValidation = useCallback(() =>
    fetch('/api/admin/galla-sync/validation', { cache: 'no-store' })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        setProducts(body.products); setCheckedAt(body.checked_at); setError('');
      })
      .catch(e => setError(`Could not run the validation: ${errorMessage(e)}`))
      .finally(() => setLoading(false)), []);

  useEffect(() => { fetchValidation(); }, [fetchValidation, refreshKey]);

  const failingCount = useMemo(() => {
    const counts = Object.fromEntries(VALIDATION_CHECKS.map(c => [c.key, 0])) as Record<ValidationCheckKey, number>;
    for (const p of products ?? []) for (const s of p.sizes) for (const c of VALIDATION_CHECKS) if (s.checks[c.key] === 'fail' || s.checks[c.key] === 'warn') counts[c.key]++;
    return counts;
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(p =>
      (filter === 'all'
        || (filter === 'issues' ? p.failures + p.warnings > 0 : p.sizes.some(s => s.checks[filter] === 'fail' || s.checks[filter] === 'warn'))) &&
      (!q || p.title.toLowerCase().includes(q) || p.product_sku.toLowerCase().includes(q)
        || p.sizes.some(s => s.sku.toLowerCase().includes(q) || (s.galla_sku ?? '').toLowerCase().includes(q))));
  }, [products, filter, query]);

  const totals = useMemo(() => {
    const all = (products ?? []).flatMap(p => p.sizes);
    return { products: products?.length ?? 0, withIssues: (products ?? []).filter(p => p.failures > 0).length, sizes: all.length, failing: all.filter(hasFail).length };
  }, [products]);

  const isOpen = (p: ValidationProduct) => (p.failures + p.warnings > 0) !== toggled.has(p.product_id);
  const toggle = (id: string) => setToggled(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const exportCsv = () => products && downloadCsv(
    `galla-validation-${(checkedAt ?? '').slice(0, 16).replace(/[:T]/g, '-')}.csv`,
    ['Product', 'Product SKU', 'Size', 'SKU', 'Galla barcode', 'Site qty', 'Galla qty', ...VALIDATION_CHECKS.map(c => c.label), 'Sync errors (7d)', 'Problems'],
    products.flatMap(p => p.sizes.map(s => [
      p.title, p.product_sku, s.size, s.sku, s.galla_sku, s.site_qty ?? 'unlimited (no count)', s.galla_qty ?? 'not in Galla',
      ...VALIDATION_CHECKS.map(c => ICON[s.checks[c.key]].label), s.error_count,
      VALIDATION_CHECKS.filter(c => s.checks[c.key] === 'fail' || s.checks[c.key] === 'warn').map(c => c.fail).join(' | '),
    ])),
  );

  return (
    <section className="border border-on-surface/5 bg-white rounded-sm p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-on-surface">
            {products
              ? <><strong className={totals.withIssues ? 'text-red-700' : 'text-green-700'}>{totals.withIssues} of {totals.products} products</strong> have a failing size ({totals.failing} of {totals.sizes} sizes).</>
              : loading ? 'Validating every product…' : '—'}
          </p>
          {checkedAt && <p className="text-[11.5px] text-on-surface-variant">Checked {fmtTime(checkedAt)} against Galla&apos;s live stock</p>}
        </div>
        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product, SKU or barcode"
            className="w-full md:w-64 border border-on-surface/15 rounded-sm px-3 py-2 text-[12.5px]" />
          <button type="button" onClick={exportCsv} disabled={!products} className={`${smallButton} shrink-0 inline-flex items-center gap-1 py-2`}>
            <span className="material-symbols-outlined text-[15px]">download</span> CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === 'issues'} onClick={() => setFilter('issues')}>Products with issues</FilterChip>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All products · {totals.products}</FilterChip>
        {VALIDATION_CHECKS.filter(c => failingCount[c.key] > 0).map(c => (
          <FilterChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)}>
            ✗ {c.label} · {failingCount[c.key]}
          </FilterChip>
        ))}
      </div>

      <div className="border border-on-surface/10 rounded-sm">
        <button type="button" onClick={() => setShowGuide(v => !v)} className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-semibold text-on-surface">
          <span>What each check means</span>
          <span className="material-symbols-outlined text-[18px]">{showGuide ? 'expand_less' : 'expand_more'}</span>
        </button>
        {showGuide && (
          <ul className="px-3 pb-3 space-y-1 text-[12px] text-on-surface-variant">
            {VALIDATION_CHECKS.map(c => <li key={c.key}><strong className="text-on-surface">{c.label}:</strong> fails when — {c.fail}</li>)}
            <li className="pt-1 flex flex-wrap gap-3">
              {(['pass', 'fail', 'warn', 'na'] as CheckResult[]).map(r => (
                <span key={r} className="inline-flex items-center gap-1"><span className={`material-symbols-outlined text-[16px] ${ICON[r].className}`}>{ICON[r].symbol}</span>{ICON[r].label}</span>
              ))}
            </li>
          </ul>
        )}
      </div>

      {error && <div className="border border-red-200 bg-red-50 text-red-700 text-[13px] rounded-sm p-3">{error}</div>}

      {products && visible.length === 0 && <p className="text-[13px] text-green-700 py-8 text-center">Nothing here — every product in this view passes.</p>}

      <div className="space-y-3">
        {visible.map(p => (
          <div key={p.product_id} className={`border rounded-sm ${p.failures ? 'border-red-200' : p.warnings ? 'border-amber-200' : 'border-on-surface/10'}`}>
            <button type="button" onClick={() => toggle(p.product_id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left ${p.failures ? 'bg-red-50/60' : p.warnings ? 'bg-amber-50/50' : ''}`}>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-on-surface truncate">{p.title}</p>
                <p className="text-[11px] font-mono text-on-surface-variant">{p.product_sku} · {p.sizes.length} size(s)</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${
                  p.failures ? 'bg-red-50 text-red-700 border-red-200' : p.warnings ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {p.failures ? `${p.failures} size(s) failing` : p.warnings ? `${p.warnings} warning(s)` : 'All checks pass'}
                </span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{isOpen(p) ? 'expand_less' : 'expand_more'}</span>
              </div>
            </button>

            {isOpen(p) && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] min-w-[1100px]">
                  <thead>
                    <tr className="text-left text-[9.5px] font-label-caps tracking-wider text-on-surface-variant border-y border-on-surface/10">
                      <th className="py-2 px-2">SIZE</th>
                      <th className="py-2 px-2">SKU / BARCODE</th>
                      <th className="py-2 px-2 text-right">SITE</th>
                      <th className="py-2 px-2 text-right">GALLA</th>
                      {VALIDATION_CHECKS.map(c => <th key={c.key} className="py-2 px-1 text-center" title={c.fail}>{c.label.toUpperCase()}</th>)}
                      <th className="py-2 px-2">FIX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.sizes.map(s => (
                      <tr key={s.variant_id ?? `new-${s.size}`} className={`border-b border-on-surface/5 align-top ${hasFail(s) ? 'bg-red-50/30' : ''}`}>
                        <td className="py-2 px-2 font-semibold">{s.size}</td>
                        <td className="py-2 px-2 font-mono text-[11px]">
                          <div>{s.sku}</div>
                          <div className="text-on-surface-variant">{s.galla_sku ?? '—'}</div>
                          {s.suggestions.length > 0 && <div className="text-[10.5px] text-amber-700">Galla has: {s.suggestions.join(', ')}</div>}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold">{s.site_qty ?? <span className="text-red-700" title="No count — sells as unlimited">∞</span>}</td>
                        <td className="py-2 px-2 text-right">{s.galla_qty ?? <span className="text-zinc-400">—</span>}</td>
                        {VALIDATION_CHECKS.map(c => {
                          const r = s.checks[c.key];
                          const why = r === 'fail' || r === 'warn' ? c.fail + (c.key === 'no_errors' ? ` (${s.error_count})` : '') : ICON[r].label;
                          return (
                            <td key={c.key} className="py-2 px-1 text-center" title={`${c.label}: ${why}`}>
                              <span className={`material-symbols-outlined text-[18px] ${ICON[r].className}`} aria-label={`${c.label}: ${ICON[r].label}`}>{ICON[r].symbol}</span>
                            </td>
                          );
                        })}
                        <td className="py-2 px-2">
                          <div className="flex flex-col gap-1.5 items-start">
                            {(hasFail(s) || Object.values(s.checks).includes('warn')) && (
                              <>
                                <ul className="text-[10.5px] text-red-700 space-y-0.5 max-w-[260px]">
                                  {VALIDATION_CHECKS.filter(c => s.checks[c.key] === 'fail' || s.checks[c.key] === 'warn').map(c => (
                                    <li key={c.key} className={s.checks[c.key] === 'warn' ? 'text-amber-700' : ''}>• {c.fail}</li>
                                  ))}
                                </ul>
                                <StockFixActions
                                  key={`${s.variant_id}-${s.site_qty}-${s.galla_sku}`}
                                  target={{ key: s.variant_id ?? `${p.product_id}-${s.size}`, product_id: p.product_id, product_sku: p.product_sku, size: s.size, sku: s.sku, site_qty: s.site_qty, suggestions: s.suggestions, inGalla: s.galla_qty !== null }}
                                  onDone={onChanged}
                                />
                              </>
                            )}
                            <button type="button" onClick={() => onViewLogs([s.sku, s.galla_sku].filter((c): c is string => !!c))} className={smallButton}>LOGS</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
