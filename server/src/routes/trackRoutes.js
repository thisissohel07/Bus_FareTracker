/**
 * Track Routes
 * 
 * POST   /api/track          - Create new tracking request
 * GET    /api/tracks          - Get all tracking requests (filtered by user)
 * GET    /api/tracks/:id      - Get single tracking entry
 * PATCH  /api/tracks/:id/stop - Stop tracking a route
 * DELETE /api/tracks/:id      - Delete a tracking entry
 * GET    /api/tracks/:id/history - Get price history for a track
 * POST   /api/tracks/:id/check   - Manually trigger a price check
 */

const express = require('express');
const Track = require('../models/Track');
const PriceHistory = require('../models/PriceHistory');
const { protect, optionalAuth } = require('../middleware/auth');
const { scrapeBusPrices } = require('../services/scraperService');
const { searchCities } = require('../services/cityService');
const { sendTrackConfirmationEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/cities?q=hyd
 * Search for cities — supports ALL cities AbhiBus recognizes
 */
router.get('/cities', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { cities: [] } });
    }
    const cities = await searchCities(q);
    res.json({ success: true, data: { cities } });
  } catch (error) {
    logger.error('City search error:', error.message);
    res.json({ success: true, data: { cities: [] } });
  }
});

/**
 * POST /api/search
 * Live search — scrapes AbhiBus in real-time and returns ALL buses with fares
 */
router.post('/search', async (req, res) => {
  try {
    const { source, destination, date, busName } = req.body;

    if (!source || !destination || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide source, destination, and date.',
      });
    }

    logger.info(`🔍 Live search: ${source} → ${destination} on ${date}`);

    const result = await scrapeBusPrices(source, destination, new Date(date), busName || null);

    res.json({
      success: result.success,
      message: result.success
        ? `Found ${result.totalResults} buses`
        : result.message || 'No buses found.',
      data: {
        buses: result.buses || [],
        lowestPrice: result.price,
        cheapestBus: result.cheapestBus || null,
        totalResults: result.totalResults || 0,
        searchUrl: result.url,
        source,
        destination,
        date,
      },
    });
  } catch (error) {
    logger.error('Search error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Search failed. Please try again.',
    });
  }
});

/**
 * POST /api/track
 * Create a new price tracking request
 */
router.post('/track', optionalAuth, async (req, res) => {
  try {
    const { source, destination, date, busName, userEmail } = req.body;

    // Validation
    if (!source || !destination || !date || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide source, destination, date, and email.',
      });
    }

    // Validate date is in the future
    const travelDate = new Date(date);
    if (travelDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Travel date must be in the future.',
      });
    }

    // Check for duplicate tracking
    const existingTrack = await Track.findOne({
      source: source.toLowerCase().trim(),
      destination: destination.toLowerCase().trim(),
      date: travelDate,
      userEmail: userEmail.toLowerCase().trim(),
      isActive: true,
    });

    if (existingTrack) {
      return res.status(409).json({
        success: false,
        message: 'You are already tracking this route for this date.',
        data: { track: existingTrack },
      });
    }

    // Create tracking entry
    const track = await Track.create({
      source: source.trim(),
      destination: destination.trim(),
      date: travelDate,
      busName: busName ? busName.trim() : null,
      userEmail: userEmail.trim(),
      user: req.user ? req.user._id : null,
    });

    logger.info(`📌 New tracking created: ${source} → ${destination} on ${date} by ${userEmail}`);

    // Attempt initial price fetch (async, don't block the response)
    setImmediate(async () => {
      try {
        const result = await scrapeBusPrices(source, destination, travelDate, busName);
        if (result.success && result.price) {
          track.currentPrice = result.price;
          track.lowestPrice = result.price;
          track.highestPrice = result.price;
          track.lastChecked = new Date();
          track.checkCount = 1;
          await track.save();

          // Save initial price history
          await PriceHistory.create({
            track: track._id,
            price: result.price,
            source: track.source,
            destination: track.destination,
            busName: track.busName,
          });

          // Send confirmation email that tracking is set up
          await sendTrackConfirmationEmail({
            to: track.userEmail,
            source: track.source,
            destination: track.destination,
            date: track.date,
            busName: track.busName,
            currentPrice: result.price,
          });

          logger.info(`✅ Initial price fetched: ₹${result.price} for ${source} → ${destination}`);
        }
      } catch (err) {
        logger.warn(`⚠️ Initial price fetch failed for track ${track._id}:`, err.message);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tracking started! You will be notified when the price drops.',
      data: { track },
    });
  } catch (error) {
    logger.error('Create track error:', error.message);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

/**
 * GET /api/tracks
 * Get all tracking entries
 * - Authenticated users see only their tracks
 * - Optionally filter by email query param
 */
router.get('/tracks', optionalAuth, async (req, res) => {
  try {
    const { email, active } = req.query;
    const filter = {};

    // If user is authenticated, filter by their ID
    if (req.user) {
      filter.user = req.user._id;
    } else if (email) {
      // If not authenticated, allow filtering by email
      filter.userEmail = email.toLowerCase().trim();
    }

    // Optionally filter by active status
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const tracks = await Track.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tracks.length,
      data: { tracks },
    });
  } catch (error) {
    logger.error('Get tracks error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

/**
 * GET /api/tracks/:id
 * Get a single tracking entry by ID
 */
router.get('/tracks/:id', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Tracking entry not found.',
      });
    }

    res.json({
      success: true,
      data: { track },
    });
  } catch (error) {
    logger.error('Get track error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

/**
 * PATCH /api/tracks/:id/stop
 * Stop tracking a route (set isActive to false)
 */
router.patch('/tracks/:id/stop', async (req, res) => {
  try {
    const track = await Track.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Tracking entry not found.',
      });
    }

    logger.info(`⏹️ Tracking stopped for: ${track.source} → ${track.destination}`);

    res.json({
      success: true,
      message: 'Tracking stopped successfully.',
      data: { track },
    });
  } catch (error) {
    logger.error('Stop track error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

/**
 * DELETE /api/tracks/:id
 * Delete a tracking entry and its price history
 */
router.delete('/tracks/:id', async (req, res) => {
  try {
    const track = await Track.findByIdAndDelete(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Tracking entry not found.',
      });
    }

    // Also delete associated price history
    await PriceHistory.deleteMany({ track: req.params.id });

    logger.info(`🗑️ Tracking deleted for: ${track.source} → ${track.destination}`);

    res.json({
      success: true,
      message: 'Tracking entry deleted.',
    });
  } catch (error) {
    logger.error('Delete track error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

/**
 * GET /api/tracks/:id/history
 * Get price history for a tracking entry
 */
router.get('/tracks/:id/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const history = await PriceHistory.find({ track: req.params.id })
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      count: history.length,
      data: { history: history.reverse() }, // Return chronological order
    });
  } catch (error) {
    logger.error('Get history error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

/**
 * POST /api/tracks/:id/check
 * Manually trigger a price check for a specific track
 */
router.post('/tracks/:id/check', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Tracking entry not found.',
      });
    }

    // Scrape current price
    const result = await scrapeBusPrices(
      track.source,
      track.destination,
      track.date,
      track.busName
    );

    if (result.success && result.price) {
      track.lastPrice = track.currentPrice;
      track.currentPrice = result.price;
      track.lastChecked = new Date();
      track.checkCount += 1;

      if (track.lowestPrice === null || result.price < track.lowestPrice) {
        track.lowestPrice = result.price;
      }
      if (track.highestPrice === null || result.price > track.highestPrice) {
        track.highestPrice = result.price;
      }

      await track.save();

      // Save to price history
      await PriceHistory.create({
        track: track._id,
        price: result.price,
        source: track.source,
        destination: track.destination,
        busName: track.busName,
      });
    }

    res.json({
      success: true,
      message: result.success ? 'Price check completed.' : 'Price check failed.',
      data: {
        track,
        scrapeResult: result,
      },
    });
  } catch (error) {
    logger.error('Manual check error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

module.exports = router;
