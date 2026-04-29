/**
 * One-shot backfill: ensure every existing Property has a free Subscription
 * doc and that Property.subscription points to it. Safe to re-run; idempotent.
 *
 * Usage:
 *   node scripts/backfill-free-subscriptions.js          # dry run, prints plan
 *   node scripts/backfill-free-subscriptions.js --apply  # actually writes
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
require('dotenv').config({ override: true });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Property = require('../models/Property');
const Subscription = require('../models/Subscription');

const APPLY = process.argv.includes('--apply');

async function main() {
  await connectDB();
  const properties = await Property.find({}).select('_id title host subscription').lean();
  console.log(`Found ${properties.length} properties.`);

  let createCount = 0;
  let linkCount = 0;
  let skipCount = 0;

  for (const p of properties) {
    let subId = p.subscription;
    let existing = null;

    if (subId) {
      existing = await Subscription.findById(subId).select('_id').lean();
      if (existing) {
        skipCount++;
        continue;
      }
    }

    // Either no subscription field or it points at a deleted doc — try by propertyId
    existing = await Subscription.findOne({ propertyId: p._id }).select('_id').lean();

    if (!existing) {
      const hostId = Array.isArray(p.host) ? p.host[0] : p.host;
      console.log(`  [create] ${p.title} (${p._id}) host=${hostId}`);
      if (APPLY) {
        const sub = await Subscription.create({
          propertyId: p._id,
          hostId,
          plan: 'free',
          billingType: '',
          status: 'active',
        });
        subId = sub._id;
      }
      createCount++;
    } else {
      subId = existing._id;
    }

    if (subId && String(subId) !== String(p.subscription)) {
      console.log(`  [link] ${p.title} (${p._id}) -> sub ${subId}`);
      if (APPLY) {
        await Property.updateOne({ _id: p._id }, { $set: { subscription: subId } });
      }
      linkCount++;
    }
  }

  console.log(`\nSummary: created=${createCount} linked=${linkCount} skipped=${skipCount}`);
  if (!APPLY) console.log('(dry run — re-run with --apply to write)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
