import { supabase, notifyInventoryChangedFromServer } from './db';

// =========================================================================
// INBOUND PULL FROM GALLA (store stock → our inventory)
//
//   GET https://retail.galla.app/mystorev2/api/v2/inventory/stock-list
//   Headers: Authorization: Bearer <key>, Accept, store-code, loc-code
//   → { items: [{ barcode: "WINGSF.SM", qty: 4 }, ...] }
//
// Same token / store-code / loc-code as the order webhook (galla.ts) —
// confirmed live 2026-10-09: our own store (not the 2h337h00ch demo) returns
// ~2,700 items for location RRBPS. One call returns the whole location's
// stock; there's no "changed since" filter, so we diff against our own
// inventory and only write the sizes whose count actually moved.
//
// Matching is barcode → product_variants.galla_sku (case-insensitive), the
// same code the order webhook sends. Galla items with no matching size on
// our site are ignored — nothing is ever created. Negative Galla stock
// (oversold in store) is stored as 0.
//
// Galla PUSHES each stock change to /api/inventory/sync in real time; this
// pull is the safety net that catches anything a push missed (a rejected
// key, an outage). Runs daily by Vercel Cron (/api/inventory/galla-pull,
// 03:00 IST) and on demand with `npm run galla:pull`.
// =========================================================================

// A size whose stock changed on OUR side (an online sale's decrement, an
// admin edit) within this window is left alone for this run: the sale's
// webhook to Galla is still "queued" on their side, and pulling Galla's
// not-yet-updated count would hand the sold unit back to the storefront.
export const RECENT_LOCAL_CHANGE_MS = 3 * 60 * 1000;

export interface GallaStockItem {
  barcode: string;
  qty: number;
}

export interface VariantStock {
  variant_id: string;
  sku: string;
  galla_sku: string | null;
  quantity_on_hand: number | null; // null = no inventory row yet (untracked)
  last_synced_at: string | null;
  updated_at: string | null;
}

export interface StockChange {
  variant_id: string;
  sku: string;
  before: number | null;
  after: number;
}

export interface PullPlan {
  changes: StockChange[];
  unchanged: number;
  skippedRecentLocalChange: string[]; // our SKUs
  notInGalla: string[]; // our SKUs whose barcode isn't in the stock list
}

// Was this row's last write something other than our own sync (which sets
// last_synced_at and updated_at together), and recent enough that Galla
// may not have caught up yet?
const changedLocallySinceSync = (v: VariantStock, now: number) => {
  if (!v.updated_at) return false;
  const updated = new Date(v.updated_at).getTime();
  if (now - updated > RECENT_LOCAL_CHANGE_MS) return false;
  const synced = v.last_synced_at ? new Date(v.last_synced_at).getTime() : 0;
  return updated - synced > 5000;
};

// Pure: decides what a pull would change. Exported for tests.
export const planGallaPull = (items: GallaStockItem[], variants: VariantStock[], now = Date.now()): PullPlan => {
  const galla = new Map<string, number>();
  for (const item of items) {
    if (item?.barcode && Number.isFinite(item.qty)) galla.set(item.barcode.trim().toUpperCase(), Math.trunc(item.qty));
  }

  const plan: PullPlan = { changes: [], unchanged: 0, skippedRecentLocalChange: [], notInGalla: [] };
  for (const v of variants) {
    const qty = v.galla_sku ? galla.get(v.galla_sku.trim().toUpperCase()) : undefined;
    if (qty === undefined) {
      plan.notInGalla.push(v.sku);
      continue;
    }
    const after = Math.max(0, qty);
    if (v.quantity_on_hand === after) {
      plan.unchanged++;
      continue;
    }
    if (changedLocallySinceSync(v, now)) {
      plan.skippedRecentLocalChange.push(v.sku);
      continue;
    }
    plan.changes.push({ variant_id: v.variant_id, sku: v.sku, before: v.quantity_on_hand, after });
  }
  return plan;
};

export const fetchGallaStockList = async (): Promise<GallaStockItem[]> => {
  const url = process.env.GALLA_STOCK_LIST_URL || 'https://retail.galla.app/mystorev2/api/v2/inventory/stock-list';
  const apiKey = process.env.GALLA_API_KEY;
  const storeCode = process.env.GALLA_STORE_CODE;
  const locCode = process.env.GALLA_LOC_CODE;
  if (!apiKey || !storeCode || !locCode) {
    throw new Error('Galla pull not configured (GALLA_API_KEY / GALLA_STORE_CODE / GALLA_LOC_CODE)');
  }

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'store-code': storeCode,
      'loc-code': locCode, // hyphen, not underscore — see galla.ts
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Galla stock-list responded ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
  }
  const data = await res.json();
  if (!Array.isArray(data?.items)) throw new Error('Galla stock-list response has no `items` array');
  // An empty list would zero nothing (unmatched sizes are left alone), but it
  // almost certainly means a wrong store/location — refuse rather than guess.
  if (data.items.length === 0) throw new Error('Galla stock-list returned 0 items — check GALLA_STORE_CODE / GALLA_LOC_CODE');
  return data.items;
};

// VariantStock plus what a person needs to recognise and fix the size —
// only the health report uses the extra fields.
export interface VariantDetail extends VariantStock {
  size: string;
  product_id: string;
  product_title: string;
  product_sku: string;
  sync_source: string | null;
}

const loadVariantStock = async (): Promise<VariantDetail[]> => {
  if (!supabase) throw new Error('Database not configured');
  const PAGE = 1000;
  const rows: VariantDetail[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('id,sku,size,galla_sku,product_id,products(title,sku),inventory(quantity_on_hand,sync_source,last_synced_at,updated_at)')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Variant lookup failed: ${error.message}`);
    for (const v of data ?? []) {
      // Embedded relations come back as an object or a one-element array
      // depending on how PostgREST reads the foreign key.
      const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] : x);
      const inv = one(v.inventory);
      const product = one(v.products);
      rows.push({
        variant_id: v.id, sku: v.sku, galla_sku: v.galla_sku,
        quantity_on_hand: inv?.quantity_on_hand ?? null,
        last_synced_at: inv?.last_synced_at ?? null,
        updated_at: inv?.updated_at ?? null,
        size: v.size, product_id: v.product_id,
        product_title: product?.title ?? '', product_sku: product?.sku ?? '',
        sync_source: inv?.sync_source ?? null,
      });
    }
    if (!data || data.length < PAGE) return rows;
  }
};

export interface PullResult {
  dry_run: boolean;
  galla_items: number;
  our_sizes: number;
  applied: StockChange[];
  failed: { sku: string; error: string }[];
  unchanged: number;
  skipped_recent_local_change: string[];
  not_in_galla: string[];
}

export const pullGallaStock = async ({ dryRun = false } = {}): Promise<PullResult> => {
  if (!supabase) throw new Error('Database not configured');
  const [items, variants] = await Promise.all([fetchGallaStockList(), loadVariantStock()]);
  const plan = planGallaPull(items, variants);

  const applied: StockChange[] = [];
  const failed: { sku: string; error: string }[] = [];
  if (!dryRun) {
    const syncedAt = new Date().toISOString();
    // Same narrow SECURITY DEFINER RPC the push endpoint uses — no
    // service-role key needed. A handful in flight at a time.
    const CONCURRENCY = 10;
    for (let i = 0; i < plan.changes.length; i += CONCURRENCY) {
      await Promise.all(plan.changes.slice(i, i + CONCURRENCY).map(async change => {
        const { error } = await supabase!.rpc('upsert_inventory_from_sync', {
          p_variant_id: change.variant_id,
          p_quantity_on_hand: change.after,
          p_last_synced_at: syncedAt,
        });
        if (error) failed.push({ sku: change.sku, error: error.message });
        else applied.push(change);
      }));
    }

    // One summary row per run that changed something (or failed) — a quiet
    // run every few minutes would otherwise flood the log.
    if (applied.length > 0 || failed.length > 0) {
      try {
        await supabase.from('inventory_sync_log').insert([{
          direction: 'inbound',
          external_event_id: `galla-pull-${syncedAt}`,
          variant_sku: applied.map(c => c.sku).join(',').slice(0, 2000) || null,
          payload: {
            reason: 'galla_stock_list_pull',
            changes: applied.map(c => ({ sku: c.sku, before: c.before, after: c.after })),
            failed,
          },
          status: failed.length === 0 ? 'applied' : 'failed',
          error_message: failed.length ? `${failed.length} size(s) failed to update` : null,
        }]);
      } catch (e) {
        console.warn('[Galla Pull] Failed to write sync log:', e);
      }
    }
    if (applied.length > 0) await notifyInventoryChangedFromServer();
  }

  return {
    dry_run: dryRun,
    galla_items: items.length,
    our_sizes: variants.length,
    applied: dryRun ? plan.changes : applied,
    failed,
    unchanged: plan.unchanged,
    skipped_recent_local_change: plan.skippedRecentLocalChange,
    not_in_galla: plan.notInGalla,
  };
};

// =========================================================================
// HEALTH REPORT — every size on the site against Galla's live stock list,
// for the admin's manual check (/admin/inventory-sync). Read-only.
// =========================================================================

export type StockHealthStatus =
  | 'in_sync'           // matched, same count
  | 'mismatch'          // matched, counts differ — "Sync now" fixes it
  | 'untracked'         // matched, but no count on our site yet — sells as unlimited until synced
  | 'not_in_galla_open' // no Galla match AND no count — sells as UNLIMITED; set a count or fix the barcode
  | 'not_in_galla';     // no Galla match, has a hand-entered count — not kept in sync

export interface StockHealthRow {
  variant_id: string;
  product_id: string;
  product_title: string;
  product_sku: string;
  size: string;
  sku: string;
  galla_sku: string | null;
  site_qty: number | null;
  galla_qty: number | null; // raw Galla value (may be negative)
  status: StockHealthStatus;
  sync_source: string | null;
  last_synced_at: string | null;
  // Galla barcodes that look like this size under a different code (e.g.
  // JAMUS for JAMU-ML-S) — a hint for fixing the barcode, never auto-applied.
  suggestions: string[];
}

const STATUS_ORDER: StockHealthStatus[] = ['not_in_galla_open', 'mismatch', 'untracked', 'not_in_galla', 'in_sync'];

// Pure: exported for tests.
export const buildHealthRows = (items: GallaStockItem[], variants: VariantDetail[]): StockHealthRow[] => {
  const galla = new Map<string, number>();
  for (const item of items) {
    if (item?.barcode && Number.isFinite(item.qty)) galla.set(item.barcode.trim().toUpperCase(), Math.trunc(item.qty));
  }
  const barcodes = [...galla.keys()];

  return variants.map(v => {
    const gallaQty = v.galla_sku ? galla.get(v.galla_sku.trim().toUpperCase()) ?? null : null;
    let status: StockHealthStatus;
    if (gallaQty === null) status = v.quantity_on_hand === null ? 'not_in_galla_open' : 'not_in_galla';
    else if (v.quantity_on_hand === null) status = 'untracked';
    else status = v.quantity_on_hand === Math.max(0, gallaQty) ? 'in_sync' : 'mismatch';

    let suggestions: string[] = [];
    if (gallaQty === null) {
      // Same style prefix and same size suffix, e.g. JAMU…S for JAMU-ML-S.
      const parts = v.sku.toUpperCase().split('-');
      const style = parts[0].replace(/[^A-Z0-9.]/g, '');
      const size = parts[parts.length - 1];
      suggestions = barcodes.filter(b => b.startsWith(style) && b.endsWith(size) && b.length <= style.length + size.length + 4)
        .sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, 5);
    }

    return {
      variant_id: v.variant_id, product_id: v.product_id, product_title: v.product_title, product_sku: v.product_sku,
      size: v.size, sku: v.sku, galla_sku: v.galla_sku, site_qty: v.quantity_on_hand, galla_qty: gallaQty,
      status, sync_source: v.sync_source, last_synced_at: v.last_synced_at, suggestions,
    };
  }).sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    || a.product_title.localeCompare(b.product_title)
    || a.sku.localeCompare(b.sku));
};

export interface StockHealthReport {
  checked_at: string;
  galla_items: number;
  counts: Record<StockHealthStatus, number>;
  rows: StockHealthRow[];
}

export const buildGallaHealthReport = async (): Promise<StockHealthReport> => {
  const [items, variants] = await Promise.all([fetchGallaStockList(), loadVariantStock()]);
  const rows = buildHealthRows(items, variants);
  const counts = Object.fromEntries(STATUS_ORDER.map(s => [s, 0])) as Record<StockHealthStatus, number>;
  for (const row of rows) counts[row.status]++;
  return { checked_at: new Date().toISOString(), galla_items: items.length, counts, rows };
};
