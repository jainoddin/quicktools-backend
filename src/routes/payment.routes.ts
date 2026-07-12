import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/razorpay.service';
import Payment from '../models/Payment.model';

const router = Router();

// Rate limiting — same IP nundi too many requests block cheyyadam (brute force protection)
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 requests per 15 min per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────
// POST /api/payment/create-order
// Frontend: "Pay" button click chesthe idi call avutundi
// ──────────────────────────────────────────────
router.post('/create-order', paymentRateLimit, async (req: Request, res: Response) => {
  try {
    const { plan = 'pro', email } = req.body;

    // Amount lo define cheyyi — frontend trust kaakudadu!
    // ₹1 = 100 paise
    const PLAN_AMOUNTS: Record<string, number> = {
      starter:  49900,   // ₹499
      pro:      5782,    // ₹49 + 18% GST (₹57.82)
      business: 11682,   // ₹99 + 18% GST (₹116.82)
      test:     100,     // ₹1 test
    };

    const amountInPaise = PLAN_AMOUNTS[plan] ?? 100; // default ₹1

    // Razorpay order create
    const order = await createRazorpayOrder(amountInPaise);

    // DB lo order record create (status: 'created')
    await Payment.create({
      razorpayOrderId: order.id,
      amount:          amountInPaise,
      currency:        'INR',
      status:          'created',
      plan,
      userId:          req.body.userId,
      email:           req.body.email || email,
    });

    res.json({
      success:  true,
      orderId:  order.id,
      amount:   amountInPaise,
      currency: 'INR',
      keyId:    process.env.RAZORPAY_KEY_ID, // public key — frontend ki safe ga pathiddam
    });

  } catch (err: any) {
    console.error('❌ Create order error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create payment order' });
  }
});

// ──────────────────────────────────────────────
// POST /api/payment/verify
// Payment complete ayyaka frontend idi call chestundi
// ──────────────────────────────────────────────
router.post('/verify', paymentRateLimit, async (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Required fields check
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({ success: false, error: 'Missing payment details' });
      return;
    }

    // ✅ SECURITY: HMAC signature verify — fake payment catch avutundi
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      // Hacker fake payment ID pathisthe ikkade block avutundi
      console.warn('⚠️  Invalid payment signature attempt:', { razorpayOrderId, razorpayPaymentId });
      res.status(400).json({ success: false, error: 'Payment verification failed' });
      return;
    }

    // DB update — status 'paid' ga mark cheyyi
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: 'paid',
      },
      { new: true }
    );

    if (!payment) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    console.log(`✅ Payment successful: ${razorpayPaymentId} | Amount: ₹${payment.amount / 100}`);

    res.json({
      success:   true,
      paymentId: razorpayPaymentId,
      amount:    payment.amount,
      plan:      payment.plan,
    });

  } catch (err: any) {
    console.error('❌ Verify error:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ──────────────────────────────────────────────
// GET /api/payment/status/:orderId
// Payment status check
// ──────────────────────────────────────────────
router.get('/status/:orderId', async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findOne({ razorpayOrderId: req.params.orderId });
    if (!payment) {
      res.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }
    res.json({ success: true, status: payment.status, amount: payment.amount, plan: payment.plan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
