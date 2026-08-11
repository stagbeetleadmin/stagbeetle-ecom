"use client";

import React, { useState, useEffect } from 'react';
import { InventoryRecord, getInventoryForProduct, setInventoryManual, setGallaSkuForVariant } from '@/lib/db';

interface InventoryPanelProps {
  productId: string;
  productSku: string;
  sizes: string[];
}

const SOURCE_LABEL: Record<InventoryRecord['sync_source'], string> = {
  external_pos: 'Synced from Galla',
  manual_admin: 'Set manually',
  order_deduction: 'Adjusted by an order',
};

// Per-size stock editor shown inside the product edit modal. Reads live from
// `inventory` (the same table /api/inventory/sync and checkout write to), so
// this is always the current count — not a separate admin-only number.
export default function InventoryPanel({ productId, productSku, sizes }: InventoryPanelProps) {
  const [records, setRecords] = useState<Record<string, InventoryRecord>>({});
  const [loading, setLoading] = useState(true);
  const [savingSize, setSavingSize] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [gallaSkuDrafts, setGallaSkuDrafts] = useState<Record<string, string>>({});
  const [savingGallaSkuSize, setSavingGallaSkuSize] = useState<string | null>(null);

  // Fetched once per product (the "Save" handler below updates `records`
  // directly from its own response, so no re-fetch is needed after a save).
  // `loading` starts true via its initial state above rather than being set
  // here, so this effect never calls setState outside the fetch's own callback.
  useEffect(() => {
    let cancelled = false;
    getInventoryForProduct(productId).then(list => {
      if (cancelled) return;
      const bySize: Record<string, InventoryRecord> = {};
      list.forEach(r => { bySize[r.size] = r; });
      setRecords(bySize);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [productId]);

  const handleSave = async (size: string) => {
    const draft = drafts[size];
    if (draft === undefined || draft === '') return;
    const qty = Math.max(0, Math.floor(Number(draft)));
    if (Number.isNaN(qty)) return;

    setSavingSize(size);
    const updated = await setInventoryManual(productId, productSku, size, qty);
    if (updated) {
      setRecords(prev => ({ ...prev, [size]: updated }));
      setDrafts(prev => { const next = { ...prev }; delete next[size]; return next; });
    }
    setSavingSize(null);
  };

  const handleSaveGallaSku = async (size: string) => {
    const draft = gallaSkuDrafts[size];
    if (draft === undefined) return;

    setSavingGallaSkuSize(size);
    const updated = await setGallaSkuForVariant(productId, productSku, size, draft);
    if (updated) {
      setRecords(prev => ({ ...prev, [size]: updated }));
      setGallaSkuDrafts(prev => { const next = { ...prev }; delete next[size]; return next; });
    }
    setSavingGallaSkuSize(null);
  };

  if (sizes.length === 0) {
    return <p className="text-[12px] text-zinc-400 italic">Select at least one size above to track stock.</p>;
  }

  return (
    <div className="border border-zinc-200 rounded-sm divide-y divide-zinc-100 bg-white">
      {loading ? (
        <div className="p-4 text-center text-[12px] text-zinc-400">Loading stock levels…</div>
      ) : (
        sizes.map(size => {
          const record = records[size];
          const draftValue = drafts[size] ?? (record ? String(record.quantity_available) : '');
          const isSaving = savingSize === size;
          const isOut = record && record.quantity_available === 0;
          const isLow = record && record.quantity_available > 0 && record.quantity_available <= record.low_stock_threshold;
          const gallaSkuDraftValue = gallaSkuDrafts[size] ?? (record?.galla_sku || '');
          const isSavingGallaSku = savingGallaSkuSize === size;

          return (
            <div key={size} className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-[12px] font-bold text-zinc-700">{size}</span>

                <input
                  type="number"
                  min={0}
                  value={draftValue}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [size]: e.target.value }))}
                  placeholder="Not set"
                  className={`w-20 bg-surface-dim border rounded-sm py-1.5 px-2 text-[12px] outline-none ${
                    isOut ? 'border-red-300' : isLow ? 'border-amber-300' : 'border-on-surface/15'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => handleSave(size)}
                  disabled={isSaving || drafts[size] === undefined}
                  className="text-[10px] font-label-caps font-bold text-primary hover:underline uppercase tracking-wider disabled:opacity-30 disabled:no-underline shrink-0"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>

                <span className="flex-1 text-right text-[10px] text-zinc-400">
                  {record ? (
                    <>
                      {SOURCE_LABEL[record.sync_source]}
                      {isOut && <span className="ml-1.5 font-bold text-red-600 uppercase">· Out of stock</span>}
                      {isLow && <span className="ml-1.5 font-bold text-amber-600 uppercase">· Low</span>}
                    </>
                  ) : (
                    'Not tracked yet — sale not blocked'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3 pl-[52px]">
                <span className="text-[9.5px] font-label-caps font-semibold text-zinc-400 uppercase tracking-wider shrink-0">Galla SKU</span>
                <input
                  type="text"
                  value={gallaSkuDraftValue}
                  onChange={(e) => setGallaSkuDrafts(prev => ({ ...prev, [size]: e.target.value }))}
                  placeholder="e.g. 10056"
                  className="w-28 bg-surface-dim border border-on-surface/15 rounded-sm py-1 px-2 text-[11px] font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveGallaSku(size)}
                  disabled={isSavingGallaSku || gallaSkuDrafts[size] === undefined}
                  className="text-[10px] font-label-caps font-bold text-primary hover:underline uppercase tracking-wider disabled:opacity-30 disabled:no-underline shrink-0"
                >
                  {isSavingGallaSku ? 'Saving…' : 'Save'}
                </button>
                {!record?.galla_sku && (
                  <span className="text-[10px] text-amber-600">Not set — this size won&apos;t sync to Galla after a sale</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
