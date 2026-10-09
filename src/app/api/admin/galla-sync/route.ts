// /api/admin/galla-sync — backs /admin/inventory-sync.
//
//   GET  → health report: every size on the site against Galla's live stock
//          list, plus recent sync activity (Galla pushes, rejections, pulls)
//   POST → "Sync now": pull Galla's stock into ours (same code as the daily
//          cron), then return the fresh report
//
// Admin only — see ensureAdmin in src/lib/adminAuth.ts.
import { ensureAdmin, type AdminClient } from '@/lib/adminAuth';
import { buildGallaHealthReport, pullGallaStock } from '@/lib/gallaStockPull';

export const maxDuration = 60;

// inventory_sync_log is admin-read only (RLS), so this uses the admin's own session.
const recentActivity = async (supabase: AdminClient) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [lastPush, lastPull, rejected] = await Promise.all([
    supabase.from('inventory_sync_log').select('created_at,status,variant_sku')
      .eq('direction', 'inbound').not('external_event_id', 'is', null)
      .not('external_event_id', 'like', 'galla-pull-%').not('external_event_id', 'like', 'galla-csv-%')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('inventory_sync_log').select('created_at,status,payload')
      .like('external_event_id', 'galla-pull-%')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('inventory_sync_log').select('created_at', { count: 'exact' })
      .eq('direction', 'inbound').like('error_message', 'Rejected:%').gte('created_at', since)
      .order('created_at', { ascending: false }).limit(1),
  ]);
  return {
    last_galla_push: lastPush.data ? { at: lastPush.data.created_at, status: lastPush.data.status, sku: lastPush.data.variant_sku } : null,
    last_pull: lastPull.data ? { at: lastPull.data.created_at, changed: (lastPull.data.payload as { changes?: unknown[] } | null)?.changes?.length ?? 0 } : null,
    rejected_last_24h: rejected.count ?? 0,
    last_rejected_at: rejected.data?.[0]?.created_at ?? null,
  };
};

export async function GET(request: Request) {
  const auth = await ensureAdmin(request);
  if (!auth.ok) return Response.json({ error: 'Not authorised' }, { status: auth.status });
  try {
    const [report, activity] = await Promise.all([buildGallaHealthReport(), recentActivity(auth.supabase)]);
    return Response.json({ report, activity });
  } catch (error) {
    console.error('[Admin Galla Sync] Report failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Could not reach Galla' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await ensureAdmin(request);
  if (!auth.ok) return Response.json({ error: 'Not authorised' }, { status: auth.status });
  try {
    const result = await pullGallaStock({ dryRun: false });
    const [report, activity] = await Promise.all([buildGallaHealthReport(), recentActivity(auth.supabase)]);
    return Response.json({ result, report, activity });
  } catch (error) {
    console.error('[Admin Galla Sync] Sync failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 502 });
  }
}
