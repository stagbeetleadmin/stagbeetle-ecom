// Turns raw inventory_sync_log rows into plain-English entries for the admin
// Sync Logs tab (/admin/inventory-sync?tab=logs). Pure — no DB access here.

export type SyncLogType = 'galla_push' | 'rejected' | 'pull' | 'csv' | 'order' | 'other';

export interface RawSyncLogRow {
  id: string;
  created_at: string;
  direction: string;
  status: string;
  external_event_id: string | null;
  variant_sku: string | null;
  payload: Record<string, unknown> | null;
  error_message: string | null;
}

export interface SyncLogEntry {
  id: string;
  at: string;
  type: SyncLogType;
  status: string;
  ok: boolean;
  codes: string[]; // SKUs / barcodes this entry is about
  summary: string;
  detail: string | null; // what went wrong / what to do, when not ok
  payload: Record<string, unknown> | null;
}

export const SYNC_LOG_TYPE_LABELS: Record<SyncLogType, string> = {
  galla_push: 'Galla → site update',
  rejected: 'Rejected Galla call',
  pull: 'Full sync from Galla',
  csv: 'CSV import',
  order: 'Online order → Galla',
  other: 'Other',
};

export const syncLogType = (r: Pick<RawSyncLogRow, 'direction' | 'external_event_id' | 'error_message'>): SyncLogType => {
  if (r.direction === 'outbound') return 'order';
  if (r.error_message?.startsWith('Rejected:')) return 'rejected';
  if (r.external_event_id?.startsWith('galla-pull-')) return 'pull';
  if (r.external_event_id?.startsWith('galla-csv-')) return 'csv';
  if (r.external_event_id) return 'galla_push';
  return 'other';
};

const OK_STATUSES = ['applied', 'skipped_duplicate'];

const PUSH_STATUS_TEXT: Record<string, string> = {
  applied: 'applied',
  sku_not_found: 'no size on the site has this SKU or barcode',
  skipped_stale: 'ignored — older than the count we already had',
  skipped_duplicate: 'already processed (Galla retried)',
  failed: 'could not be saved',
};

type PullChange = { sku: string; before: number | null; after: number };

// `ourKeyFingerprint` (from keyFingerprint(INVENTORY_SYNC_API_KEY)) lets a
// rejection say whether Galla sent the wrong key or none at all.
export const describeSyncLog = (r: RawSyncLogRow, focus: string[] = [], ourKeyFingerprint: string | null = null): SyncLogEntry => {
  const p = (r.payload ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const type = syncLogType(r);
  const codes = (r.variant_sku ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = OK_STATUSES.includes(r.status);
  let summary = '';
  let detail: string | null = ok ? null : r.error_message;

  switch (type) {
    case 'rejected': {
      const sent = p.api_key_fingerprint || p.bearer_fingerprint;
      summary = `Galla call to ${p.path ?? 'our API'} rejected`;
      detail = p.reason === 'ip_not_allowed'
        ? `Caller IP ${p.ip} is not in INVENTORY_SYNC_ALLOWED_IPS.`
        : !('api_key_fingerprint' in p)
          ? `Wrong or missing API key (from ${p.ip}; key fingerprint not recorded for entries before 9 Oct 2026).`
          : !sent
            ? `No API key sent (from ${p.ip}). Galla must send the api-key header.`
            : `Wrong API key (from ${p.ip}): Galla sent ${sent}, ours is ${ourKeyFingerprint ?? 'unknown'}. Update the key in Galla → Integration → Website Integration → API Key.`;
      break;
    }
    case 'galla_push':
      summary = `Galla set ${p.sku ?? r.variant_sku ?? '?'} to ${p.quantity_on_hand ?? '?'} — ${PUSH_STATUS_TEXT[r.status] ?? r.status}`;
      if (r.status === 'sku_not_found') detail = `Galla sent "${p.sku}", which matches no size's SKU or Galla barcode. Fix the size's barcode in the Validation tab.`;
      if (r.status === 'skipped_stale') detail = null;
      break;
    case 'pull': {
      const changes: PullChange[] = Array.isArray(p.changes) ? p.changes : [];
      const failed: { sku: string; error: string }[] = Array.isArray(p.failed) ? p.failed : [];
      const wanted = focus.map(f => f.toUpperCase());
      const relevant = wanted.length ? changes.filter(c => wanted.includes(c.sku.toUpperCase())) : changes;
      summary = wanted.length && relevant.length
        ? relevant.map(c => `Full sync set ${c.sku}: ${c.before ?? 'untracked'} → ${c.after}`).join('; ')
        : `Full sync: ${changes.length} size(s) updated${failed.length ? `, ${failed.length} failed` : ''}`;
      if (failed.length) detail = failed.map(f => `${f.sku}: ${f.error}`).join('; ');
      break;
    }
    case 'csv':
      summary = `CSV stock import (${p.file ?? 'file'}): ${p.matched ?? '?'} size(s)`;
      break;
    case 'order':
      if (p.reason === 'order_deduction') {
        summary = `Online order ${p.order_id}: deduct ${p.quantity} × ${r.variant_sku}`;
        if (!ok) detail = `${r.error_message ?? 'Deduction failed'}. The order went through; check the size's stock by hand.`;
      } else if (p.reason === 'galla_sku_not_mapped') {
        summary = `Online order ${p.order_id}: ${r.variant_sku} not sent to Galla`;
        detail = 'This size has no Galla barcode, so Galla was not told it sold. Set its barcode in the Validation tab.';
      } else if (p.event === 'order.created') {
        const lines: { sku: string; qty: number }[] = Array.isArray(p.line_items) ? p.line_items : [];
        summary = `Sent online order ${p.external_order_id} to Galla: ${lines.map(l => `${l.qty} × ${l.sku}`).join(', ')}`;
        if (!ok) detail = `${r.error_message ?? 'Galla did not accept it'}. Galla's stock for these items is now too high — adjust it in Galla.`;
      } else {
        summary = `Outbound: ${r.variant_sku ?? ''}`;
      }
      break;
    default:
      summary = r.error_message ?? r.status;
  }

  return { id: r.id, at: r.created_at, type, status: r.status, ok, codes, summary, detail, payload: r.payload };
};
