import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/razorpay.service';
import Payment from '../models/Payment.model';
import { User } from '../models/user.model';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only_please_change';

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
    const { plan = 'pro' } = req.body;

    // ✅ SECURITY: userId from JWT token (NOT from request body!)
    let userId: string | undefined;
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (_) {
        // unauthenticated — userId stays undefined
      }
    }

    // Amount lo define cheyyi — frontend trust kaakudadu!
    // ₹1 = 100 paise
    const PLAN_AMOUNTS: Record<string, number> = {
      starter:  49900,   // ₹499
      pro:      5782,    // ₹49 + 18% GST (₹57.82)
      business: 11682,   // ₹99 + 18% GST (₹116.82)
      test:     100,     // ₹1 test
    };

    const amountInPaise = PLAN_AMOUNTS[plan] ?? 100;

    // Razorpay order create
    const order = await createRazorpayOrder(amountInPaise);

    // DB lo order record create (status: 'created')
    await Payment.create({
      razorpayOrderId: order.id,
      amount:          amountInPaise,
      currency:        'INR',
      status:          'created',
      plan,
      userId,                  // ✅ from JWT, not req.body
      email:           req.body.email,
    });

    res.json({
      success:  true,
      orderId:  order.id,
      amount:   amountInPaise,
      currency: 'INR',
      keyId:    process.env.RAZORPAY_KEY_ID,
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

    // ⭐ UPGRADE USER ACCOUNT ⭐
    if (payment.userId) {
      const credits = payment.plan === 'business' ? 100000 : payment.plan === 'starter' ? 500 : 10000;
      await User.findByIdAndUpdate(payment.userId, {
        plan: payment.plan,
        credits: credits
      });
      console.log(`🚀 Upgraded User ${payment.userId} to ${payment.plan} with ${credits} credits!`);
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

// ──────────────────────────────────────────────
// POST /api/payment/cancel-plan
// User plan ni free lo ki downgrade cheyyadam
// ──────────────────────────────────────────────
router.post('/cancel-plan', async (req: Request, res: Response) => {
  try {
    // Auth check
    const token = req.cookies?.token;
    if (!token) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.plan === 'free') {
      res.status(400).json({ success: false, error: 'Already on Free plan' });
      return;
    }

    const previousPlan = user.plan;

    // Downgrade to free plan
    await User.findByIdAndUpdate(user._id, {
      plan: 'free',
      credits: 15 // reset to free credits
    });

    // Mark all paid payments as 'cancelled' for this user
    await Payment.updateMany(
      { userId: user._id, status: 'paid' },
      { status: 'cancelled' }
    );

    console.log(`⚠️ User ${user._id} cancelled ${previousPlan} plan, downgraded to free.`);

    res.json({
      success: true,
      message: 'Plan cancelled successfully. You have been downgraded to the Free plan.',
      previousPlan,
    });

  } catch (err: any) {
    console.error('❌ Cancel plan error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to cancel plan' });
  }
});

// ──────────────────────────────────────────────
// GET /api/payment/invoices
// User invoices history fetch
// ──────────────────────────────────────────────
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Sort by descending createdAt (newest first)
    const invoices = await Payment.find({ userId: decoded.id })
      .sort({ createdAt: -1 })
      .select('razorpayOrderId amount status plan createdAt');

    res.json({ success: true, invoices });
  } catch (err: any) {
    console.error('❌ Fetch invoices error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

export default router;
