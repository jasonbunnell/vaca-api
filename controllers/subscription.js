const Subscription = require('../models/Subscription');
const Property = require('../models/Property');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../middleware/errorHandler');
const { logAction } = require('../utils/securityLogger');
const { getStripe, resolvePriceId, isLifetime, isAnnual } = require('../config/stripe');
const { assertPropertyAccess } = require('../utils/propertyAccess');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://flxvacations.com').replace(/\/+$/, '');

function requireStripe() {
  const stripe = getStripe();
  if (!stripe) {
    throw httpError(503, 'Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  return stripe;
}

/**
 * Find or create a Stripe Customer for a user. Saves the resulting ID on the
 * User doc so subsequent purchases reuse the same Customer (one Stripe
 * Customer per platform user, regardless of how many properties they own).
 */
async function getOrCreateStripeCustomer(stripe, user) {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user._id) },
  });
  await User.updateOne({ _id: user._id }, { $set: { stripeCustomerId: customer.id } });
  user.stripeCustomerId = customer.id;
  return customer.id;
}

// @desc    List the current user's subscriptions (one per owned property)
// @route   GET /api/subscriptions
// @access  Private
exports.getMySubscriptions = asyncHandler(async (req, res) => {
  const subs = await Subscription.find({ hostId: req.user._id })
    .populate('propertyId', 'title slug images lake')
    .sort({ updatedAt: -1 })
    .lean();
  res.json(subs);
});

// @desc    Create a Stripe Checkout Session to upgrade a property's plan
// @route   POST /api/subscriptions
// @access  Private (host of the property, or admin)
//
// Body: { propertyId: string, plan: 'boost'|'pro', billingType: 'annual'|'lifetime' }
// Returns: { url } — the Checkout Session URL the frontend redirects to.
exports.createSubscription = asyncHandler(async (req, res) => {
  const { propertyId, plan, billingType } = req.body || {};

  if (!propertyId) throw httpError(400, 'propertyId is required.');
  if (!['boost', 'pro'].includes(plan)) {
    throw httpError(400, "plan must be 'boost' or 'pro'.");
  }
  if (!['annual', 'lifetime'].includes(billingType)) {
    throw httpError(400, "billingType must be 'annual' or 'lifetime'.");
  }
  if (billingType === 'lifetime' && plan !== 'pro') {
    throw httpError(400, 'Lifetime billing is only available on the Pro plan.');
  }

  const priceId = resolvePriceId(plan, billingType);
  if (!priceId) {
    throw httpError(503, `No Stripe Price ID configured for ${plan}/${billingType}.`);
  }

  const property = await Property.findById(propertyId);
  if (!property) throw httpError(404, 'Property not found.');
  assertPropertyAccess(property, req.user);

  const stripe = requireStripe();
  const customerId = await getOrCreateStripeCustomer(stripe, req.user);

  // Metadata propagates to the resulting Subscription/PaymentIntent so the
  // webhook can find our DB row without a Customer-to-User join.
  const metadata = {
    propertyId: String(property._id),
    hostId: String(req.user._id),
    plan,
    billingType,
  };

  const successUrl = `${SITE_URL}/dashboard?upgrade=success&property=${property._id}`;
  const cancelUrl = `${SITE_URL}/pricing?upgrade=canceled&property=${property._id}`;

  const session = await stripe.checkout.sessions.create({
    mode: isLifetime(plan, billingType) ? 'payment' : 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    // Mirror metadata onto the underlying Subscription/PaymentIntent so events
    // beyond `checkout.session.completed` can also resolve the property.
    subscription_data: isAnnual(billingType) ? { metadata } : undefined,
    payment_intent_data: isLifetime(plan, billingType) ? { metadata } : undefined,
    allow_promotion_codes: true,
  });

  logAction('subscription-checkout', {
    userId: req.user._id,
    success: true,
    detail: { propertyId, plan, billingType, sessionId: session.id },
  });

  res.json({ url: session.url, sessionId: session.id });
});

// @desc    Cancel a recurring subscription at period end
// @route   POST /api/subscriptions/:id/cancel
// @access  Private (host who owns the subscription, or admin)
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const sub = await Subscription.findById(req.params.id);
  if (!sub) throw httpError(404, 'Subscription not found.');

  const isAdmin = req.user?.role === 'admin';
  const isOwner = sub.hostId.toString() === req.user._id.toString();
  if (!isAdmin && !isOwner) {
    throw httpError(403, 'Forbidden: not your subscription.');
  }

  if (sub.plan === 'free') {
    throw httpError(400, 'Free listings cannot be canceled.');
  }
  if (sub.isLifetime) {
    throw httpError(400, 'Lifetime subscriptions cannot be canceled.');
  }
  if (!sub.stripeSubscriptionId) {
    throw httpError(400, 'No active Stripe subscription found for this listing.');
  }

  const stripe = requireStripe();
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  sub.cancelAtPeriodEnd = true;
  sub.canceledAt = new Date();
  await sub.save();

  logAction('subscription-cancel', {
    userId: req.user._id,
    success: true,
    detail: { subscriptionId: sub._id, stripeSubscriptionId: sub.stripeSubscriptionId },
  });

  res.json({ message: 'Subscription will end at the current period end.', subscription: sub });
});

// @desc    Create a Stripe Customer Portal session (manage card, view invoices, cancel)
// @route   POST /api/subscriptions/portal-session
// @access  Private
exports.createPortalSession = asyncHandler(async (req, res) => {
  if (!req.user.stripeCustomerId) {
    throw httpError(400, 'No billing account on file. Subscribe to a paid plan first.');
  }
  const stripe = requireStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripeCustomerId,
    return_url: `${SITE_URL}/dashboard`,
  });
  res.json({ url: session.url });
});

// =====================================================================
// Webhook handler
// =====================================================================
//
// Stripe → us. Mounted with `express.raw({ type: 'application/json' })` so
// `req.body` is a Buffer; required for signature verification.
//
// Events we handle:
//   - checkout.session.completed: primary creation event. Updates the existing
//       free Subscription doc to the purchased plan (no new doc).
//   - customer.subscription.updated: renewals + status changes for recurring.
//   - customer.subscription.deleted: terminal cancel — revert to free.
//   - invoice.payment_failed: mark past_due.
//
// Idempotency: every handler is upsert-shaped, keyed on Stripe IDs. Replays
// produce the same end state.

async function handleCheckoutCompleted(stripe, session) {
  const propertyId = session.metadata?.propertyId;
  const hostId = session.metadata?.hostId;
  const plan = session.metadata?.plan;
  const billingType = session.metadata?.billingType;

  if (!propertyId || !plan || !billingType) {
    console.warn('[webhook] checkout.session.completed missing metadata', session.id);
    return;
  }

  const sub = await Subscription.findOne({ propertyId });
  if (!sub) {
    console.warn('[webhook] no Subscription doc for property', propertyId);
    return;
  }

  sub.hostId = hostId || sub.hostId;
  sub.plan = plan;
  sub.billingType = billingType;
  sub.stripeCustomerId = session.customer || sub.stripeCustomerId;
  sub.stripeCheckoutSessionId = session.id;
  sub.cancelAtPeriodEnd = false;
  sub.canceledAt = null;

  if (billingType === 'lifetime') {
    sub.isLifetime = true;
    sub.status = 'active';
    sub.stripeSubscriptionId = '';
    sub.currentPeriodStart = null;
    sub.currentPeriodEnd = null;
    if (session.payment_intent) {
      sub.stripePriceId = sub.stripePriceId || resolvePriceId(plan, billingType);
    }
  } else {
    // Annual: pull the live Subscription from Stripe to capture period dates
    const stripeSubId = session.subscription;
    if (stripeSubId) {
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
      sub.stripeSubscriptionId = stripeSub.id;
      sub.stripePriceId = stripeSub.items?.data?.[0]?.price?.id || sub.stripePriceId;
      sub.status = stripeSub.status;
      sub.currentPeriodStart = stripeSub.current_period_start
        ? new Date(stripeSub.current_period_start * 1000)
        : null;
      sub.currentPeriodEnd = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null;
    }
  }

  await sub.save();
}

async function handleSubscriptionUpdated(stripeSub) {
  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!sub) {
    // First update may arrive before checkout.completed in race scenarios.
    // Fall back to metadata.
    const propertyId = stripeSub.metadata?.propertyId;
    if (!propertyId) {
      console.warn('[webhook] subscription.updated for unknown sub', stripeSub.id);
      return;
    }
    const byProperty = await Subscription.findOne({ propertyId });
    if (!byProperty) return;
    byProperty.stripeSubscriptionId = stripeSub.id;
    byProperty.stripePriceId = stripeSub.items?.data?.[0]?.price?.id || '';
    byProperty.status = stripeSub.status;
    byProperty.currentPeriodStart = stripeSub.current_period_start
      ? new Date(stripeSub.current_period_start * 1000)
      : null;
    byProperty.currentPeriodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null;
    byProperty.cancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;
    await byProperty.save();
    return;
  }

  sub.status = stripeSub.status;
  sub.stripePriceId = stripeSub.items?.data?.[0]?.price?.id || sub.stripePriceId;
  sub.currentPeriodStart = stripeSub.current_period_start
    ? new Date(stripeSub.current_period_start * 1000)
    : sub.currentPeriodStart;
  sub.currentPeriodEnd = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000)
    : sub.currentPeriodEnd;
  sub.cancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;
  await sub.save();
}

async function handleSubscriptionDeleted(stripeSub) {
  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!sub) return;
  // Revert to free in place — never delete the Subscription doc.
  sub.plan = 'free';
  sub.billingType = '';
  sub.status = 'canceled';
  sub.canceledAt = new Date();
  sub.cancelAtPeriodEnd = false;
  sub.stripeSubscriptionId = '';
  sub.stripePriceId = '';
  sub.currentPeriodStart = null;
  sub.currentPeriodEnd = null;
  await sub.save();
}

async function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) return;
  const sub = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
  if (!sub) return;
  sub.status = 'past_due';
  await sub.save();
}

// @desc    Stripe webhook receiver
// @route   POST /api/subscriptions/webhook
// @access  Public (verified by Stripe signature)
exports.handleWebhook = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe not configured');

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).send('Webhook secret not configured');

  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (err) {
    console.warn('[webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        // Ignore other events we didn't subscribe to.
        break;
    }
    logAction('stripe-webhook', { success: true, detail: { type: event.type, id: event.id } });
    res.json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error:', err);
    logAction('stripe-webhook', { success: false, detail: { type: event.type, error: err.message } });
    // Return 500 so Stripe retries.
    res.status(500).send('Webhook handler error');
  }
};
