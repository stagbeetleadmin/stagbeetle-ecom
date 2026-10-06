"use client";

import React, { useState, useEffect } from 'react';
import { InventoryRecord, getInventoryForProduct, setInventoryManual, setGallaSkuForVariant } from '@/lib/db';
import { variantSkuFor, gallaBarcodeFor } from '@/lib/gallaBarcode';

// Unsaved edits for one size. undefined = untouched.
export interface StockDraft {
  qty?: string;
  barcode?: string; // '' = reset to the auto barcode
}
export type StockDrafts = Record<string, StockDraft>;

interface InventoryPanelProps {
  // null while adding a new garment: nothing exists to save against yet.
  // Either way, unsaved edits are reported through onDraftsChange so the
  // product form's own save can apply them (applyStockDrafts).
  productId: string | null;
  productSku: string;
  sizes: string[];
  // The product's SKU as last saved. If the form's SKU differs, saving stock
  // here would rename the sizes before the product itself is saved — so the
  // panel's own save waits for the product's.
  savedProductSku?: string;
  onDraftsChange?: (drafts: StockDrafts) => void;
}

const SOURCE_LABEL: Record<InventoryRecord['sync_source'], string> = {
  external_pos: 'Synced from Galla',
  manual_admin: 'Set manually',
  order_deduction: 'Adjusted by an order',
};

const parseQty = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === '') return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const hasEdits = (draft: StockDraft | undefined) =>
  !!draft && (parseQty(draft.qty) !== null || draft.barcode !== undefined);

// Writes every edited size: barcode first (it may create the variant), then
// stock. Sizes with nothing edited are left alone. Used by the panel's own
// "Save stock" and by the add-garment form right after the product is created.
export const applyStockDrafts = async (
  productId: string,
  productSku: string,
  drafts: StockDrafts,
): Promise<{ saved: InventoryRecord[]; failed: string[] }> => {
  const saved: InventoryRecord[] = [];
  const failed: string[] = [];
  for (const [size, draft] of Object.entries(drafts)) {
    if (!hasEdits(draft)) continue;
    let record: InventoryRecord | null = null;
    if (draft.barcode !== undefined) record = await setGallaSkuForVariant(productId, productSku, size, draft.barcode);
    const qty = parseQty(draft.qty);
    if (qty !== null) record = await setInventoryManual(productId, productSku, size, qty);
    if (record) saved.push(record);
    else failed.push(size);
  }
  return { saved, failed };
};

// Per-size stock + Galla barcode table in the product modal. For an existing
// garment it reads live from `inventory` (the same table Galla imports and
// checkout write to) and saves every edited size in one go.
export default function InventoryPanel({ productId, productSku, sizes, savedProductSku, onDraftsChange }: InventoryPanelProps) {
  const isNew = productId === null;
  const [records, setRecords] = useState<Record<string, InventoryRecord>>({});
  const [loading, setLoading] = useState(!isNew);
  const [drafts, setDrafts] = useState<StockDrafts>({});
  const [fillAll, setFillAll] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // Fetched once per product; saves update `records` from their own results.
  useEffect(() => {
    if (productId === null) return;
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

  const trackableSizes = sizes.filter(s => s && s !== 'One Size');
  const editedCount = trackableSizes.filter(size => hasEdits(drafts[size])).length;
  const skuPending = !isNew && savedProductSku !== undefined && savedProductSku.trim().toUpperCase() !== productSku.trim().toUpperCase();

  const updateDrafts = (next: StockDrafts) => {
    setDrafts(next);
    setMessage(null);
    onDraftsChange?.(next);
  };
  const editSize = (size: string, patch: StockDraft) =>
    updateDrafts({ ...drafts, [size]: { ...drafts[size], ...patch } });

  const handleFillAll = () => {
    if (parseQty(fillAll) === null) return;
    const next = { ...drafts };
    trackableSizes.forEach(size => { next[size] = { ...next[size], qty: fillAll }; });
    updateDrafts(next);
    setFillAll('');
  };

  const handleSaveAll = async () => {
    if (productId === null || editedCount === 0 || skuPending) return;
    setSaving(true);
    const toSave: StockDrafts = {};
    trackableSizes.forEach(size => { if (drafts[size]) toSave[size] = drafts[size]; });
    const { saved, failed } = await applyStockDrafts(productId, productSku, toSave);
    setRecords(prev => {
      const next = { ...prev };
      saved.forEach(r => { next[r.size] = r; });
      return next;
    });
    const remaining: StockDrafts = {};
    failed.forEach(size => { remaining[size] = drafts[size]; });
    setDrafts(remaining);
    onDraftsChange?.(remaining);
    setMessage(failed.length
      ? { tone: 'error', text: `Couldn't save ${failed.join(', ')} — try again.` }
      : { tone: 'ok', text: `Saved ${saved.length} size${saved.length === 1 ? '' : 's'}.` });
    setSaving(false);
  };

  if (trackableSizes.length === 0) {
    return <p className="text-[12px] text-zinc-400 italic">Select at least one size above to track stock. &quot;One Size&quot; garments aren&apos;t stock-tracked.</p>;
  }
  if (!productSku.trim()) {
    return <p className="text-[12px] text-zinc-400 italic">Enter the style and colour code above — each size&apos;s SKU and Galla barcode are built from them.</p>;
  }

  return (
    <div className="border border-zinc-200 rounded-sm bg-white">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-zinc-100 bg-zinc-50">
        <span className="text-[10px] font-label-caps font-semibold text-zinc-500 uppercase tracking-wider">Set all sizes to</span>
        <input
          type="number"
          min={0}
          value={fillAll}
          onChange={(e) => setFillAll(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFillAll(); } }}
          placeholder="Qty"
          className="w-16 bg-white border border-on-surface/15 rounded-sm py-1 px-2 text-[12px] outline-none"
        />
        <button
          type="button"
          onClick={handleFillAll}
          disabled={parseQty(fillAll) === null}
          className="text-[10px] font-label-caps font-bold text-primary hover:underline uppercase tracking-wider disabled:opacity-30 disabled:no-underline"
        >
          Apply
        </button>

        <span className="flex-1" />

        {message && (
          <span className={`text-[11px] font-semibold ${message.tone === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</span>
        )}
        {isNew || skuPending ? (
          <span className="text-[11px] text-zinc-500">
            {isNew ? 'Saved when you publish the garment' : 'SKU changed — saved with the garment'}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || editedCount === 0}
            className="bg-primary text-white px-3 py-1.5 text-[10px] font-label-caps font-bold uppercase tracking-wider rounded-sm disabled:opacity-30"
          >
            {saving ? 'Saving…' : editedCount ? `Save stock (${editedCount})` : 'Save stock'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-4 text-center text-[12px] text-zinc-400">Loading stock levels…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[9.5px] font-label-caps text-zinc-400 uppercase tracking-wider">
                <th className="px-3 py-2 font-semibold">Size</th>
                <th className="px-3 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">Galla barcode</th>
                <th className="px-3 py-2 font-semibold">Stock</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {trackableSizes.map(size => {
                const record = records[size];
                const draft = drafts[size] || {};
                const variantSku = record?.sku || variantSkuFor(productSku, size);
                const autoBarcode = gallaBarcodeFor(variantSku);
                const savedBarcode = record?.galla_sku || '';
                // Blank field = auto barcode (shown as the placeholder); only a
                // hand-entered override is shown as a value.
                const barcodeValue = draft.barcode ?? (savedBarcode && savedBarcode !== autoBarcode ? savedBarcode : '');
                const tracked = !!record && Number.isFinite(record.quantity_available);
                const qtyValue = draft.qty ?? (tracked ? String(record.quantity_on_hand) : '');
                const qty = parseQty(qtyValue);
                const edited = hasEdits(draft);
                const isOut = qty === 0;
                const isLow = qty !== null && qty > 0 && qty <= (record?.low_stock_threshold ?? 3);

                return (
                  <tr key={size} className={edited ? 'bg-amber-50/50' : undefined}>
                    <td className="px-3 py-2 font-bold text-zinc-700">{size}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-500 whitespace-nowrap">{variantSku}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={barcodeValue}
                        onChange={(e) => editSize(size, { barcode: e.target.value })}
                        placeholder={autoBarcode}
                        title={`Leave blank to use ${autoBarcode}. Only change it if Galla's barcode for this size is different.`}
                        className="w-36 bg-surface-dim border border-on-surface/15 rounded-sm py-1 px-2 text-[11px] font-mono outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={qtyValue}
                        onChange={(e) => editSize(size, { qty: e.target.value })}
                        placeholder="Not set"
                        className={`w-20 bg-surface-dim border rounded-sm py-1 px-2 text-[12px] outline-none ${
                          isOut ? 'border-red-300' : isLow ? 'border-amber-300' : 'border-on-surface/15'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2 text-[10.5px] text-zinc-400 whitespace-nowrap">
                      {edited ? (
                        <span className="text-amber-700 font-semibold">Unsaved</span>
                      ) : tracked ? (
                        <>
                          {SOURCE_LABEL[record.sync_source]}
                          {isOut && <span className="ml-1.5 font-bold text-red-600 uppercase">· Out</span>}
                          {isLow && <span className="ml-1.5 font-bold text-amber-600 uppercase">· Low</span>}
                        </>
                      ) : (
                        'Not tracked — sale not blocked'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
