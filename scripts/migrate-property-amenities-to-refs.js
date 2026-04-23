#!/usr/bin/env node
/**
 * One-time migration: Property.amenities from string[] to Amenity ObjectId[].
 * Run after: node scripts/seed-amenities.js
 * Usage: node scripts/migrate-property-amenities-to-refs.js
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
require('dotenv').config({ override: true });

const connectDB = require('../config/db');
const Property = require('../models/Property');
const { legacyAmenityStringsToIds } = require('../utils/amenityHelpers');

async function run() {
  await connectDB();
  const raw = await Property.collection.find({}).toArray();
  let updated = 0;
  for (const doc of raw) {
    const a = doc.amenities;
    if (!Array.isArray(a) || a.length === 0) continue;

    const allStrings = a.every((x) => typeof x === 'string');
    const allObjectIds = a.every((x) => mongoose.Types.ObjectId.isValid(x));

    if (allObjectIds) continue;

    if (allStrings) {
      const ids = await legacyAmenityStringsToIds(a);
      await Property.collection.updateOne({ _id: doc._id }, { $set: { amenities: ids } });
      updated += 1;
      continue;
    }

    console.warn('Skipping property with mixed/unknown amenities format:', doc._id, a);
  }
  console.log('Migrated properties:', updated);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
