/**
 * Stripe client and price-ID configuration. Loaded lazily so the rest of the
 * app can boot without `STRIPE_SECRET_KEY` set (e.g. local dev before billing
 * is wired). Any subscription endpoint that actually needs Stripe will get a
 * clear 503 if the key is missing.
 *
 * Price IDs are looked up by `{ plan, billingType }`. Add the standard-rate
 * IDs once those Stripe Products are created — launch IDs are sufficient for
 * the launch period.
 */
const Stripe = require('stripe');

let _client = null;

function getStripe() {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _client = new Stripe(key, {
    // Pin an API version so Stripe can't surprise us with a breaking change
    // mid-flight. Bump intentionally when you read the changelog.
    apiVersion: '2024-12-18.acacia',
    appInfo: { name: 'flxvacations', url: 'https://flxvacations.com' },
  });
  return _client;
}

/**
 * Map { plan, billingType } → Stripe Price ID, sourced from env so test/live
 * keys swap cleanly. `pro/lifetime` is one-time; everything else is recurring.
 */
const PRICE_IDS = {
  boost: {
    annual: {
      launch: process.env.STRIPE_PRICE_BOOST_ANNUAL_LAUNCH || '',
      standard: process.env.STRIPE_PRICE_BOOST_ANNUAL_STANDARD || '',
    },
  },
  pro: {
    annual: {
      launch: process.env.STRIPE_PRICE_PRO_ANNUAL_LAUNCH || '',
      standard: process.env.STRIPE_PRICE_PRO_ANNUAL_STANDARD || '',
    },
    lifetime: {
      launch: process.env.STRIPE_PRICE_PRO_LIFETIME_LAUNCH || '',
    },
  },
};

/** During the launch period prefer launch pricing; fall back to standard. */
function resolvePriceId(plan, billingType) {
  const slot = PRICE_IDS?.[plan]?.[billingType];
  if (!slot) return '';
  return slot.launch || slot.standard || '';
}

function isLifetime(plan, billingType) {
  return plan === 'pro' && billingType === 'lifetime';
}

function isAnnual(billingType) {
  return billingType === 'annual';
}

module.exports = {
  getStripe,
  PRICE_IDS,
  resolvePriceId,
  isLifetime,
  isAnnual,
};
