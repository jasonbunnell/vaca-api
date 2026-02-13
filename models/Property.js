const mongoose = require('mongoose');

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
    amenities: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
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
