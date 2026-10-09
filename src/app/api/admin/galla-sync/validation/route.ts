// GET /api/admin/galla-sync/validation — the Validation checklist tab: every
// product and size against each stock rule (see buildValidation). Admin only.
import { ensureAdmin, type AdminClient } from '@/lib/adminAuth';
import { buildValidationReport } from '@/lib/gallaStockPull';

export const maxDuration = 60;

const NOT_ERRORS = '(applied,skipped_duplicate,skipped_stale)';

// Sync errors per SKU/barcode over the last 7 days (rejected calls carry no
// SKU, so they can't be pinned to a size and aren't counted here).
const recentErrorCounts = async (supabase: AdminClient) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase.from('inventory_sync_log')
    .select('external_event_id,variant_sku,payload')
    .gte('created_at', since).not('status', 'in', NOT_ERRORS).not('variant_sku', 'is', null)
    .order('created_at', { ascending: false }).limit(2000);
  const counts = new Map<string, number>();
  const bump = (code: string) => counts.set(code.trim().toUpperCase(), (counts.get(code.trim().toUpperCase()) ?? 0) + 1);
  for (const row of data ?? []) {
    // A pull's variant_sku lists every size it updated — only its `failed` ones are errors.
    if (row.external_event_id?.startsWith('galla-pull-')) {
      const failed = (row.payload as { failed?: { sku: string }[] } | null)?.failed ?? [];
      failed.forEach(f => bump(f.sku));
    } else {
      String(row.variant_sku).split(',').filter(Boolean).forEach(bump);
    }
  }
  return counts;
};

export async function GET(request: Request) {
  const auth = await ensureAdmin(request);
  if (!auth.ok) return Response.json({ error: 'Not authorised' }, { status: auth.status });
  try {
    return Response.json(await buildValidationReport(await recentErrorCounts(auth.supabase)));
  } catch (error) {
    console.error('[Admin Galla Validation] Failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Validation failed' }, { status: 502 });
  }
}
