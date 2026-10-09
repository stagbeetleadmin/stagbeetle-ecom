// Pulls live stock from Galla's stock-list API into our inventory — the same
// code the daily Vercel cron runs (/api/inventory/galla-pull), on demand.
//
//   npm run galla:pull             # dry run: report what would change
//   npm run galla:pull -- --apply  # write it
//
// Reads GALLA_* and Supabase settings from .env.local.
import { pullGallaStock } from '../lib/gallaStockPull';

const apply = process.argv.includes('--apply');
const result = await pullGallaStock({ dryRun: !apply });

console.log(`\nGalla items: ${result.galla_items}   Our sizes: ${result.our_sizes}`);
console.log(`Unchanged: ${result.unchanged}   ${apply ? 'Updated' : 'Would update'}: ${result.applied.length}   Failed: ${result.failed.length}`);
if (result.applied.length) {
  console.log(`\n== ${apply ? 'Updated' : 'Would update'}`);
  for (const c of result.applied) console.log(`  ${c.sku.padEnd(22)} ${String(c.before ?? 'untracked').padStart(9)} → ${c.after}`);
}
if (result.skipped_recent_local_change.length) {
  console.log(`\n== Deferred (changed on our side in the last few minutes): ${result.skipped_recent_local_change.join(', ')}`);
}
if (result.not_in_galla.length) {
  console.log(`\n== Our sizes not in Galla's list (left unchanged): ${result.not_in_galla.join(', ')}`);
}
for (const f of result.failed) console.log(`\x1b[31m  FAILED ${f.sku}: ${f.error}\x1b[0m`);
console.log(apply ? '\n\x1b[32m✓ Done.\x1b[0m' : '\n\x1b[36mDry run — nothing was changed. Re-run with --apply to write it.\x1b[0m');
