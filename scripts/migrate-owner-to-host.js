/**
 * One-time migration: set host = [owner] for properties that have owner but no host.
 * Run after switching the Property model from owner to host.
 * Usage: node scripts/migrate-owner-to-host.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Property = require('../models/Property');

async function run() {
  await connectDB();
  const coll = Property.collection;
  const result = await coll.updateMany(
    { owner: { $exists: true, $ne: null } },
    [{ $set: { host: ['$owner'] } }, { $unset: 'owner' }]
  );
  console.log('Migrated properties (owner -> host):', result.modifiedCount);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
