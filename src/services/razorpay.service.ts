import Razorpay from 'razorpay';
import crypto from 'crypto';

// Razorpay instance — secret key only backend lo, never frontend ki pathokudadu
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Create a Razorpay order
 * amountInPaise: ₹1 = 100 paise
 */
export async function createRazorpayOrder(amountInPaise: number, currency = 'INR') {
  const options = {
    amount:   amountInPaise,
    currency,
    receipt:  `receipt_${Date.now()}`,
    payment_capture: 1,   // auto-capture payment
  };

  const order = await razorpay.orders.create(options);
  return order;
}

/**
 * Verify payment signature — SECURITY CORE
 * Hackers fake payment ID pathisthe idi catch chestundi
 *
 * Razorpay formula:
 *   HMAC_SHA256(order_id + "|" + payment_id, secret_key) === signature
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const body      = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');

  // Constant-time comparison — timing attack prevent cheyyadaniki
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(razorpaySignature)
  );
}
