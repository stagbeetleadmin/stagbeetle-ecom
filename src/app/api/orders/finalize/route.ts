import { after } from 'next/server';
import { supabase } from '@/lib/db';
import {
  PipelineError,
  recordOrderAndDeductStock,
  syncSaleToGalla,
  validateDraft,
  verifyPayment,
} from '@/lib/orderPipeline';

// Galla retries (3 attempts, 8s timeout each) run after the response via
// after(), so they need headroom beyond the request itself.
export const maxDuration = 60;

// The order's owner comes from the caller's Supabase session token, verified
// with Supabase — never from the request body, which anyone could fill in.
// No token, or an invalid one, is a guest checkout: the order still goes
// through, just not linked to an account.
const signedInUserId = async (request: Request): Promise<string | null> => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    return error ? null : data.user?.id ?? null;
  } catch {
    return null;
  }
};

// POST /api/orders/finalize — called by checkout once Razorpay's popup
// reports success. Verifies the payment, records the order, deducts stock,
// and pushes the sale to Galla. See src/lib/orderPipeline.ts for the why.
export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order } = await request.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ success: false, error: 'Missing required payment fields' }, { status: 400 });
    }
    const proof = { razorpay_order_id, razorpay_payment_id, razorpay_signature };
    const draft = validateDraft(order);

    await verifyPayment(proof, draft.total_price);
    const userId = await signedInUserId(request);
    const { orderId, duplicate, sold } = await recordOrderAndDeductStock(proof, draft, userId);

    // The customer gets their confirmation immediately; Galla is notified
    // right after, in the same invocation — seconds, not a batch job.
    if (sold.length > 0) after(() => syncSaleToGalla(orderId, sold));

    return Response.json({ success: true, orderId, duplicate });
  } catch (error) {
    if (error instanceof PipelineError) {
      return Response.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[Order finalize error]', error);
    return Response.json({ success: false, error: 'Order finalization failed' }, { status: 500 });
  }
}
