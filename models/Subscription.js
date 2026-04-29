const mongoose = require('mongoose');

/**
 * One Subscription per Property. The doc is created when the Property is
 * created (free plan, no Stripe IDs) and updated in place when the host
 * upgrades — we do NOT create a new Subscription per upgrade. Cancellation
 * reverts the same doc back to free; we never delete it.
 *
 * Stripe-side state lives in `stripeSubscriptionId` (recurring plans),
 * `stripeCheckoutSessionId` (one-time lifetime), and `stripeCustomerId`.
 * Webhook handlers find the doc by these IDs.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      unique: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'boost', 'pro'],
      required: true,
      default: 'free',
    },
    /** `null`/'' for free; 'annual' for recurring; 'lifetime' for $600 one-time. */
    billingType: {
      type: String,
      enum: ['', 'annual', 'lifetime'],
      default: '',
    },
    isLifetime: { type: Boolean, default: false },

    stripeSubscriptionId: { type: String, default: '', index: true },
    stripeCustomerId: { type: String, default: '', index: true },
    stripePriceId: { type: String, default: '' },
    /** Set when a one-time lifetime Checkout Session completes. Null for recurring. */
    stripeCheckoutSessionId: { type: String, default: '', index: true },

    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
      default: 'active',
    },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
