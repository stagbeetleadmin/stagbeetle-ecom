// Run with: npm test   (node --test, TypeScript stripped natively)
import test from 'node:test';
import assert from 'node:assert/strict';

import { variantSkuFor, gallaBarcodeFor, isAutoBarcode } from './gallaBarcode';

test('barcode matches Galla Item Manager: hyphens dropped, dots kept', () => {
  assert.equal(gallaBarcodeFor('WINGS-F.S-XXL'), 'WINGSF.SXXL');
  assert.equal(gallaBarcodeFor('WINGS-F.S-M'), 'WINGSF.SM');
  assert.equal(gallaBarcodeFor('FETHR-F.S-XL'), 'FETHRF.SXL');
});

test('each size gets its own SKU and therefore its own barcode', () => {
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const barcodes = sizes.map(size => gallaBarcodeFor(variantSkuFor('wings-f.s', size)));
  assert.deepEqual(barcodes, ['WINGSF.SS', 'WINGSF.SM', 'WINGSF.SL', 'WINGSF.SXL', 'WINGSF.SXXL']);
});

test('auto barcodes can be re-derived; hand-entered overrides are left alone', () => {
  assert.equal(isAutoBarcode(null, 'WINGS-F.S-M'), true);
  assert.equal(isAutoBarcode('WINGS-F.S-M', 'WINGS-F.S-M'), true); // old rule: SKU sent as-is
  assert.equal(isAutoBarcode('WINGSF.SM', 'WINGS-F.S-M'), true);
  assert.equal(isAutoBarcode('8901234567890', 'WINGS-F.S-M'), false);
});
