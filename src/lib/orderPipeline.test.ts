// Run with: npm test   (node --test, TypeScript stripped natively)
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { aggregateLines, orderIdForPayment, validateDraft, verifyPayment, PipelineError } from './orderPipeline';

const draft = {
  customer_name: 'Test', customer_email: 't@example.com', shipping_address: 'Addr', total_price: 799,
  items: [{ product_id: 'prod_1', title: 'Shirt', price: 799, quantity: 1, selected_size: 'M', selected_color: 'Cream', image: '' }],
};

test('same payment always maps to the same order id (idempotent finalize)', () => {
  assert.equal(orderIdForPayment('pay_ABC123xyz'), 'order_abc123xyz');
  assert.equal(orderIdForPayment('pay_ABC123xyz'), orderIdForPayment('pay_ABC123xyz'));
  assert.notEqual(orderIdForPayment('pay_A'), orderIdForPayment('pay_B'));
});

test('same product+size in the cart twice is deducted as one line', () => {
  const lines = aggregateLines([
    { product_id: 'p1', selected_size: 'M', quantity: 1 },
    { product_id: 'p1', selected_size: 'M', quantity: 2 },
    { product_id: 'p1', selected_size: 'L', quantity: 1 },
  ]);
  assert.deepEqual(lines, [
    { product_id: 'p1', selected_size: 'M', quantity: 3 },
    { product_id: 'p1', selected_size: 'L', quantity: 1 },
  ]);
});

test('draft validation rejects empty carts and bad quantities', () => {
  assert.equal(validateDraft(draft), draft);
  assert.throws(() => validateDraft({ ...draft, items: [] }), PipelineError);
  assert.throws(() => validateDraft({ ...draft, items: [{ ...draft.items[0], quantity: 0 }] }), PipelineError);
  assert.throws(() => validateDraft({ ...draft, total_price: -1 }), PipelineError);
  assert.throws(() => validateDraft(null), PipelineError);
});

test('forged Razorpay signature is rejected before anything is recorded', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
  process.env.RAZORPAY_KEY_SECRET = 'secret';
  const proof = { razorpay_order_id: 'order_rzp1', razorpay_payment_id: 'pay_1', razorpay_signature: 'ab'.repeat(32) };
  await assert.rejects(verifyPayment(proof, 799), (e: PipelineError) => e.status === 400 && /signature/.test(e.message));

  // A correct signature gets past the HMAC check (then fails on the network fetch, which is expected offline)
  const good = crypto.createHmac('sha256', 'secret').update('order_rzp1|pay_1').digest('hex');
  await assert.rejects(verifyPayment({ ...proof, razorpay_signature: good }, 799), (e: Error) => !/signature/.test(e.message));
});
