/**
 * BusFare Tracker - Main Server Entry Point
 * 
 * Initializes Express server, connects to MongoDB,
 * sets up routes, and starts the price-checking cron job.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const logger = require('./utils/logger');
const { startCronJob } = require('./services/cronService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const trackRoutes = require('./routes/trackRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    // Allow configured CLIENT_URL
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5000',
    ].filter(Boolean);
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all for unified deployment
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// ─── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', trackRoutes);

// Health check endpoint with Puppeteer diagnostics
app.get('/api/health', (req, res) => {
  const fs = require('fs');
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || 'not set';
  const chromeExists = chromePath !== 'not set' ? fs.existsSync(chromePath) : false;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    puppeteer: {
      executablePath: chromePath,
      chromeExists,
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
    },
  });
});

// ─── Serve Frontend ─────────────────────────────────────
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  // Don't serve index.html for API routes that fall through
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// ─── Global Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Database Connection & Server Start ─────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 defaults are good, but we set these for clarity
    });
    logger.info('✅ Connected to MongoDB successfully');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`🚀 BusFare Tracker server running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start the cron job for periodic price checking
    startCronJob();
    logger.info('⏰ Cron job scheduler initialized');

  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

connectDB();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
