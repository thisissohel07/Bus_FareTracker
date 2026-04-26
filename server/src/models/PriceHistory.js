/**
 * PriceHistory Model
 * 
 * Stores historical price data points for each tracked route.
 * Used to generate price trend charts on the frontend.
 */

const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  // Reference to the tracking entry
  track: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: true,
    index: true,
  },

  // Price data
  price: {
    type: Number,
    required: [true, 'Price is required'],
  },

  // Route snapshot (denormalized for faster queries)
  source: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  busName: {
    type: String,
    default: null,
  },

  // Timestamp of when this price was recorded
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient price history queries
priceHistorySchema.index({ track: 1, recordedAt: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
