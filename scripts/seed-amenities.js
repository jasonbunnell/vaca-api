#!/usr/bin/env node
/**
 * Upsert amenities from scripts/amenities-seed-data.js (docs/amenities.md).
 * Usage: node scripts/seed-amenities.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
require('dotenv').config({ override: true });

const connectDB = require('../config/db');
const Amenity = require('../models/Amenity');
const seedRows = require('./amenities-seed-data');

async function run() {
  await connectDB();
  let n = 0;
  for (const row of seedRows) {
    await Amenity.findOneAndUpdate(
      { name: row.name },
      {
        $set: {
          displayName: row.displayName,
          category: row.category,
          description: row.description || '',
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    n += 1;
  }
  console.log('Amenities upserted:', n);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
