const test = require('node:test');
const assert = require('node:assert/strict');

const { PAYMENT_PLANS, isPaymentPlanId } = require('../dist/config/paymentPlans');

test('only canonical production payment plans are accepted', () => {
  assert.deepEqual(Object.keys(PAYMENT_PLANS).sort(), ['business', 'pro', 'starter']);
  for (const plan of Object.keys(PAYMENT_PLANS)) assert.equal(isPaymentPlanId(plan), true);
  for (const plan of ['test', 'free', 'unknown', '', null, 1]) assert.equal(isPaymentPlanId(plan), false);
});

test('canonical plans contain positive server-authoritative entitlements', () => {
  for (const plan of Object.values(PAYMENT_PLANS)) {
    assert.equal(Number.isInteger(plan.amountPaise) && plan.amountPaise > 0, true);
    assert.equal(Number.isInteger(plan.credits) && plan.credits > 0, true);
    assert.equal(typeof plan.userPlan, 'string');
  }
});
