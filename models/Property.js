const mongoose = require('mongoose');

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

const FINGER_LAKES = [
  'Seneca Lake',
  'Cayuga Lake',
  'Keuka Lake',
  'Canandaigua Lake',
  'Skaneateles Lake',
  'Owasco Lake',
  'Cazenovia Lake',
  'Otisco Lake',
  'Honeoye Lake',
  'Conesus Lake',
  'Hemlock Lake',
  'Other',
];

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
    description: {
      type: String,
      default: '',
    },
    lake: {
      type: String,
      enum: FINGER_LAKES,
      default: '',
    },
    amenities: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          room: { type: String, default: '' },
          caption: { type: String, maxlength: 250, default: '' },
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
  }
);

propertySchema.pre('save', async function (next) {
  if (!this.isModified('title') && this.slug) return next();
  if (!this.title) return next();

  const base = slugifyTitle(this.title);
  let slug = base;
  let counter = 1;

  // Ensure slug uniqueness
  while (
    await mongoose.models.Property.exists({
      slug,
      _id: { $ne: this._id },
    })
  ) {
    slug = `${base}-${counter++}`;
  }

  this.slug = slug;
  next();
});

propertySchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() || {};
  const title =
    (update.$set && update.$set.title) ||
    update.title;

  if (!title) return next();

  const base = slugifyTitle(title);
  let slug = base;
  let counter = 1;
  const query = this.getQuery() || {};
  const currentId = query._id;

  while (
    await mongoose.models.Property.exists({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    })
  ) {
    slug = `${base}-${counter++}`;
  }

  if (!update.$set) update.$set = {};
  update.$set.slug = slug;
  this.setUpdate(update);
  next();
});

module.exports = mongoose.model('Property', propertySchema);
