// Run with: npm test   (node --test, TypeScript stripped natively)
import test from 'node:test';
import assert from 'node:assert/strict';

import { notifyGallaOfSale } from './galla';

// Stub the network: record what would be sent to Galla, never call it.
const sent: { line_items: { sku: string; qty: number }[] }[] = [];
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  sent.push(JSON.parse(String(init.body)));
  return new Response('{"status":"queued"}', { status: 202 });
}) as typeof fetch;

Object.assign(process.env, {
  GALLA_ORDERS_SYNC_URL: 'https://galla.test/orders', GALLA_API_KEY: 'k', GALLA_STORE_CODE: 's', GALLA_LOC_CODE: 'l',
  GALLA_SKU_ALLOWLIST: 'SHIRT-M',
});

test('allowlist: only SHIRT-M is sent to Galla, other products are never touched', async () => {
  sent.length = 0;
  await notifyGallaOfSale('order_t1', [
    { sku: 'SATN-CRM-M', galla_sku: 'SATN-CRM-M', quantity: 1 },
    { sku: 'SHIRT-M', galla_sku: 'SHIRT-M', quantity: 2 },
  ]);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].line_items, [{ sku: 'SHIRT-M', qty: 2 }]);
});

test('allowlist: an order with no SHIRT-M makes no Galla call at all', async () => {
  sent.length = 0;
  await notifyGallaOfSale('order_t2', [{ sku: 'SATN-CRM-M', galla_sku: 'SATN-CRM-M', quantity: 1 }]);
  assert.equal(sent.length, 0);
});

test('production (no allowlist): every sold item is sent to Galla in one order call', async () => {
  delete process.env.GALLA_SKU_ALLOWLIST;
  sent.length = 0;
  await notifyGallaOfSale('order_t3', [
    { sku: 'SATN-CRM-M', galla_sku: 'SATN-CRM-M', quantity: 1 },
    { sku: 'RODIUM-BLK-L', galla_sku: 'RODIUM-BLK-L', quantity: 2 },
    { sku: 'SHIRT-M', galla_sku: 'SHIRT-M', quantity: 1 },
  ]);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].line_items, [
    { sku: 'SATN-CRM-M', qty: 1 },
    { sku: 'RODIUM-BLK-L', qty: 2 },
    { sku: 'SHIRT-M', qty: 1 },
  ]);
});
