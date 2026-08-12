export const PAYMENT_PLANS = {
  starter: { amountPaise: 29_900, credits: 500, userPlan: 'starter' },
  pro: { amountPaise: 358_800, credits: 14_400, userPlan: 'pro' },
  business: { amountPaise: 600_000, credits: 18_000, userPlan: 'business' },
} as const;

export type PaymentPlanId = keyof typeof PAYMENT_PLANS;

export function isPaymentPlanId(value: unknown): value is PaymentPlanId {
  return typeof value === 'string' && value in PAYMENT_PLANS;
}

