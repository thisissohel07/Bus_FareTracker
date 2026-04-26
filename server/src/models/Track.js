/**
 * Track Model
 * 
 * Stores bus fare tracking requests with route details,
 * current/last prices, and user notification preferences.
 */

const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  // Route information
  source: {
    type: String,
    required: [true, 'Source city is required'],
    trim: true,
    lowercase: true,
  },
  destination: {
    type: String,
    required: [true, 'Destination city is required'],
    trim: true,
    lowercase: true,
  },
  date: {
    type: Date,
    required: [true, 'Travel date is required'],
  },
  busName: {
    type: String,
    trim: true,
    default: null, // Optional: specific bus operator
  },

  // Price tracking
  currentPrice: {
    type: Number,
    default: null,
  },
  lastPrice: {
    type: Number,
    default: null,
  },
  lowestPrice: {
    type: Number,
    default: null,
  },
  highestPrice: {
    type: Number,
    default: null,
  },

  // Notification settings
  userEmail: {
    type: String,
    required: [true, 'User email is required for notifications'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },

  // Tracking status
  isActive: {
    type: Boolean,
    default: true,
  },
  lastChecked: {
    type: Date,
    default: null,
  },
  lastNotified: {
    type: Date,
    default: null,
  },
  checkCount: {
    type: Number,
    default: 0,
  },
  errorCount: {
    type: Number,
    default: 0,
  },
  lastError: {
    type: String,
    default: null,
  },

  // User reference (for authenticated users)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index for efficient querying
trackSchema.index({ source: 1, destination: 1, date: 1 });
trackSchema.index({ isActive: 1 });
trackSchema.index({ user: 1 });

// Virtual for price difference
trackSchema.virtual('priceDifference').get(function () {
  if (this.currentPrice != null && this.lastPrice != null) {
    return this.currentPrice - this.lastPrice;
  }
  return null;
});

// Virtual for formatted route
trackSchema.virtual('routeDisplay').get(function () {
  return `${this.source} → ${this.destination}`;
});

// Ensure virtuals are included in JSON
trackSchema.set('toJSON', { virtuals: true });
trackSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Track', trackSchema);
