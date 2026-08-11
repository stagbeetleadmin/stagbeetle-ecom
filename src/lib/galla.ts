import { supabase } from './db';

// =========================================================================
// OUTBOUND SYNC TO GALLA (in-store inventory/billing system)
//
// Real contract, confirmed by Galla 2026-08-11:
//   POST https://retail.galla.app/mystorev2/api/v2/webhooks/orders
//   Headers: Content-Type, store-code, Authorization: Bearer <key>, loc_code
//   Body: { event: "order.created", external_order_id, line_items: [{sku, qty}] }
// One request per ORDER (all its line items together), not one per SKU.
// Currently pointed at Galla's DEMO account — see .env.local for the values
// to swap once production store/location codes and API key are confirmed.
//
// Galla identifies stock by their own numeric product code (e.g. "10056"),
// not our STYLE-COLOUR-SIZE sku (e.g. "SATN-CRM-M") — the two don't match.
// Every item here must carry galla_sku (set per-variant by an admin, see
// setGallaSkuForVariant in db.ts); anything missing it is skipped and
// logged rather than sent with a sku Galla's catalog won't recognize.
//
// What this does: after an online order is confirmed, tell Galla what sold
// so a store clerk doesn't sell the same physical unit again. Fire-and-
// logged — never blocks or fails checkout. A failure here is recorded in
// inventory_sync_log (direction='outbound') for manual re-drive, not
// surfaced to the customer.
// =========================================================================

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

interface GallaSaleItem {
  sku: string; // our own variant SKU — for logging only, never sent to Galla
  galla_sku: string | null; // Galla's numeric code for this exact size — what's actually sent
  quantity: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const buildGallaOrderPayload = (orderId: string, items: { galla_sku: string; quantity: number }[]) => ({
  event: 'order.created' as const,
  external_order_id: orderId,
  line_items: items.map(item => ({ sku: item.galla_sku, qty: item.quantity })),
});

const callGalla = async (payload: ReturnType<typeof buildGallaOrderPayload>): Promise<{ ok: boolean; error?: string }> => {
  const url = process.env.GALLA_ORDERS_SYNC_URL;
  const apiKey = process.env.GALLA_API_KEY;
  const storeCode = process.env.GALLA_STORE_CODE;
  const locCode = process.env.GALLA_LOC_CODE;

  if (!url || !apiKey || !storeCode || !locCode) {
    return { ok: false, error: 'Galla outbound sync not fully configured (GALLA_ORDERS_SYNC_URL / GALLA_API_KEY / GALLA_STORE_CODE / GALLA_LOC_CODE) — skipping' };
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'store-code': storeCode,
          'Authorization': `Bearer ${apiKey}`,
          'loc_code': locCode,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return { ok: true };
      if (attempt === MAX_ATTEMPTS) {
        const bodyText = await res.text().catch(() => '');
        return { ok: false, error: `Galla responded ${res.status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ''}` };
      }
    } catch (e: any) {
      if (attempt === MAX_ATTEMPTS) return { ok: false, error: e.message || String(e) };
    }
    await sleep(RETRY_DELAY_MS * attempt);
  }
  return { ok: false, error: 'Exhausted retries' };
};

// Called once per confirmed order — one Galla request for the whole order,
// per their contract (not one per line item). Never throws — a slow or
// unconfigured inventory vendor should never be why a customer's checkout fails.
export const notifyGallaOfSale = async (orderId: string, items: GallaSaleItem[]): Promise<void> => {
  if (items.length === 0) return;

  const mappable = items.filter((i): i is GallaSaleItem & { galla_sku: string } => !!i.galla_sku);
  const unmapped = items.filter(i => !i.galla_sku);

  // Log unmapped items individually so "why didn't this show up in Galla"
  // is answerable from inventory_sync_log alone — no server console needed.
  if (unmapped.length > 0 && supabase) {
    console.warn(`[Galla Sync] Order ${orderId} has ${unmapped.length} item(s) with no Galla SKU mapped — skipping those from the sync:`, unmapped.map(i => i.sku));
    try {
      await supabase.from('inventory_sync_log').insert(
        unmapped.map(i => ({
          direction: 'outbound',
          external_event_id: `sb-order-${orderId}-${i.sku}-nomap`,
          variant_sku: i.sku,
          payload: { reason: 'galla_sku_not_mapped', order_id: orderId, sku: i.sku, quantity: i.quantity },
          status: 'skipped_no_mapping',
          error_message: `No Galla SKU set for ${i.sku} — add one from the product's stock panel`,
        }))
      );
    } catch (e) {
      console.warn('[Galla Sync] Failed to log unmapped-SKU skip:', e);
    }
  }

  if (mappable.length === 0) return;

  const payload = buildGallaOrderPayload(orderId, mappable);
  const result = await callGalla(payload);

  if (supabase) {
    try {
      await supabase.from('inventory_sync_log').insert([{
        direction: 'outbound',
        external_event_id: `sb-order-${orderId}`,
        variant_sku: mappable.map(i => i.sku).join(','),
        payload,
        status: result.ok ? 'applied' : 'failed',
        error_message: result.error,
      }]);
    } catch (e) {
      console.warn('[Galla Sync] Failed to write sync log:', e);
    }
  }

  if (!result.ok) {
    console.warn(`[Galla Sync] Failed to notify Galla for order ${orderId}:`, result.error);
  }
};
