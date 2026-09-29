import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabase, type OrderItem } from './db';
import { notifyGallaOfSale } from './galla';

// =========================================================================
// SERVER-SIDE ORDER PIPELINE — runs in /api/orders/finalize, never in the
// browser. Order of operations after Razorpay says "paid":
//
//   1. Verify   — HMAC signature + Razorpay's own record of the payment
//                 (captured/authorized, same order, same amount as the cart).
//   2. Record   — insert the order with an id DERIVED from the payment id,
//                 so a retried/double-submitted finalize hits the primary
//                 key and becomes a no-op instead of a second order.
//   3. Deduct   — atomic per-variant decrement (decrement_inventory_on_hand
//                 RPC), only for a newly recorded order — never twice.
//   4. Sync     — one order.created call to Galla with the sold lines, from
//                 the server (where GALLA_* credentials actually exist).
//
// This used to run in checkout/page.tsx, a client component: GALLA_* env
// vars are undefined in the browser, so step 4 always "skipped — not
// configured", and steps 2–3 were lost if the tab closed after payment.
// =========================================================================

export interface OrderDraft {
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  total_price: number;
  items: OrderItem[];
  coupon_applied?: string;
  discount_amount?: number;
}

export interface PaymentProof {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface SoldLine {
  sku: string;
  galla_sku: string | null;
  quantity: number;
}

export class PipelineError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Same payment → same order id, which is what makes finalize idempotent
// without any new column: the orders primary key is the dedupe key.
export const orderIdForPayment = (paymentId: string) =>
  `order_${paymentId.replace(/^pay_/, '').toLowerCase()}`;

// A cart can hold the same product+size twice (e.g. added from two pages);
// stock is per variant, so deduct and report it as one line.
export const aggregateLines = (items: { product_id: string; selected_size: string; quantity: number }[]) => {
  const byVariant = new Map<string, { product_id: string; selected_size: string; quantity: number }>();
  for (const item of items) {
    const key = `${item.product_id}::${item.selected_size}`;
    const existing = byVariant.get(key);
    if (existing) existing.quantity += item.quantity;
    else byVariant.set(key, { product_id: item.product_id, selected_size: item.selected_size, quantity: item.quantity });
  }
  return [...byVariant.values()];
};

export const validateDraft = (input: unknown): OrderDraft => {
  if (!input || typeof input !== 'object') throw new PipelineError('Missing order', 400);
  const draft = input as OrderDraft;
  const { customer_name, customer_email, shipping_address, total_price, items } = draft;
  if (!customer_name || !customer_email || !shipping_address) throw new PipelineError('Missing customer details', 400);
  if (typeof total_price !== 'number' || !(total_price > 0)) throw new PipelineError('Invalid total', 400);
  if (!Array.isArray(items) || items.length === 0) throw new PipelineError('Order has no items', 400);
  for (const item of items) {
    if (!item?.product_id || !item?.selected_size || !Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new PipelineError('Invalid order item', 400);
    }
  }
  return draft;
};

// Step 1. The signature proves Razorpay issued this payment for this order;
// the fetch proves it's actually paid and for the amount the cart claims —
// otherwise a ₹1 payment could finalize a ₹5,000 cart.
export const verifyPayment = async (proof: PaymentProof, expectedTotal: number) => {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new PipelineError('Payment gateway not configured', 500);

  const expected = crypto.createHmac('sha256', keySecret)
    .update(`${proof.razorpay_order_id}|${proof.razorpay_payment_id}`)
    .digest('hex');
  const given = Buffer.from(String(proof.razorpay_signature), 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (given.length !== expectedBuf.length || !crypto.timingSafeEqual(given, expectedBuf)) {
    throw new PipelineError('Payment signature verification failed', 400);
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const payment = await razorpay.payments.fetch(proof.razorpay_payment_id);
  if (payment.order_id !== proof.razorpay_order_id || !['captured', 'authorized'].includes(payment.status)) {
    throw new PipelineError('Payment not completed', 400);
  }
  if (Math.round(expectedTotal * 100) !== Number(payment.amount)) {
    throw new PipelineError('Paid amount does not match order total', 400);
  }
};

// Steps 2–3. Returns the lines to report to Galla — empty for a replay,
// since the first finalize already deducted and synced this order.
export const recordOrderAndDeductStock = async (
  proof: PaymentProof,
  draft: OrderDraft,
): Promise<{ orderId: string; duplicate: boolean; sold: SoldLine[] }> => {
  if (!supabase) throw new PipelineError('Database not configured', 500);
  const orderId = orderIdForPayment(proof.razorpay_payment_id);

  const { error: insertErr } = await supabase.from('orders').insert([{
    id: orderId,
    created_at: new Date().toISOString(),
    customer_name: draft.customer_name,
    customer_email: draft.customer_email,
    shipping_address: draft.shipping_address,
    total_price: draft.total_price,
    items: draft.items,
    payment_status: 'paid',
    payment_method: 'Razorpay',
    coupon_applied: draft.coupon_applied,
    discount_amount: draft.discount_amount,
    shipping_status: 'Scheduled',
    shipping_carrier: 'Delhivery',
    tracking_number: 'DKV' + Math.floor(100000000 + Math.random() * 900000000),
  }]);

  if (insertErr?.code === '23505') return { orderId, duplicate: true, sold: [] };
  if (insertErr) throw new PipelineError(`Order could not be saved: ${insertErr.message}`, 500);

  const sold: SoldLine[] = [];
  for (const line of aggregateLines(draft.items)) {
    try {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('id,sku,galla_sku')
        .eq('product_id', line.product_id)
        .eq('size', line.selected_size)
        .maybeSingle();
      if (!variant) continue; // untracked size — nothing to deduct or report

      const { data: applied, error } = await supabase.rpc('decrement_inventory_on_hand', {
        p_variant_id: variant.id,
        p_qty: line.quantity,
      });

      // Payment is already captured, so a failed deduction must not undo
      // the order — it's logged for the admin to reconcile (refund or
      // restock), and Galla is still told the unit sold.
      await supabase.from('inventory_sync_log').insert([{
        direction: 'outbound',
        external_event_id: `sb-order-${orderId}-${variant.sku}-deduct`,
        variant_sku: variant.sku,
        payload: { reason: 'order_deduction', order_id: orderId, quantity: line.quantity },
        status: !error && applied ? 'applied' : 'failed',
        error_message: error?.message || (!applied ? 'insufficient stock at time of decrement — needs reconciliation' : null),
      }]);

      sold.push({ sku: variant.sku, galla_sku: variant.galla_sku, quantity: line.quantity });
    } catch (e) {
      console.warn(`[Order Pipeline] Deduction failed for ${orderId} ${line.product_id}/${line.selected_size}:`, e instanceof Error ? e.message : e);
    }
  }

  return { orderId, duplicate: false, sold };
};

// Step 4.
export const syncSaleToGalla = (orderId: string, sold: SoldLine[]) => notifyGallaOfSale(orderId, sold);
