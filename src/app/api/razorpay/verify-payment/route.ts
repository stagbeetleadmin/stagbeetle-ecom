import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { success: false, error: 'Missing required payment fields' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error('[Razorpay] Missing RAZORPAY_KEY_SECRET env var');
      return Response.json({ success: false, error: 'Payment gateway not configured' }, { status: 500 });
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );

    if (!isValid) {
      return Response.json(
        { success: false, error: 'Payment signature verification failed' },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('[Razorpay verify-payment error]', error);
    return Response.json(
      { success: false, error: 'Verification failed', details: error?.message },
      { status: 500 }
    );
  }
}
