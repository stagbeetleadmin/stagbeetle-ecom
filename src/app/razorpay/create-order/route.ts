import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const { amount, currency = 'INR' } = await request.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Guard: ensure env vars are present
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET env vars');
      return Response.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    // Instantiate Razorpay inside the handler (env vars available at request time)
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Razorpay expects amount in paise (smallest unit), so multiply by 100
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      payment_capture: true,
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
    });
  } catch (error: any) {
    console.error('[Razorpay create-order error]', error);
    return Response.json(
      { error: 'Failed to create Razorpay order', details: error?.message },
      { status: 500 }
    );
  }
}
