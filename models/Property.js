const mongoose = require('mongoose');

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
      validate: [function (v) { return v.length <= 30; }, 'Property cannot have more than 30 images'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner (host) is required'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Property', propertySchema);
