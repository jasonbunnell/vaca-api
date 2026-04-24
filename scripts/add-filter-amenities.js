#!/usr/bin/env node
/**
 * One-time script: add pets-allowed and free-parking amenities.
 * Usage: node scripts/add-filter-amenities.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
require('dotenv').config({ override: true });

const connectDB = require('../config/db');
const Amenity = require('../models/Amenity');

const NEW_AMENITIES = [
  { name: 'pets-allowed', displayName: 'Pets allowed', category: 'essentials', description: 'Property allows pets' },
  { name: 'free-parking', displayName: 'Free parking', category: 'essentials', description: 'Property has free on-site parking' },
];

async function run() {
  await connectDB();
  for (const a of NEW_AMENITIES) {
    const existing = await Amenity.findOne({ name: a.name });
    if (existing) {
      console.log(`Already exists: ${a.name}`);
      continue;
    }
    await Amenity.create(a);
    console.log(`Created: ${a.name}`);
  }
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
