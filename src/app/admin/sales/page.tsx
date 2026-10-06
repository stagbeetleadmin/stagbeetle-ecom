"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Product, SaleConfig, CategoryDiscount, ProductDiscount, DiscountFormInput,
  getSaleConfig, setSaleConfig, isSaleLive,
  getCategoryDiscounts, saveCategoryDiscount, deleteCategoryDiscount,
  getProductDiscounts, saveProductDiscount, deleteProductDiscount,
  getProducts, GARMENT_GROUPS,
} from '@/lib/db';

const DEFAULT_CATEGORY_OPTIONS = ['Men', 'Accessories'];
const SUBCATEGORY_OPTIONS = Object.values(GARMENT_GROUPS).flat(); // ['Shirt','Jeans','Tshirt','Track pant','Shorts','Jacket']

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border border-on-surface/5 bg-white rounded-sm p-6 md:p-8 space-y-4">
      <div>
        <h2 className="font-display text-[18px] md:text-[20px] font-semibold text-on-surface">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const inputCls = "w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none";
const labelCls = "text-[11px] font-label-caps font-semibold text-on-surface-variant block mb-1.5";

// ── Local <-> ISO conversions for the date/time inputs. Sale windows are
// stored as plain TIMESTAMPTZ (UTC on the wire, same as every other
// timestamp in this app — created_at, redeemed_at, etc.); these just
// translate that to/from the admin's own local wall-clock time so "Start
// Time: 12:00 AM" means midnight wherever the admin actually is, with no
// separate timezone picker needed (see AGENTS notes on this app having no
// existing timezone framework to plug into). ──
const toLocalDateInput = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const toLocalTimeInput = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const isoToLocalParts = (iso?: string | null): { date: string; time: string } => {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return { date: toLocalDateInput(d), time: toLocalTimeInput(d) };
};
const localPartsToIso = (date: string, time: string): string | null => {
  if (!date) return null;
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const fmtIsoLocal = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

interface DiscountFieldsState {
  discount_type: 'percentage' | 'fixed';
  discount_value: string; // kept as string while editing, parsed on save
  active: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

const EMPTY_DISCOUNT_FIELDS: DiscountFieldsState = {
  discount_type: 'percentage',
  discount_value: '',
  active: true,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
};

function DiscountFieldset({ value, onChange }: { value: DiscountFieldsState; onChange: (v: DiscountFieldsState) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>Discount Type</label>
        <div className="flex gap-4 py-1">
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-on-surface">
            <input
              type="radio"
              checked={value.discount_type === 'percentage'}
              onChange={() => onChange({ ...value, discount_type: 'percentage' })}
              className="accent-[#052A42]"
            />
            Percentage (%)
          </label>
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-on-surface">
            <input
              type="radio"
              checked={value.discount_type === 'fixed'}
              onChange={() => onChange({ ...value, discount_type: 'fixed' })}
              className="accent-[#052A42]"
            />
            Fixed Amount (₹)
          </label>
        </div>
      </div>
      <div>
        <label className={labelCls}>Discount Value{value.discount_type === 'percentage' ? ' (max 100)' : ''}</label>
        <input
          type="number" min={0} max={value.discount_type === 'percentage' ? 100 : undefined} step="0.01"
          value={value.discount_value}
          onChange={(e) => onChange({ ...value, discount_value: e.target.value })}
          className={inputCls}
          placeholder={value.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 500'}
        />
      </div>
      <div>
        <label className={labelCls}>Start Date (optional)</label>
        <div className="flex gap-2">
          <input type="date" value={value.startDate} onChange={(e) => onChange({ ...value, startDate: e.target.value })} className={inputCls} />
          <input type="time" value={value.startTime} onChange={(e) => onChange({ ...value, startTime: e.target.value })} className={inputCls} disabled={!value.startDate} />
        </div>
      </div>
      <div>
        <label className={labelCls}>End Date (optional)</label>
        <div className="flex gap-2">
          <input type="date" value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} className={inputCls} />
          <input type="time" value={value.endTime} onChange={(e) => onChange({ ...value, endTime: e.target.value })} className={inputCls} disabled={!value.endDate} />
        </div>
      </div>
      <label className="flex items-center gap-2.5 text-[13px] font-semibold text-on-surface sm:col-span-2">
        <input type="checkbox" checked={value.active} onChange={(e) => onChange({ ...value, active: e.target.checked })} className="w-4 h-4 accent-[#052A42]" />
        Active
      </label>
    </div>
  );
}

// Validates + converts the shared discount fields into the DiscountFormInput
// shape the db.ts save functions expect. Returns an error string instead of
// throwing — every save handler below shows it inline rather than an alert.
function buildDiscountInput(fields: DiscountFieldsState): { ok: true; input: DiscountFormInput } | { ok: false; error: string } {
  const value = Number(fields.discount_value);
  if (fields.discount_value.trim() === '' || isNaN(value) || value < 0) {
    return { ok: false, error: 'Enter a discount value of 0 or more.' };
  }
  if (fields.discount_type === 'percentage' && value > 100) {
    return { ok: false, error: 'A percentage discount cannot exceed 100%.' };
  }
  const start_at = localPartsToIso(fields.startDate, fields.startTime);
  const end_at = localPartsToIso(fields.endDate, fields.endTime);
  if (start_at && end_at && new Date(start_at) > new Date(end_at)) {
    return { ok: false, error: 'The end date/time must be after the start date/time.' };
  }
  return { ok: true, input: { discount_type: fields.discount_type, discount_value: value, active: fields.active, start_at, end_at } };
}

export default function AdminSalesPage() {
  const { isAdmin } = useAuth();

  // ── Sale Configuration ──
  const [config, setConfig] = useState<SaleConfig | null>(null);
  const [configFields, setConfigFields] = useState({ active: false, startDate: '', startTime: '', endDate: '', endTime: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState('');

  // ── Catalog (for the category/product pickers) ──
  const [products, setProducts] = useState<Product[]>([]);
  const categoryOptions = useMemo(() => {
    const fromCatalog = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return Array.from(new Set([...DEFAULT_CATEGORY_OPTIONS, ...fromCatalog]));
  }, [products]);

  // ── Category Discounts ──
  const [categoryDiscounts, setCategoryDiscounts] = useState<CategoryDiscount[]>([]);
  const [loadingCategoryDiscounts, setLoadingCategoryDiscounts] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<DiscountFieldsState & { category: string; subcategory: string }>({
    ...EMPTY_DISCOUNT_FIELDS, category: categoryOptions[0] || 'Men', subcategory: '',
  });
  const [savingCategoryDiscount, setSavingCategoryDiscount] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState('');

  // ── Product Discounts ──
  const [productDiscounts, setProductDiscounts] = useState<ProductDiscount[]>([]);
  const [loadingProductDiscounts, setLoadingProductDiscounts] = useState(true);
  const [editingProductDiscountId, setEditingProductDiscountId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<DiscountFieldsState>(EMPTY_DISCOUNT_FIELDS);
  const [savingProductDiscount, setSavingProductDiscount] = useState(false);
  const [productFormError, setProductFormError] = useState('');

  const refreshCategoryDiscounts = useCallback(() => {
    setLoadingCategoryDiscounts(true);
    getCategoryDiscounts().then(setCategoryDiscounts).finally(() => setLoadingCategoryDiscounts(false));
  }, []);
  const refreshProductDiscounts = useCallback(() => {
    setLoadingProductDiscounts(true);
    getProductDiscounts().then(setProductDiscounts).finally(() => setLoadingProductDiscounts(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    getSaleConfig().then(cfg => {
      setConfig(cfg);
      const start = isoToLocalParts(cfg.start_at);
      const end = isoToLocalParts(cfg.end_at);
      setConfigFields({ active: cfg.active, startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time });
    });
    getProducts().then(setProducts).catch(() => {});
    refreshCategoryDiscounts();
    refreshProductDiscounts();
  }, [isAdmin, refreshCategoryDiscounts, refreshProductDiscounts]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24 text-center px-6">
        <div className="max-w-sm space-y-4">
          <span className="material-symbols-outlined text-[40px] text-gold-leaf">lock</span>
          <h1 className="font-display text-[22px] font-semibold text-on-surface">Admin Access Required</h1>
          <Link
            href="/admin"
            className="inline-block bg-primary text-white px-6 py-3 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all"
          >
            GO TO ADMIN SIGN IN
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg('');
    const start_at = localPartsToIso(configFields.startDate, configFields.startTime);
    const end_at = localPartsToIso(configFields.endDate, configFields.endTime);
    if (start_at && end_at && new Date(start_at) > new Date(end_at)) {
      setConfigMsg('The end date/time must be after the start date/time.');
      setSavingConfig(false);
      return;
    }
    const next: SaleConfig = { active: configFields.active, start_at, end_at };
    const ok = await setSaleConfig(next);
    if (ok) setConfig(next);
    setConfigMsg(ok ? 'Saved.' : 'Failed to save — please try again.');
    setSavingConfig(false);
  };

  const liveNow = config ? isSaleLive(config) : false;

  // ── Category discount handlers ──
  const startEditCategoryDiscount = (d: CategoryDiscount) => {
    const start = isoToLocalParts(d.start_at);
    const end = isoToLocalParts(d.end_at);
    setEditingCategoryId(d.id);
    setCategoryFormError('');
    setCategoryForm({
      category: d.category,
      subcategory: d.subcategory || '',
      discount_type: d.discount_type,
      discount_value: String(d.discount_value),
      active: d.active,
      startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time,
    });
  };
  const cancelEditCategoryDiscount = () => {
    setEditingCategoryId(null);
    setCategoryFormError('');
    setCategoryForm({ ...EMPTY_DISCOUNT_FIELDS, category: categoryOptions[0] || 'Men', subcategory: '' });
  };
  const handleSaveCategoryDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    const built = buildDiscountInput(categoryForm);
    if (!built.ok) { setCategoryFormError(built.error); return; }
    setSavingCategoryDiscount(true);
    setCategoryFormError('');
    const res = await saveCategoryDiscount(
      { ...built.input, category: categoryForm.category, subcategory: categoryForm.subcategory || null },
      editingCategoryId || undefined
    );
    if (res.ok) {
      cancelEditCategoryDiscount();
      refreshCategoryDiscounts();
    } else {
      setCategoryFormError(res.error || "Couldn't save — please try again.");
    }
    setSavingCategoryDiscount(false);
  };
  const handleDeleteCategoryDiscount = async (d: CategoryDiscount) => {
    if (!confirm(`Remove the ${d.discount_value}${d.discount_type === 'percentage' ? '%' : ' ₹'} discount for ${d.category}${d.subcategory ? ` > ${d.subcategory}` : ' (whole category)'}?`)) return;
    const ok = await deleteCategoryDiscount(d.id);
    if (ok) setCategoryDiscounts(prev => prev.filter(c => c.id !== d.id));
  };

  // ── Product discount handlers ──
  const productMatches = productQuery.trim()
    ? products.filter(p =>
        p.title.toLowerCase().includes(productQuery.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(productQuery.toLowerCase())
      ).slice(0, 8)
    : [];
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const startEditProductDiscount = (d: ProductDiscount) => {
    const start = isoToLocalParts(d.start_at);
    const end = isoToLocalParts(d.end_at);
    setEditingProductDiscountId(d.id);
    setProductFormError('');
    setSelectedProduct(productById.get(d.product_id) || null);
    setProductForm({
      discount_type: d.discount_type,
      discount_value: String(d.discount_value),
      active: d.active,
      startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time,
    });
  };
  const cancelEditProductDiscount = () => {
    setEditingProductDiscountId(null);
    setProductFormError('');
    setSelectedProduct(null);
    setProductQuery('');
    setProductForm(EMPTY_DISCOUNT_FIELDS);
  };
  const handleSaveProductDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { setProductFormError('Search for and select a product first.'); return; }
    const built = buildDiscountInput(productForm);
    if (!built.ok) { setProductFormError(built.error); return; }
    setSavingProductDiscount(true);
    setProductFormError('');
    const res = await saveProductDiscount({ ...built.input, product_id: selectedProduct.id }, editingProductDiscountId || undefined);
    if (res.ok) {
      cancelEditProductDiscount();
      refreshProductDiscounts();
    } else {
      setProductFormError(res.error || "Couldn't save — please try again.");
    }
    setSavingProductDiscount(false);
  };
  const handleDeleteProductDiscount = async (d: ProductDiscount) => {
    const title = productById.get(d.product_id)?.title || d.product_id;
    if (!confirm(`Remove the ${d.discount_value}${d.discount_type === 'percentage' ? '%' : ' ₹'} discount for "${title}"?`)) return;
    const ok = await deleteProductDiscount(d.id);
    if (ok) setProductDiscounts(prev => prev.filter(p => p.id !== d.id));
  };

  return (
    <div className="w-full space-y-6">

      <div className="border-b border-on-surface/10 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE ADMIN</span>
          <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Sale Management</h1>
          <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Configure the store-wide sale window, category-wide discounts, and per-product overrides. A product-specific
            discount always takes precedence over a category discount for that same product.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${
            liveNow ? 'text-green-700 bg-green-50 border border-green-200' : 'text-zinc-500 bg-zinc-100 border border-zinc-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${liveNow ? 'bg-green-600' : 'bg-zinc-400'}`} />
            {liveNow ? 'Sale Live' : 'Sale Not Live'}
          </span>
        </div>
      </div>

      {/* Sale Configuration */}
      <Section title="Sale Configuration" subtitle="The master on/off switch and window for the whole storefront sale. Even an active category/product discount only shows to shoppers while this is live.">
        {!config ? (
          <p className="text-[12px] text-zinc-400">Loading…</p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-2.5 text-[13px] font-semibold text-on-surface">
              <input
                type="checkbox"
                checked={configFields.active}
                onChange={(e) => setConfigFields({ ...configFields, active: e.target.checked })}
                className="w-4 h-4 accent-[#052A42]"
              />
              Sale enabled
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <div className="flex gap-2">
                  <input type="date" value={configFields.startDate} onChange={(e) => setConfigFields({ ...configFields, startDate: e.target.value })} className={inputCls} />
                  <input type="time" value={configFields.startTime} onChange={(e) => setConfigFields({ ...configFields, startTime: e.target.value })} className={inputCls} disabled={!configFields.startDate} />
                </div>
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <div className="flex gap-2">
                  <input type="date" value={configFields.endDate} onChange={(e) => setConfigFields({ ...configFields, endDate: e.target.value })} className={inputCls} />
                  <input type="time" value={configFields.endTime} onChange={(e) => setConfigFields({ ...configFields, endTime: e.target.value })} className={inputCls} disabled={!configFields.endDate} />
                </div>
              </div>
            </div>
            <p className="text-[10.5px] text-zinc-400">
              Leave a date blank for an open-ended start/end. Times are your device&apos;s local time — converted and stored
              consistently either way, the same way every other timestamp in this app (order times, membership dates) is handled.
              The sale automatically activates/deactivates at these instants; use the checkbox above to force it off regardless of the window.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-[#052A42] text-white text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-[#052A42]/90 transition-colors disabled:opacity-60"
              >
                {savingConfig ? 'Saving…' : 'Save Settings'}
              </button>
              {configMsg && <span className="text-[12px] text-zinc-500">{configMsg}</span>}
            </div>
          </div>
        )}
      </Section>

      {/* Category Discounts */}
      <Section title="Category Discounts" subtitle="Applies to every product in a category (optionally narrowed to one garment type), while it and the sale above are both active.">
        <form onSubmit={handleSaveCategoryDiscount} className="space-y-4 border-b border-on-surface/10 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={categoryForm.category}
                onChange={(e) => setCategoryForm({ ...categoryForm, category: e.target.value })}
                className={inputCls}
              >
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Subcategory (optional — narrows to one garment type)</label>
              <select
                value={categoryForm.subcategory}
                onChange={(e) => setCategoryForm({ ...categoryForm, subcategory: e.target.value })}
                className={inputCls}
              >
                <option value="">All subcategories</option>
                {SUBCATEGORY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DiscountFieldset value={categoryForm} onChange={(v) => setCategoryForm({ ...categoryForm, ...v })} />
          {categoryFormError && <p className="text-[12px] text-red-600">{categoryFormError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingCategoryDiscount}
              className="bg-gold-leaf text-obsidian-charcoal text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-gold-leaf/90 transition-colors disabled:opacity-60"
            >
              {savingCategoryDiscount ? 'Saving…' : editingCategoryId ? 'Update Discount' : 'Add Discount'}
            </button>
            {editingCategoryId && (
              <button type="button" onClick={cancelEditCategoryDiscount} className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800">
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {loadingCategoryDiscounts ? (
          <p className="text-[12px] text-zinc-400">Loading…</p>
        ) : categoryDiscounts.length === 0 ? (
          <p className="text-[12px] text-zinc-400">No category discounts configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold bg-surface-dim/60">
                  <th className="px-3 py-2.5">CATEGORY</th>
                  <th className="px-3 py-2.5">DISCOUNT</th>
                  <th className="px-3 py-2.5">STATUS</th>
                  <th className="px-3 py-2.5">WINDOW</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface/5">
                {categoryDiscounts.map(d => (
                  <tr key={d.id} className="hover:bg-surface-dim/30">
                    <td className="px-3 py-2.5 font-semibold text-on-surface whitespace-nowrap">
                      {d.category}{d.subcategory ? <span className="text-on-surface-variant font-normal"> &gt; {d.subcategory}</span> : <span className="text-on-surface-variant font-normal"> (whole category)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">
                      {d.discount_value}{d.discount_type === 'percentage' ? '%' : ' ₹'} off
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${d.active ? 'text-green-700 bg-green-50 border border-green-200' : 'text-zinc-500 bg-zinc-100 border border-zinc-200'}`}>
                        {d.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">
                      {d.start_at || d.end_at ? `${fmtIsoLocal(d.start_at)} → ${fmtIsoLocal(d.end_at)}` : 'No date limit'}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-3">
                      <button type="button" onClick={() => startEditCategoryDiscount(d)} className="text-[10.5px] font-bold text-[#052A42] hover:underline uppercase tracking-wide">Edit</button>
                      <button type="button" onClick={() => handleDeleteCategoryDiscount(d)} className="text-[10.5px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wide">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Product Discounts */}
      <Section title="Product Discounts" subtitle="Overrides any category discount for this one product, while it and the sale above are both active.">
        <form onSubmit={handleSaveProductDiscount} className="space-y-4 border-b border-on-surface/10 pb-6">
          <div>
            <label className={labelCls}>Product</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between gap-3 bg-surface-dim border border-on-surface/15 rounded-sm py-2.5 px-3.5">
                <span className="text-[13px] font-semibold text-on-surface truncate">{selectedProduct.title}{selectedProduct.sku ? ` · ${selectedProduct.sku}` : ''}</span>
                {!editingProductDiscountId && (
                  <button type="button" onClick={() => { setSelectedProduct(null); setProductQuery(''); }} className="text-[10.5px] font-semibold text-zinc-500 hover:text-zinc-800 shrink-0">
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search by product title or SKU…"
                  className={inputCls}
                />
                {productMatches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-on-surface/15 rounded-sm shadow-lg max-h-60 overflow-y-auto">
                    {productMatches.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProduct(p); setProductQuery(''); }}
                        className="w-full text-left px-3.5 py-2 text-[12.5px] hover:bg-surface-dim transition-colors"
                      >
                        <span className="font-semibold text-on-surface">{p.title}</span>
                        <span className="text-on-surface-variant"> {p.sku ? `· ${p.sku}` : ''} · {p.category}{p.subcategory ? ` / ${p.subcategory}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DiscountFieldset value={productForm} onChange={setProductForm} />
          {productFormError && <p className="text-[12px] text-red-600">{productFormError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingProductDiscount}
              className="bg-gold-leaf text-obsidian-charcoal text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-gold-leaf/90 transition-colors disabled:opacity-60"
            >
              {savingProductDiscount ? 'Saving…' : editingProductDiscountId ? 'Update Discount' : 'Add Discount'}
            </button>
            {editingProductDiscountId && (
              <button type="button" onClick={cancelEditProductDiscount} className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800">
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {loadingProductDiscounts ? (
          <p className="text-[12px] text-zinc-400">Loading…</p>
        ) : productDiscounts.length === 0 ? (
          <p className="text-[12px] text-zinc-400">No product-specific discounts configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold bg-surface-dim/60">
                  <th className="px-3 py-2.5">PRODUCT</th>
                  <th className="px-3 py-2.5">DISCOUNT</th>
                  <th className="px-3 py-2.5">STATUS</th>
                  <th className="px-3 py-2.5">WINDOW</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface/5">
                {productDiscounts.map(d => {
                  const p = productById.get(d.product_id);
                  return (
                    <tr key={d.id} className="hover:bg-surface-dim/30">
                      <td className="px-3 py-2.5 font-semibold text-on-surface whitespace-nowrap">
                        {p ? p.title : <span className="text-zinc-400 italic">Deleted product</span>}
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">
                        {d.discount_value}{d.discount_type === 'percentage' ? '%' : ' ₹'} off
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${d.active ? 'text-green-700 bg-green-50 border border-green-200' : 'text-zinc-500 bg-zinc-100 border border-zinc-200'}`}>
                          {d.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">
                        {d.start_at || d.end_at ? `${fmtIsoLocal(d.start_at)} → ${fmtIsoLocal(d.end_at)}` : 'No date limit'}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-3">
                        <button type="button" onClick={() => startEditProductDiscount(d)} className="text-[10.5px] font-bold text-[#052A42] hover:underline uppercase tracking-wide">Edit</button>
                        <button type="button" onClick={() => handleDeleteProductDiscount(d)} className="text-[10.5px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wide">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

    </div>
  );
}
