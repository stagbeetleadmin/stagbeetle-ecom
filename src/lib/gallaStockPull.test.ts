// Run with: npm test   (node --test, TypeScript stripped natively)
import test from 'node:test';
import assert from 'node:assert/strict';

import { planGallaPull, RECENT_LOCAL_CHANGE_MS, type VariantStock } from './gallaStockPull';

const NOW = Date.parse('2026-10-09T10:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const variant = (sku: string, galla_sku: string | null, qty: number | null, extra: Partial<VariantStock> = {}): VariantStock => ({
  variant_id: `id-${sku}`, sku, galla_sku, quantity_on_hand: qty,
  last_synced_at: ago(60 * 60 * 1000), updated_at: ago(60 * 60 * 1000), ...extra,
});

test('matches on Galla barcode case-insensitively and only plans real changes', () => {
  const plan = planGallaPull(
    [{ barcode: 'WINGSF.SM', qty: 4 }, { barcode: 'wingsf.sl', qty: 2 }, { barcode: 'OTHERITEM', qty: 9 }],
    [variant('WINGS-F.S-M', 'WINGSF.SM', 5), variant('WINGS-F.S-L', 'WINGSF.SL', 2)],
    NOW,
  );
  assert.deepEqual(plan.changes, [{ variant_id: 'id-WINGS-F.S-M', sku: 'WINGS-F.S-M', before: 5, after: 4 }]);
  assert.equal(plan.unchanged, 1);
});

test('negative Galla stock is stored as 0; untracked sizes get a row', () => {
  const plan = planGallaPull(
    [{ barcode: 'A', qty: -3 }, { barcode: 'B', qty: 6 }],
    [variant('A-1', 'A', 2), variant('B-1', 'B', null, { last_synced_at: null, updated_at: null })],
    NOW,
  );
  assert.deepEqual(plan.changes.map(c => [c.sku, c.before, c.after]), [['A-1', 2, 0], ['B-1', null, 6]]);
});

test('sizes missing from Galla (or with no barcode) are left alone, never zeroed', () => {
  const plan = planGallaPull([{ barcode: 'A', qty: 1 }], [variant('X-1', 'NOTTHERE', 7), variant('Y-1', null, 3)], NOW);
  assert.deepEqual(plan.changes, []);
  assert.deepEqual(plan.notInGalla, ['X-1', 'Y-1']);
});

test('a size just sold online is deferred until Galla has caught up', () => {
  const justSold = variant('A-1', 'A', 4, { last_synced_at: ago(10 * 60 * 1000), updated_at: ago(30 * 1000) });
  assert.deepEqual(planGallaPull([{ barcode: 'A', qty: 5 }], [justSold], NOW).skippedRecentLocalChange, ['A-1']);

  const longAgo = variant('A-1', 'A', 4, { last_synced_at: ago(20 * 60 * 1000), updated_at: ago(RECENT_LOCAL_CHANGE_MS + 1000) });
  assert.equal(planGallaPull([{ barcode: 'A', qty: 5 }], [longAgo], NOW).changes.length, 1);

  // Our own last sync just wrote it — not a local change, so a newer Galla count applies.
  const ourSync = variant('A-1', 'A', 4, { last_synced_at: ago(30 * 1000), updated_at: ago(30 * 1000) });
  assert.equal(planGallaPull([{ barcode: 'A', qty: 3 }], [ourSync], NOW).changes.length, 1);
});

test('health rows: each size gets the right status, worst problems first', async () => {
  const { buildHealthRows } = await import('./gallaStockPull');
  const detail = (sku: string, galla_sku: string | null, qty: number | null) => ({
    ...variant(sku, galla_sku, qty), size: sku.split('-').pop()!, product_id: 'p', product_title: 'T', product_sku: 'X', sync_source: null,
  });
  const rows = buildHealthRows(
    [{ barcode: 'A', qty: 2 }, { barcode: 'B', qty: -1 }, { barcode: 'C', qty: 4 }, { barcode: 'JAMUS', qty: 0 }],
    [detail('A-S', 'A', 2), detail('B-M', 'B', 3), detail('C-L', 'C', null), detail('JAMU-ML-S', 'JAMUMLS', null), detail('Z-XL', 'ZXL', 5)],
  );
  assert.deepEqual(rows.map(r => [r.sku, r.status]), [
    ['JAMU-ML-S', 'not_in_galla_open'],
    ['B-M', 'mismatch'],     // Galla -1 → site should be 0
    ['C-L', 'untracked'],
    ['Z-XL', 'not_in_galla'],
    ['A-S', 'in_sync'],
  ]);
  assert.deepEqual(rows[0].suggestions, ['JAMUS']);
});
