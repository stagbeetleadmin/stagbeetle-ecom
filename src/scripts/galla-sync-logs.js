// Writes the Galla ⇄ inventory sync history to logs/galla-sync.log and
// prints a summary — every stock update Galla pushed to /api/inventory/sync,
// every rejected attempt (with why), our stock-list pulls, and outbound
// order notifications to Galla.
//
//   npm run galla:logs              # last 7 days
//   npm run galla:logs -- --days 30
//
// The live record is the inventory_sync_log table (the deployed app can't
// write files); this just exports it. Uses DATABASE_URL from .env.local and
// psql, like `npm run sql`. logs/ is gitignored — it holds stock data.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const daysArg = process.argv.indexOf('--days');
const days = daysArg > -1 ? Math.max(1, parseInt(process.argv[daysArg + 1], 10) || 7) : 7;

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const envVar = name => (env.match(new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm'))?.[1] || '').trim().replace(/['"]/g, '');
const databaseUrl = envVar('DATABASE_URL');
if (!databaseUrl) {
  console.error('\x1b[31mError: DATABASE_URL is not set in .env.local\x1b[0m');
  process.exit(1);
}

const sql = `
SELECT json_agg(t ORDER BY t.created_at) FROM (
  SELECT created_at, direction, status, external_event_id, variant_sku, payload, error_message
  FROM public.inventory_sync_log
  WHERE created_at > now() - interval '${days} days'
) t;`;
const result = spawnSync('psql', [databaseUrl, '--no-psqlrc', '-At', '-c', sql], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
if (result.error) {
  console.error('\x1b[31mError: psql not found. Install it with: brew install libpq && brew link --force libpq\x1b[0m');
  process.exit(1);
}
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(1);
}
const rows = JSON.parse(result.stdout.trim() || 'null') || [];

// Same fingerprint as src/lib/inventoryAuth.ts — compare with the
// api_key_fingerprint on rejected requests to see whose key Galla is sending.
const fingerprint = key => key ? `len${key.length}:${crypto.createHash('sha256').update(key).digest('hex').slice(0, 8)}` : '(not set)';
const ourKey = fingerprint(envVar('INVENTORY_SYNC_API_KEY'));

const kind = r => {
  if (r.direction === 'outbound') return 'OUT  order→Galla';
  if (r.error_message?.startsWith('Rejected:')) return 'IN   rejected   ';
  if (r.external_event_id?.startsWith('galla-pull-')) return 'PULL stock-list ';
  if (r.external_event_id?.startsWith('galla-csv-')) return 'CSV  import     ';
  return 'IN   Galla push ';
};

const describe = r => {
  const p = r.payload || {};
  if (r.error_message?.startsWith('Rejected:')) {
    return `${r.error_message} from ${p.ip} ${p.path} key=${'api_key_fingerprint' in p ? (p.api_key_fingerprint || p.bearer_fingerprint || 'none sent') : 'not recorded'}${p.body_preview ? ` body=${p.body_preview.slice(0, 300)}` : ''}`;
  }
  if (p.reason === 'galla_stock_list_pull') {
    return `${(p.changes || []).length} size(s) updated: ${(p.changes || []).map(c => `${c.sku} ${c.before ?? '∅'}→${c.after}`).join(', ')}${(p.failed || []).length ? ` | FAILED ${p.failed.map(f => f.sku).join(',')}` : ''}`;
  }
  if (r.direction === 'inbound' && p.sku !== undefined) {
    return `${p.sku} qty=${p.quantity_on_hand} at ${p.occurred_at}${r.error_message ? ` — ${r.error_message}` : ''}`;
  }
  return `${r.variant_sku || ''} ${JSON.stringify(p).slice(0, 300)}${r.error_message ? ` — ${r.error_message}` : ''}`;
};

const lines = rows.map(r => `${r.created_at}  ${kind(r)}  ${r.status.padEnd(18)} ${describe(r)}`);
const outDir = path.join(process.cwd(), 'logs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'galla-sync.log');
fs.writeFileSync(outFile, [
  `# Galla sync log — last ${days} day(s), exported ${new Date().toISOString()}`,
  `# Our INVENTORY_SYNC_API_KEY fingerprint (local .env.local): ${ourKey}`,
  '',
  ...lines,
  '',
].join('\n'));

const count = pred => rows.filter(pred).length;
const rejected = rows.filter(r => r.error_message?.startsWith('Rejected:'));
const pushes = rows.filter(r => r.direction === 'inbound' && r.payload?.sku !== undefined);
const lastPush = pushes[pushes.length - 1];
console.log(`\nGalla sync — last ${days} day(s)`);
console.log(`  Galla pushes accepted:    ${count(r => pushes.includes(r) && r.status === 'applied')}`);
console.log(`  Galla pushes not applied: ${count(r => pushes.includes(r) && r.status !== 'applied')}  (unknown SKU / stale / duplicate)`);
console.log(`  Rejected (auth):          ${rejected.length}${rejected.length ? `  — last ${rejected[rejected.length - 1].created_at}` : ''}`);
console.log(`  Stock-list pulls:         ${count(r => r.external_event_id?.startsWith('galla-pull-'))}`);
console.log(`  Orders sent to Galla:     ${count(r => r.direction === 'outbound' && r.status === 'applied')} ok, ${count(r => r.direction === 'outbound' && r.status === 'failed')} failed`);
console.log(`  Last accepted push:       ${lastPush ? `${lastPush.created_at} (${lastPush.status})` : 'none'}`);
const seenKeys = [...new Set(rejected.map(r => r.payload?.api_key_fingerprint).filter(Boolean))];
if (seenKeys.length) {
  console.log(`\n  Key Galla sends: ${seenKeys.join(', ')}   Our key: ${ourKey}${seenKeys.includes(ourKey) ? '  (match — so production must have a different key set)' : '  (different key)'}`);
}
console.log(`\n\x1b[36mWrote ${rows.length} entries to ${path.relative(process.cwd(), outFile)}\x1b[0m`);
