// Run with: npm test   (node --test, TypeScript stripped natively)
import test from 'node:test';
import assert from 'node:assert/strict';

import { verifyInventoryRequest } from './inventoryAuth';

process.env.INVENTORY_SYNC_API_KEY = 'test-key-123';
delete process.env.INVENTORY_SYNC_SECRET;
delete process.env.INVENTORY_SYNC_ALLOWED_IPS;

const req = (headers: Record<string, string>) =>
  new Request('https://example.test/api/inventory/sync', { method: 'POST', headers });

test('accepts the key in an `api-key` header (how Galla sends it)', async () => {
  assert.equal((await verifyInventoryRequest(req({ 'api-key': 'test-key-123' }), '')).ok, true);
});

test('still accepts Authorization: Bearer', async () => {
  assert.equal((await verifyInventoryRequest(req({ authorization: 'Bearer test-key-123' }), '')).ok, true);
});

test('rejects a wrong or missing key', async () => {
  assert.equal((await verifyInventoryRequest(req({ 'api-key': 'wrong' }), '')).status, 401);
  assert.equal((await verifyInventoryRequest(req({}), '')).status, 401);
});
