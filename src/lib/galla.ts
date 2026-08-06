import { supabase } from './db';

// =========================================================================
// OUTBOUND SYNC TO GALLA (in-store inventory/billing system)
//
// ⚠️ PLACEHOLDER CONTRACT — the request shape below (URL path, auth header,
// payload field names) is NOT verified against Galla's real API. Nobody on
// this project has their API documentation yet. Update GALLA_ENDPOINT_PATH,
// buildGallaPayload(), and the auth header below once you have it — the
// call site in checkout (finalizeOrder) does not need to change, only this file.
//
// What this does either way: after an online order is confirmed, tell Galla
// what sold so a store clerk doesn't sell the same physical unit again.
// Fire-and-logged — never blocks or fails checkout. A failure here is
// recorded in inventory_sync_log (direction='outbound') for manual re-drive,
// not surfaced to the customer.
// =========================================================================

const GALLA_ENDPOINT_PATH = '/webhooks/stagbeetle/stock-adjustment'; // placeholder
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

interface GallaSaleItem {
  sku: string; // variant SKU, e.g. SATN-CRM-M
  quantity: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const buildGallaPayload = (item: GallaSaleItem, orderId: string) => ({
  event_id: `sb-adj-${orderId}-${item.sku}`, // stable per order+sku, safe to retry
  sku: item.sku,
  location_code: 'online_dc', // placeholder — adjust once Galla confirms how it identifies the online channel
  delta: -Math.abs(item.quantity),
  reason: 'online_order',
  reference: orderId,
  occurred_at: new Date().toISOString(),
});

const callGalla = async (payload: ReturnType<typeof buildGallaPayload>): Promise<{ ok: boolean; error?: string }> => {
  const baseUrl = process.env.GALLA_API_URL;
  const apiKey = process.env.GALLA_API_KEY;

  if (!baseUrl) {
    return { ok: false, error: 'GALLA_API_URL not configured — skipping outbound sync' };
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${baseUrl}${GALLA_ENDPOINT_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Placeholder auth scheme — swap for whatever Galla actually requires
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return { ok: true };
      if (attempt === MAX_ATTEMPTS) return { ok: false, error: `Galla responded ${res.status}` };
    } catch (e: any) {
      if (attempt === MAX_ATTEMPTS) return { ok: false, error: e.message || String(e) };
    }
    await sleep(RETRY_DELAY_MS * attempt);
  }
  return { ok: false, error: 'Exhausted retries' };
};

// Called once per confirmed order. Never throws — a slow or unconfigured
// inventory vendor should never be why a customer's checkout fails.
export const notifyGallaOfSale = async (orderId: string, items: GallaSaleItem[]): Promise<void> => {
  for (const item of items) {
    const payload = buildGallaPayload(item, orderId);
    const result = await callGalla(payload);

    if (supabase) {
      try {
        await supabase.from('inventory_sync_log').insert([{
          direction: 'outbound',
          external_event_id: payload.event_id,
          variant_sku: item.sku,
          payload,
          status: result.ok ? 'applied' : 'failed',
          error_message: result.error,
        }]);
      } catch (e) {
        console.warn('[Galla Sync] Failed to write sync log:', e);
      }
    }

    if (!result.ok) {
      console.warn(`[Galla Sync] Failed to notify Galla for order ${orderId}, SKU ${item.sku}:`, result.error);
    }
  }
};
