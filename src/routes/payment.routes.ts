import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/razorpay.service';
import Payment from '../models/Payment.model';
import { User } from '../models/user.model';
import { verifyAuth } from '../middlewares/auth.middleware';
import { isPaymentPlanId, PAYMENT_PLANS } from '../config/paymentPlans';

const router = Router();

const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function authenticatedUserId(req: Request): string {
  const user = req.user as { id?: string; _id?: string } | undefined;
  return String(user?.id || user?._id || '');
}

router.use(verifyAuth);

router.post('/create-order', paymentRateLimit, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    if (!isPaymentPlanId(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid payment plan' });
    }

    const userId = authenticatedUserId(req);
    const user = await User.findById(userId).select('email');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const planConfig = PAYMENT_PLANS[plan];
    const order = await createRazorpayOrder(planConfig.amountPaise);
    await Payment.create({
      razorpayOrderId: order.id,
      amount: planConfig.amountPaise,
      currency: 'INR',
      status: 'created',
      plan,
      userId,
      email: user.email,
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: planConfig.amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Create order error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create payment order' });
  }
});

router.post('/verify', paymentRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }

    const payment = await Payment.findOne({ razorpayOrderId, userId });
    if (!payment) return res.status(404).json({ success: false, error: 'Order not found' });

    if (payment.status === 'paid') {
      if (payment.razorpayPaymentId !== razorpayPaymentId) {
        return res.status(409).json({ success: false, error: 'Order was already paid by a different payment' });
      }
      return res.json({ success: true, paymentId: payment.razorpayPaymentId, amount: payment.amount, plan: payment.plan });
    }

    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      await Payment.updateOne({ _id: payment._id, status: 'created' }, { status: 'failed' });
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    if (!isPaymentPlanId(payment.plan)) {
      return res.status(409).json({ success: false, error: 'Stored payment plan is invalid' });
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'paid';
    await payment.save();

    const planConfig = PAYMENT_PLANS[payment.plan];
    await User.findByIdAndUpdate(userId, { plan: planConfig.userPlan, credits: planConfig.credits });

    return res.json({ success: true, paymentId: razorpayPaymentId, amount: payment.amount, plan: payment.plan });
  } catch (err: any) {
    console.error('Verify error:', err.message);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

router.get('/status/:orderId', async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findOne({
      razorpayOrderId: req.params.orderId,
      userId: authenticatedUserId(req),
    }).select('status amount plan');
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    return res.json({ success: true, status: payment.status, amount: payment.amount, plan: payment.plan });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch payment status' });
  }
});

router.post('/cancel-plan', async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUserId(req);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.plan === 'free') return res.status(400).json({ success: false, error: 'Already on Free plan' });

    const previousPlan = user.plan;
    await User.findByIdAndUpdate(userId, { plan: 'free', credits: 15 });
    await Payment.updateMany({ userId, status: 'paid' }, { status: 'cancelled' });
    return res.json({ success: true, message: 'Plan cancelled successfully.', previousPlan });
  } catch (err: any) {
    console.error('Cancel plan error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to cancel plan' });
  }
});

router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const invoices = await Payment.find({ userId: authenticatedUserId(req) })
      .sort({ createdAt: -1 })
      .select('razorpayOrderId amount status plan createdAt');
    return res.json({ success: true, invoices });
  } catch (err: any) {
    console.error('Fetch invoices error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

export default router;
