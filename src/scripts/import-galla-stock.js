// Imports stock counts from a Galla Item Manager CSV export into our
// inventory table — only for sizes that already exist in our catalog.
//
//   npm run galla:import -- "<path/to/export.csv>"           # dry run: report only
//   npm run galla:import -- "<path/to/export.csv>" --apply   # write it
//
// Export from Galla: Item Manager → Show "All" entries → Export → CSV.
// (With "Show 1,000 entries" the export silently stops at 1,000 rows.)
//
// Matching, per size-variant in product_variants:
//   1. Galla "Barcode"   = our galla_sku  (the normal case: WINGSF.SM)
//   2. Galla "Item Name" = our sku        (fallback, only when that name is
//      unique in the export) — and our galla_sku is corrected to Galla's
//      real barcode, so the order webhook targets the same item.
// Galla items with no matching size on our site are ignored — nothing is
// ever created. Negative Galla stock is imported as 0.
//
// Uses DATABASE_URL from .env.local and psql, like `npm run sql`. Runs as one
// transaction; the dry run rolls it back.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const file = process.argv[2];
const apply = process.argv.includes('--apply');
if (!file || !fs.existsSync(file)) {
  console.error('\x1b[31mUsage: npm run galla:import -- "<path/to/galla-export.csv>" [--apply]\x1b[0m');
  process.exit(1);
}

const envPath = path.join(process.cwd(), '.env.local');
const match = fs.existsSync(envPath) && fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*(.*)$/m);
const databaseUrl = match ? match[1].trim().replace(/['"]/g, '') : '';
if (!databaseUrl) {
  console.error('\x1b[31mError: DATABASE_URL is not set in .env.local\x1b[0m');
  process.exit(1);
}

// Minimal CSV parser — Galla quotes every field; handles "" escapes.
const parseCsv = text => {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(f => f.trim()));
};

const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
const col = name => header.findIndex(h => h.trim().toLowerCase() === name);
const iBarcode = col('barcode'), iName = col('item name'), iStock = col('total stock');
if (iBarcode < 0 || iName < 0 || iStock < 0) {
  console.error('\x1b[31mError: expected "Barcode", "Item Name" and "Total Stock" columns in the CSV.\x1b[0m');
  process.exit(1);
}

const items = rows
  .map(r => ({ barcode: r[iBarcode].trim(), name: r[iName].trim(), qty: Math.trunc(Number(r[iStock])) }))
  .filter(r => r.barcode && Number.isFinite(r.qty));
console.log(`\nRead ${items.length} Galla items from ${path.basename(file)}`);
if (items.length === 1000) {
  console.log('\x1b[33m⚠ Exactly 1,000 rows — the export was probably cut off. Re-export with "Show All" entries.\x1b[0m');
}

const lit = s => `'${String(s).replace(/'/g, "''")}'`;
const values = items.map(r => `(${lit(r.barcode)}, ${lit(r.name)}, ${r.qty})`).join(',\n');

const sql = `
\\set ON_ERROR_STOP 1
\\pset footer off
BEGIN;
CREATE TEMP TABLE galla_stock (barcode TEXT, item_name TEXT, qty INTEGER) ON COMMIT DROP;
INSERT INTO galla_stock VALUES
${values};

CREATE TEMP TABLE matched ON COMMIT DROP AS
SELECT DISTINCT ON (v.id)
  v.id AS variant_id, v.sku, v.galla_sku AS old_barcode, g.barcode,
  i.quantity_on_hand AS old_qty, GREATEST(g.qty, 0) AS qty,
  upper(g.barcode) = upper(coalesce(v.galla_sku, '')) AS by_barcode
FROM public.product_variants v
JOIN galla_stock g
  ON upper(g.barcode) = upper(coalesce(v.galla_sku, ''))
  OR (upper(g.item_name) = upper(v.sku)
      AND (SELECT count(*) FROM galla_stock g2 WHERE upper(g2.item_name) = upper(g.item_name)) = 1)
LEFT JOIN public.inventory i ON i.variant_id = v.id
ORDER BY v.id, (upper(g.barcode) = upper(coalesce(v.galla_sku, ''))) DESC;

\\echo
\\echo '== Summary'
SELECT
  (SELECT count(*) FROM public.product_variants) AS our_sizes,
  count(*) AS matched,
  count(*) FILTER (WHERE old_qty IS DISTINCT FROM qty) AS stock_changes,
  count(*) FILTER (WHERE old_qty IS NULL) AS newly_tracked,
  count(*) FILTER (WHERE qty = 0) AS out_of_stock,
  count(*) FILTER (WHERE NOT by_barcode) AS barcode_corrections
FROM matched;

\\echo '== Barcode corrections (matched by item name; galla_sku set to Galla''s barcode)'
SELECT sku, old_barcode, barcode AS galla_barcode FROM matched WHERE NOT by_barcode ORDER BY sku;

\\echo '== Stock changes'
SELECT sku, coalesce(old_qty::text, 'untracked') AS before, qty AS after FROM matched
WHERE old_qty IS DISTINCT FROM qty ORDER BY sku;

\\echo '== Our sizes NOT found in this Galla export (left unchanged)'
SELECT v.sku, v.galla_sku, left(p.title, 60) AS product
FROM public.product_variants v JOIN public.products p ON p.id = v.product_id
WHERE v.id NOT IN (SELECT variant_id FROM matched) ORDER BY v.sku;

UPDATE public.product_variants v SET galla_sku = m.barcode
FROM matched m WHERE v.id = m.variant_id AND NOT m.by_barcode;

INSERT INTO public.inventory (variant_id, quantity_on_hand, sync_source, last_synced_at)
SELECT variant_id, qty, 'external_pos', now() FROM matched
ON CONFLICT (variant_id) DO UPDATE SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  sync_source = 'external_pos',
  last_synced_at = now(),
  updated_at = now(),
  version = public.inventory.version + 1;

INSERT INTO public.inventory_sync_log (direction, external_event_id, payload, status)
SELECT 'inbound', 'galla-csv-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
       jsonb_build_object('reason', 'galla_csv_import', 'file', ${lit(path.basename(file))}, 'matched', count(*)),
       'applied'
FROM matched;

${apply ? 'COMMIT;' : 'ROLLBACK;'}
`;

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'galla-import-')), 'import.sql');
fs.writeFileSync(tmp, sql);
const result = spawnSync('psql', [databaseUrl, '--no-psqlrc', '-q', '-f', tmp], { stdio: 'inherit' });
fs.rmSync(path.dirname(tmp), { recursive: true, force: true });

if (result.error) {
  console.error('\x1b[31mError: psql not found. Install it with: brew install libpq && brew link --force libpq\x1b[0m');
  process.exit(1);
}
if (result.status !== 0) {
  console.error('\x1b[31m✕ Failed — rolled back, nothing was changed.\x1b[0m');
  process.exit(1);
}
console.log(apply
  ? '\x1b[32m✓ Stock imported.\x1b[0m'
  : '\x1b[36mDry run — nothing was changed. Re-run with --apply to write it.\x1b[0m');
