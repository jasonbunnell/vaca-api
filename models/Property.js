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

const VACA_RENTAL_SOFTWARE = [
  'none',
  'Hostaway',
  'Lodgify',
  'OwnerRez',
  'Streamline',
  'other',
];

const OTA_PROVIDERS = [
  'airbnb',
  'vrbo',
  'booking',
  'houfy',
  'tripadvisor',
  'direct',
  'other',
];

const otaLinkSchema = new mongoose.Schema(
  {
    ota: {
      type: String,
      enum: OTA_PROVIDERS,
      required: [true, 'OTA provider is required'],
    },
    url: {
      type: String,
      required: [true, 'OTA url is required'],
      trim: true,
      validate: {
        validator(v) {
          if (!v) return false;
          return /^https?:\/\/.+/i.test(String(v).trim());
        },
        message: 'OTA url must be a valid http(s) URL',
      },
    },
    /** Optional display label, used when ota === 'other' or 'direct' */
    label: {
      type: String,
      trim: true,
      maxlength: 60,
      default: '',
    },
  },
  { _id: false }
);

const seoMetaSchema = new mongoose.Schema(
  {
    /** <title> tag override. Google shows ~60 chars; hard cap 70. */
    title: { type: String, trim: true, maxlength: 70, default: '' },
    /** Meta description override. Google shows ~155-160 chars; hard cap 170. */
    description: { type: String, trim: true, maxlength: 170, default: '' },
    source: { type: String, enum: ['ai', 'manual'], default: 'manual' },
    generatedAt: { type: Date, default: null },
  },
  { _id: false }
);

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
    vacaRentalSoftware: {
      type: String,
      enum: VACA_RENTAL_SOFTWARE,
      default: 'none',
    },
    /**
     * External booking links (AirBnB, VRBO, Booking.com, etc.). Gated to
     * Boost+ tiers in propertySerializer.js — stripped for guests on Free.
     */
    otaLinks: {
      type: [otaLinkSchema],
      default: [],
      validate: [
        function (v) { return !v || v.length <= 10; },
        'Property cannot have more than 10 OTA links',
      ],
    },
    /**
     * Search-engine metadata (PRD-summer-26 SEO-2). Written manually by a
     * host/admin or by the AI meta pipeline (SEO-3). Public on all tiers;
     * frontend falls back to title/description when absent.
     */
    seoMeta: {
      type: seoMetaSchema,
      default: undefined,
    },
    /** Reference to Subscription doc tracking this property's plan. Auto-created free on insert. */
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
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
/**
 * After creating a Property, ensure it has a free Subscription. We do this
 * post-save (rather than pre) so the subscription has a stable propertyId to
 * reference. Idempotent — if a Subscription already exists for this property,
 * we just link it.
 */
propertySchema.post('save', async function (doc, next) {
  try {
    if (this.subscription) return next();
    const Subscription = mongoose.models.Subscription || require('./Subscription');
    const hostId = Array.isArray(doc.host) ? doc.host[0] : doc.host;
    const existing = await Subscription.findOne({ propertyId: doc._id }).select('_id').lean();
    const subId = existing
      ? existing._id
      : (await Subscription.create({
          propertyId: doc._id,
          hostId,
          plan: 'free',
          billingType: '',
          status: 'active',
        }))._id;
    // Update without re-triggering hooks
    await mongoose.models.Property.updateOne({ _id: doc._id }, { $set: { subscription: subId } });
    doc.subscription = subId;
    next();
  } catch (err) {
    next(err);
  }
});

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
Property.VACA_RENTAL_SOFTWARE = VACA_RENTAL_SOFTWARE;
Property.OTA_PROVIDERS = OTA_PROVIDERS;
module.exports = Property;
