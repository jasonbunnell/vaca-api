const mongoose = require('mongoose');
const { geocodeAddress } = require('../utils/geocoder');

function slugifyTitle(title) {
  if (!title) return '';
  return title
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Find a unique slug for `title`, ignoring the document at `excludeId` (used
 * during updates so a property doesn't collide with itself).
 */
async function uniqueSlug(title, excludeId) {
  const base = slugifyTitle(title);
  let slug = base;
  let counter = 1;
  while (
    await mongoose.models.Property.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

/** Aligned with docs/finger-lake.md display names + Other */
const FINGER_LAKES = [
  'Conesus Lake',
  'Hemlock Lake',
  'Canadice Lake',
  'Honeoye Lake',
  'Canandaigua Lake',
  'Keuka Lake',
  'Seneca Lake',
  'Cayuga Lake',
  'Owasco Lake',
  'Skaneateles Lake',
  'Otisco Lake',
  'Other',
];

const locationSchema = new mongoose.Schema(
  {
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    country: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    city: { type: String, default: '' },
    zipcode: { type: String, default: '' },
    streetName: { type: String, default: '' },
    streetNumber: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    formattedAddress: { type: String, default: '' },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    /** Used only as input for geocoding; stripped before persist (select: false + pre-save). */
    address: {
      type: String,
      trim: true,
      select: false,
    },
    location: {
      type: locationSchema,
      default: undefined,
    },
    bedrooms: {
      type: Number,
      required: [true, 'Bedrooms is required'],
      min: 0,
    },
    bathrooms: {
      type: Number,
      required: [true, 'Bathrooms is required'],
      min: 0,
    },
    /** Total beds (mattresses / bed count) for listing cards */
    beds: {
      type: Number,
      min: 0,
    },
    /** Max occupancy */
    guests: {
      type: Number,
      min: 1,
    },
    description: {
      type: String,
      default: '',
    },
    lake: {
      type: String,
      default: '',
      validate: {
        validator(v) {
          return v === '' || FINGER_LAKES.includes(v);
        },
        message: 'Invalid lake name',
      },
    },
    amenities: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Amenity' }],
      default: [],
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          room: { type: String, default: 'Additional Photos' },
          caption: { type: String, maxlength: 250, default: '' },
          isMain: { type: Boolean, default: false },
        },
      ],
      default: [],
      validate: [function (v) { return v.length <= 50; }, 'Property cannot have more than 50 images'],
    },
    host: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      required: [true, 'At least one host is required'],
      validate: [
        function (v) {
          return Array.isArray(v) && v.length >= 1;
        },
        'Property must have at least one host',
      ],
    },
  },
  {
    timestamps: true,
    omitUndefined: true,
  }
);

/** Geocode when `address` is provided; do not persist address. Runs before slug hook. */
propertySchema.pre('save', async function (next) {
  try {
    if (this.address && String(this.address).trim()) {
      this.location = await geocodeAddress(String(this.address).trim());
      this.set('address', undefined);
    }
    next();
  } catch (err) {
    next(err);
  }
});

propertySchema.pre('save', async function (next) {
  try {
    if (!this.isModified('title') && this.slug) return next();
    if (!this.title) return next();
    this.slug = await uniqueSlug(this.title, this._id);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Apply geocode + slug regen to findOneAndUpdate operations. Both reads from
 * `update.$set` and root-level fields, then writes back via `setUpdate`.
 */
propertySchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate() || {};
    const $set = { ...(update.$set || {}) };
    for (const key of Object.keys(update)) {
      if (!key.startsWith('$')) $set[key] = update[key];
    }

    let changed = false;

    const address = $set.address;
    if (address && typeof address === 'string' && address.trim()) {
      $set.location = await geocodeAddress(address.trim());
      delete $set.address;
      changed = true;
    }

    if ($set.title) {
      const currentId = (this.getQuery() || {})._id;
      $set.slug = await uniqueSlug($set.title, currentId);
      changed = true;
    }

    if (!changed) return next();

    const rest = { ...update, $set };
    for (const key of Object.keys(update)) {
      if (!key.startsWith('$')) delete rest[key];
    }
    this.setUpdate(rest);
    next();
  } catch (err) {
    next(err);
  }
});

const Property = mongoose.model('Property', propertySchema);
Property.FINGER_LAKES = FINGER_LAKES;
module.exports = Property;
