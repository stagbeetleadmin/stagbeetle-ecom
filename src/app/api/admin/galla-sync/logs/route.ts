// GET /api/admin/galla-sync/logs — the Sync Logs tab. Admin only (the log
// table is admin-read RLS, so this queries as the admin's own session).
//
//   ?type=all|galla_push|rejected|pull|csv|order
//   &problems=1          only entries that didn't apply cleanly
//   &days=7              1–90
//   &codes=SKU,BARCODE   entries about these SKUs / Galla barcodes
//   &page=0              50 per page, newest first
import { ensureAdmin } from '@/lib/adminAuth';
import { keyFingerprint } from '@/lib/inventoryAuth';
import { describeSyncLog, type RawSyncLogRow } from '@/lib/gallaSyncLog';

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) return Response.json({ error: 'Not authorised' }, { status: auth.status });

  const params = new URL(request.url).searchParams;
  const type = params.get('type') || 'all';
  const days = Math.min(90, Math.max(1, parseInt(params.get('days') || '7', 10) || 7));
  const page = Math.max(0, parseInt(params.get('page') || '0', 10) || 0);
  // Characters that would break PostgREST's or() syntax are dropped.
  const codes = (params.get('codes') || '').split(',').map(c => c.replace(/[^A-Za-z0-9._-]/g, '').trim()).filter(Boolean).slice(0, 10);

  let query = auth.supabase.from('inventory_sync_log')
    .select('id,created_at,direction,status,external_event_id,variant_sku,payload,error_message', { count: 'exact' })
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  if (type === 'order') query = query.eq('direction', 'outbound');
  else if (type === 'rejected') query = query.like('error_message', 'Rejected:%');
  else if (type === 'pull') query = query.like('external_event_id', 'galla-pull-%');
  else if (type === 'csv') query = query.like('external_event_id', 'galla-csv-%');
  else if (type === 'galla_push') {
    query = query.eq('direction', 'inbound').not('external_event_id', 'is', null)
      .not('external_event_id', 'like', 'galla-pull-%').not('external_event_id', 'like', 'galla-csv-%');
  }
  if (params.get('problems') === '1') query = query.not('status', 'in', '(applied,skipped_duplicate)');
  if (codes.length) {
    query = query.or(codes.flatMap(c => [`variant_sku.ilike."%${c}%"`, `payload->>sku.ilike."${c}"`]).join(','));
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ours = keyFingerprint(process.env.INVENTORY_SYNC_API_KEY?.trim() ?? '');
  return Response.json({
    entries: (data as RawSyncLogRow[]).map(r => describeSyncLog(r, codes, ours)),
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  });
}
