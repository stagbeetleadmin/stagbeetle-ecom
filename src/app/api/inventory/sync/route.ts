import { applyInboundInventorySync, InboundInventoryEvent } from '@/lib/db';
import { verifyInventoryRequest } from '@/lib/inventoryAuth';

const MAX_EVENTS_PER_BATCH = 500;

// Inbound stock sync — called by the external inventory/POS system (e.g.
// Galla) whenever a sale, restock, or transfer changes what's on hand.
// Signed with HMAC-SHA256 over the raw body, the same scheme already used
// to verify Razorpay webhooks elsewhere in this app.
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const auth = await verifyInventoryRequest(request, rawBody);
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    let body: { events?: InboundInventoryEvent[]; dry_run?: boolean };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Malformed JSON body' }, { status: 400 });
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return Response.json({ error: '`events` must be a non-empty array' }, { status: 400 });
    }
    if (body.events.length > MAX_EVENTS_PER_BATCH) {
      return Response.json({ error: `Batch too large — max ${MAX_EVENTS_PER_BATCH} events per request` }, { status: 400 });
    }

    for (const event of body.events) {
      if (!event.external_event_id || !event.sku || typeof event.quantity_on_hand !== 'number' || !event.occurred_at) {
        return Response.json(
          { error: 'Each event requires external_event_id, sku, quantity_on_hand, and occurred_at' },
          { status: 400 }
        );
      }
    }

    // dry_run: true validates the batch (unknown SKUs, stale timestamps, duplicates)
    // and reports what would happen, without writing anything — for integration testing.
    const dryRun = body.dry_run === true;
    const results = await applyInboundInventorySync(body.events, dryRun);
    return Response.json({ dry_run: dryRun, results });
  } catch (error: any) {
    console.error('[Inventory Sync] Unexpected error:', error);
    return Response.json({ error: 'Sync failed', details: error?.message }, { status: 500 });
  }
}
