// POST /api/notifications/order-confirmation
//
// Called by checkout right after a paid order is saved. Public endpoint
// (guests check out), so it must not be usable to message arbitrary numbers:
// the caller has to present a genuine Razorpay payment (signature verified),
// and the recipient number and amount come from Razorpay's own record of
// that payment — never from the request body. Only the display fields
// (name, order id, image) are taken from the caller.
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { sendOrderConfirmation } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, customerName, imageUrl } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return Response.json({ success: false, error: 'Payment gateway not configured' }, { status: 500 });
    }

    const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    const given = Buffer.from(String(razorpay_signature), 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (given.length !== expectedBuf.length || !crypto.timingSafeEqual(given, expectedBuf)) {
      return Response.json({ success: false, error: 'Payment signature verification failed' }, { status: 400 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || payment.status !== 'captured') {
      return Response.json({ success: false, error: 'Payment not captured' }, { status: 400 });
    }
    if (!payment.contact) {
      return Response.json({ success: false, error: 'No phone number on payment' }, { status: 422 });
    }

    const result = await sendOrderConfirmation({
      phone: String(payment.contact),
      customerName: String(customerName || ''),
      orderId: String(orderId),
      totalRupees: Number(payment.amount) / 100,
      imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
    });

    if (!result.ok) {
      console.error('[WhatsApp order-confirmation] send failed:', result.error);
      return Response.json({ success: false, error: result.error }, { status: 502 });
    }
    return Response.json({ success: true, messageId: result.messageId });
  } catch (error: any) {
    console.error('[WhatsApp order-confirmation error]', error);
    return Response.json({ success: false, error: 'Notification failed' }, { status: 500 });
  }
}
