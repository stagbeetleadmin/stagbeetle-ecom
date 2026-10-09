import crypto from 'crypto';
import { pullGallaStock } from '@/lib/gallaStockPull';

export const maxDuration = 60;

// Pulls current store stock from Galla's stock-list API into our inventory
// (see src/lib/gallaStockPull.ts). Called by Vercel Cron (vercel.json),
// which sends `Authorization: Bearer $CRON_SECRET`. Add `?dry_run=1` to see
// what would change without writing anything.
const authorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
};

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dryRun = ['1', 'true'].includes(new URL(request.url).searchParams.get('dry_run') ?? '');
  try {
    const result = await pullGallaStock({ dryRun });
    console.info(`[Galla Pull] ${dryRun ? 'dry run: ' : ''}${result.applied.length} changed, ${result.unchanged} unchanged, ${result.failed.length} failed, ${result.skipped_recent_local_change.length} deferred`);
    return Response.json(result, { status: result.failed.length ? 207 : 200 });
  } catch (error: any) {
    console.error('[Galla Pull] Failed:', error);
    return Response.json({ error: 'Galla pull failed', details: error?.message }, { status: 502 });
  }
}
