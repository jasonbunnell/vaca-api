const mongoose = require('mongoose');
const { slugifyDisplay } = require('../utils/slugify');

const AMENITY_CATEGORIES = [
  'location',
  'essentials',
  'kitchen',
  'outside',
  'entertainment',
  'luxury',
  'environmentally-friendly',
];

const amenitySchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: [true, 'displayName is required'],
      trim: true,
      maxlength: 120,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    color: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: '' },
    category: {
      type: String,
      required: [true, 'category is required'],
      enum: {
        values: AMENITY_CATEGORIES,
        message: 'Invalid amenity category',
      },
    },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

amenitySchema.pre('validate', function (next) {
  if (!this.displayName) return next();
  if (!this.name) {
    this.name = slugifyDisplay(this.displayName);
  } else if (this.isModified('displayName') && !this.isModified('name')) {
    this.name = slugifyDisplay(this.displayName);
  }
  next();
});

amenitySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const $set = { ...(update.$set || {}) };
  for (const key of Object.keys(update)) {
    if (!key.startsWith('$')) {
      $set[key] = update[key];
    }
  }
  if ($set.displayName != null && $set.name === undefined) {
    $set.name = slugifyDisplay(String($set.displayName));
  }
  const rest = { ...update, $set };
  for (const key of Object.keys(update)) {
    if (!key.startsWith('$')) delete rest[key];
  }
  this.setUpdate(rest);
  next();
});

const Amenity = mongoose.model('Amenity', amenitySchema);
Amenity.CATEGORIES = AMENITY_CATEGORIES;
module.exports = Amenity;
