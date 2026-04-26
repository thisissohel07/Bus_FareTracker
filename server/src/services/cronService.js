/**
 * Cron Service
 * 
 * Schedules periodic price checks using node-cron.
 * Iterates through all active tracking entries,
 * scrapes current prices, updates database, and
 * triggers notifications on price drops.
 */

const cron = require('node-cron');
const Track = require('../models/Track');
const PriceHistory = require('../models/PriceHistory');
const { scrapeBusPrices } = require('./scraperService');
const { sendPriceDropEmail } = require('./emailService');
const logger = require('../utils/logger');

// Delay between scraping requests to avoid detection
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process a single tracking entry
 * @param {Object} track - Mongoose Track document
 */
const processTrackEntry = async (track) => {
  try {
    logger.info(`⏳ Checking prices for: ${track.source} → ${track.destination} (${track.date})`);

    // Skip if travel date has passed
    if (new Date(track.date) < new Date()) {
      logger.info(`⏭️ Skipping expired route: ${track.source} → ${track.destination}`);
      track.isActive = false;
      await track.save();
      return;
    }

    // Scrape current prices
    const result = await scrapeBusPrices(
      track.source,
      track.destination,
      track.date,
      track.busName
    );

    // Update check metadata
    track.lastChecked = new Date();
    track.checkCount += 1;

    if (!result.success || result.price === null) {
      track.errorCount += 1;
      track.lastError = result.message || 'Failed to fetch price';
      await track.save();
      logger.warn(`⚠️ No price found for ${track.source} → ${track.destination}`);
      return;
    }

    const newPrice = result.price;
    const oldPrice = track.currentPrice;

    // Update prices
    track.lastPrice = track.currentPrice;
    track.currentPrice = newPrice;
    track.lastError = null;

    // Update lowest/highest tracked prices
    if (track.lowestPrice === null || newPrice < track.lowestPrice) {
      track.lowestPrice = newPrice;
    }
    if (track.highestPrice === null || newPrice > track.highestPrice) {
      track.highestPrice = newPrice;
    }

    await track.save();

    // Save price history entry
    await PriceHistory.create({
      track: track._id,
      price: newPrice,
      source: track.source,
      destination: track.destination,
      busName: track.busName,
    });

    // Check for price drop and send notification
    if (oldPrice !== null && newPrice < oldPrice) {
      logger.info(`📉 Price DROP detected! ₹${oldPrice} → ₹${newPrice} for ${track.source} → ${track.destination}`);

      await sendPriceDropEmail({
        to: track.userEmail,
        source: track.source,
        destination: track.destination,
        date: track.date,
        oldPrice: oldPrice,
        newPrice: newPrice,
        busName: result.cheapestBus?.name || track.busName || 'Multiple Operators',
        busType: result.cheapestBus?.busType || '',
        departureTime: result.cheapestBus?.departure || '',
        url: result.url,
      });

      track.lastNotified = new Date();
      await track.save();
    } else if (oldPrice !== null) {
      logger.info(`📊 Price unchanged/increased: ₹${oldPrice} → ₹${newPrice}`);
    } else {
      logger.info(`📌 Initial price recorded: ₹${newPrice}`);
    }

  } catch (error) {
    logger.error(`❌ Error processing track ${track._id}:`, error.message);
    track.errorCount += 1;
    track.lastError = error.message;
    await track.save();
  }
};

/**
 * Run the price checking job for all active tracks
 */
const runPriceCheckJob = async () => {
  logger.info('🔄 ========== Starting price check cycle ==========');

  try {
    const activeTracks = await Track.find({ isActive: true });

    if (activeTracks.length === 0) {
      logger.info('📭 No active tracking entries found.');
      return;
    }

    logger.info(`📋 Found ${activeTracks.length} active tracking entries.`);

    // Process each track sequentially with delay to avoid rate limiting
    for (let i = 0; i < activeTracks.length; i++) {
      await processTrackEntry(activeTracks[i]);

      // Add delay between requests (except for the last one)
      if (i < activeTracks.length - 1) {
        const delayMs = parseInt(process.env.SCRAPE_DELAY_MS) || 3000;
        logger.info(`⏸️ Waiting ${delayMs}ms before next scrape...`);
        await delay(delayMs);
      }
    }

    logger.info('✅ ========== Price check cycle completed ==========');
  } catch (error) {
    logger.error('❌ Price check job failed:', error.message);
  }
};

/**
 * Start the cron scheduler
 */
const startCronJob = () => {
  const intervalMinutes = parseInt(process.env.SCRAPE_INTERVAL_MINUTES) || 30;

  // Cron expression: run every N minutes
  const cronExpression = `*/${intervalMinutes} * * * *`;

  cron.schedule(cronExpression, async () => {
    logger.info(`⏰ Cron triggered at ${new Date().toISOString()}`);
    await runPriceCheckJob();
  });

  logger.info(`📅 Cron job scheduled: every ${intervalMinutes} minutes (${cronExpression})`);
};

module.exports = { startCronJob, runPriceCheckJob };
