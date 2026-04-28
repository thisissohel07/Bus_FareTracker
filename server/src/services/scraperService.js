/**
 * Scraper Service
 * 
 * Uses Puppeteer to scrape real bus ticket prices from AbhiBus.
 * Extracts ALL buses (private + government) with actual fares.
 * 
 * SPEED OPTIMIZED: Intercepts API responses instead of waiting for DOM rendering.
 * Typical time: 5-10 seconds (down from 30+).
 */

const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const { getCityId } = require('./cityService');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Format date for AbhiBus URL (DD-MM-YYYY)
 */
const formatDateForUrl = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Capitalize city name
 */
const capitalizeCity = (name) => {
  return name.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

/**
 * Build AbhiBus search URL with city IDs
 */
const buildSearchUrl = async (source, destination, date) => {
  const srcId = await getCityId(source);
  const dstId = await getCityId(destination);
  const src = capitalizeCity(source);
  const dst = capitalizeCity(destination);
  const formattedDate = formatDateForUrl(date);

  if (srcId && dstId) {
    return `https://www.abhibus.com/bus_search/${src}/${srcId}/${dst}/${dstId}/${formattedDate}/O`;
  }
  return `https://www.abhibus.com/bus-tickets/${encodeURIComponent(src)}-to-${encodeURIComponent(dst)}-bus/${formattedDate}`;
};

/**
 * Get Puppeteer launch options optimized for speed + cloud
 */
const getLaunchOptions = () => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;

  const options = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor,IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
      '--single-process',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
    ],
    protocolTimeout: 90000,
  };

  if (executablePath) {
    options.executablePath = executablePath;
  }

  return options;
};

/**
 * Parse bus data from intercepted API JSON response
 */
const parseBusesFromApiResponse = (data) => {
  const buses = [];

  try {
    // AbhiBus API returns different structures — handle all known formats
    let busList = [];

    if (Array.isArray(data)) {
      busList = data;
    } else if (data?.buses && Array.isArray(data.buses)) {
      busList = data.buses;
    } else if (data?.apiData?.buses) {
      busList = data.apiData.buses;
    } else if (data?.data?.buses) {
      busList = data.data.buses;
    } else if (data?.opList) {
      busList = data.opList;
    } else if (data?.inventories) {
      busList = data.inventories;
    }

    for (const bus of busList) {
      try {
        const name = bus.travels_name || bus.operator_name || bus.operatorName || bus.name || bus.travelName || 'Unknown';
        const price = bus.fare || bus.baseFare || bus.base_fare || bus.min_fare || bus.minFare || bus.seat_fare || bus.price || null;
        const departure = bus.departure_time || bus.dep_time || bus.depTime || bus.departure || '';
        const arrival = bus.arrival_time || bus.arr_time || bus.arrTime || bus.arrival || '';
        const busType = bus.bus_type || bus.busType || bus.type || '';
        const rating = bus.rating || bus.ratings || null;
        const seats = bus.available_seats || bus.availableSeats || bus.seats || null;

        const priceVal = typeof price === 'string' ? parseInt(price.replace(/[₹,\s]/g, '')) : price;
        if (!priceVal || priceVal < 50 || priceVal > 15000) continue;

        buses.push({
          name: String(name).trim(),
          price: priceVal,
          originalPrice: null,
          departure: String(departure).trim(),
          arrival: String(arrival).trim(),
          busType: String(busType).trim(),
          rating: rating ? parseFloat(rating) : null,
          seats: seats ? parseInt(seats) : null,
          discount: null,
        });
      } catch {}
    }
  } catch (e) {
    logger.debug('API response parse error:', e.message);
  }

  return buses;
};

/**
 * Scrape ALL bus prices from AbhiBus (private + government)
 * 
 * STRATEGY:
 * 1. Intercept API/XHR responses for instant JSON data (fast path)
 * 2. Fallback to DOM scraping if no API data intercepted
 */
const scrapeBusPrices = async (source, destination, date, busName = null) => {
  let browser = null;
  let url = '';
  const startTime = Date.now();

  try {
    url = await buildSearchUrl(source, destination, date);
    logger.info(`🔍 Scraping: ${url}`);

    browser = await puppeteer.launch(getLaunchOptions());
    const launchTime = Date.now() - startTime;
    logger.info(`✅ Browser launched in ${launchTime}ms`);

    const page = await browser.newPage();

    // Stealth
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ];
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    await page.setViewport({ width: 1920, height: 1080 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
    });

    // ─── SPEED TRICK: Intercept API responses + block heavy assets ───
    const interceptedBuses = [];
    
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      // Block ALL non-essential resources for maximum speed
      if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Listen for API responses that contain bus data
    page.on('response', async (response) => {
      try {
        const responseUrl = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        // Only check JSON responses from AbhiBus API calls
        if (contentType.includes('application/json') && responseUrl.includes('abhibus.com')) {
          const text = await response.text().catch(() => '');
          if (text.includes('fare') || text.includes('travels_name') || text.includes('operator') || text.includes('departure')) {
            try {
              const json = JSON.parse(text);
              const parsed = parseBusesFromApiResponse(json);
              if (parsed.length > 0) {
                logger.info(`🎯 Intercepted ${parsed.length} buses from API: ${responseUrl.substring(0, 100)}`);
                interceptedBuses.push(...parsed);
              }
            } catch {}
          }
        }
      } catch {}
    });

    // Shorter timeouts for faster failure
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    logger.info('🌐 Navigating to AbhiBus...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    logger.info('✅ Page loaded');

    // Wait for content to appear — but with a RACE: either API data or DOM data
    const scrapeDelay = parseInt(process.env.SCRAPE_DELAY_MS) || 5000;

    // Wait for price content OR intercepted API data (whichever first)
    const waitStart = Date.now();
    const maxWait = scrapeDelay + 5000; // Max 10 seconds wait
    
    while (Date.now() - waitStart < maxWait) {
      // If we already intercepted bus data from API, we're done early!
      if (interceptedBuses.length > 0) {
        logger.info(`⚡ API data intercepted in ${Date.now() - waitStart}ms — skipping DOM scrape`);
        break;
      }
      
      // Check if page has visible price content
      const hasContent = await page.evaluate(() => {
        const bodyText = document.body?.innerText || '';
        return bodyText.includes('₹') || bodyText.includes('No buses') || bodyText.includes('Oops');
      }).catch(() => false);
      
      if (hasContent) {
        logger.info(`✅ Page content ready in ${Date.now() - waitStart}ms`);
        break;
      }
      
      await delay(500);
    }

    // ─── FAST PATH: Use intercepted API data if available ───
    if (interceptedBuses.length > 0) {
      const results = deduplicateAndFilter(interceptedBuses, busName);
      results.sort((a, b) => a.price - b.price);

      const totalTime = Date.now() - startTime;
      logger.info(`✅ Found ${results.length} buses via API intercept in ${totalTime}ms. Lowest: ₹${results[0]?.price}`);

      return buildResponse(results, url, source, destination);
    }

    // ─── SLOW PATH: DOM scraping fallback ───
    logger.info('📄 No API data intercepted, falling back to DOM scraping...');

    // Quick scroll to trigger lazy loading
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 600);
        await new Promise(r => setTimeout(r, 200));
      }
    });
    await delay(2000);

    // Check for block/captcha
    const pageContent = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '');
    if (pageContent.toLowerCase().includes('captcha') || pageContent.toLowerCase().includes('blocked') || pageContent.toLowerCase().includes('access denied')) {
      logger.warn('🚫 Bot detection triggered!');
      return {
        success: false, price: null, buses: [],
        message: 'AbhiBus temporarily blocked automated requests. Please try again in a few minutes.',
        url, totalResults: 0,
      };
    }

    // DOM extraction
    const results = await page.evaluate((targetBus) => {
      const buses = [];
      const processedCards = new Set();
      
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], span.button'));
      const bookButtons = buttons.filter(btn => {
        const t = (btn.innerText || '').toLowerCase();
        return t.includes('select seat') || t.includes('show seat') || t.includes('book');
      });

      bookButtons.forEach(btn => {
        let card = btn.parentElement;
        while (card && card !== document.body) {
          if (card.innerText && card.innerText.includes('₹') && card.innerText.match(/\d{2}:\d{2}/) && card.offsetHeight > 50) {
            break;
          }
          card = card.parentElement;
        }

        if (!card || card === document.body || processedCards.has(card)) return;
        processedCards.add(card);

        const text = card.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 3) return;

        try {
          let name = '';
          const nameEl = card.querySelector('.travels-name, .operator-name, h5, h4, h3, [class*="travels"], [class*="operator"]');
          if (nameEl && nameEl.innerText.length > 3 && !nameEl.innerText.toLowerCase().startsWith('from')) {
            name = nameEl.innerText.trim();
          } else {
            const travelLine = lines.find(l => l.match(/travels|transport|tours|ksrtc|apsrtc|tgsrtc|msrtc|srtc|lines/i) && l.length < 60);
            if (travelLine) { name = travelLine; }
            else {
              name = lines.find(l => l.length > 4 && !l.includes('₹') && !l.match(/\d{2}:\d{2}/) && !l.toLowerCase().includes('save') && !l.toLowerCase().startsWith('from') && !l.toLowerCase().startsWith('to') && !l.toLowerCase().includes('offer') && !l.toLowerCase().includes('off per seat')) || 'Unknown Operator';
            }
          }
          name = name.split('\n')[0].trim();

          const priceLines = lines.filter(l => l.includes('₹') && !l.toLowerCase().includes('save') && !l.toLowerCase().includes('off'));
          let price = null;
          for (const pl of priceLines) {
            const match = pl.match(/₹\s*([\d,]+)/);
            if (match) {
              const val = parseInt(match[1].replace(/[,\s]/g, ''));
              if (val > 50 && val < 15000) {
                if (price === null || val < price) price = val;
              }
            }
          }
          if (!price) return;

          let originalPrice = null;
          const struckEl = card.querySelector('del, s, [class*="strike"], [class*="original"], [class*="old-price"]');
          if (struckEl) {
            const m = struckEl.textContent.match(/[\d,]+/);
            if (m) originalPrice = parseInt(m[0].replace(/,/g, ''));
          }

          let departure = '';
          const times = text.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm|Hrs|hrs)?\b/g);
          if (times && times.length > 0) departure = times[0];

          let busType = '';
          const typePatterns = ['AC Sleeper', 'Non AC Sleeper', 'AC Seater', 'Non AC Seater', 'Volvo', 'AC Semi Sleeper', 'Multi Axle', 'Scania', 'Mercedes', 'A/C', 'Non A/C', 'Sleeper', 'Seater', 'Push Back'];
          for (const tp of typePatterns) {
            if (text.toLowerCase().includes(tp.toLowerCase())) { busType = tp; break; }
          }

          let rating = null;
          const ratingMatch = text.match(/(\d+\.?\d*)\s*\/\s*5|★\s*(\d+\.?\d*)/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1] || ratingMatch[2]);

          let seats = null;
          const seatMatch = text.match(/(\d+)\s*seat/i);
          if (seatMatch) seats = parseInt(seatMatch[1]);

          buses.push({
            name, price, originalPrice, departure, busType, rating, seats,
            discount: originalPrice && originalPrice > price ? originalPrice - price : null,
          });
        } catch {}
      });

      // Filter by operator if specified
      if (targetBus && buses.length > 0) {
        const filtered = buses.filter(b => b.name.toLowerCase().includes(targetBus.toLowerCase()));
        if (filtered.length > 0) return filtered;
      }

      // Deduplicate
      const seen = new Set();
      return buses.filter(b => {
        const key = `${b.name}-${b.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }, busName);

    results.sort((a, b) => a.price - b.price);

    const totalTime = Date.now() - startTime;
    logger.info(`✅ DOM scrape found ${results.length} buses in ${totalTime}ms`);

    return buildResponse(results, url, source, destination);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error(`❌ Scraping error (${totalTime}ms) for ${source} → ${destination}:`, error.message);
    return {
      success: false, price: null, buses: [],
      message: `Scraping failed: ${error.message}`,
      url: url || 'https://www.abhibus.com/',
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
};

/**
 * Deduplicate and optionally filter buses by operator name
 */
function deduplicateAndFilter(buses, busName) {
  let filtered = buses;
  if (busName) {
    const match = buses.filter(b => b.name.toLowerCase().includes(busName.toLowerCase()));
    if (match.length > 0) filtered = match;
  }
  const seen = new Set();
  return filtered.filter(b => {
    const key = `${b.name}-${b.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build a standardized response object
 */
function buildResponse(results, url, source, destination) {
  if (results.length === 0) {
    logger.warn(`No prices found for ${source} → ${destination}`);
    return {
      success: false, price: null, buses: [],
      message: 'No buses found for this route/date. Try a different date or city.',
      url, totalResults: 0,
    };
  }

  return {
    success: true,
    price: results[0].price,
    buses: results,
    cheapestBus: results[0],
    totalResults: results.length,
    url,
  };
}

module.exports = { scrapeBusPrices, buildSearchUrl, formatDateForUrl, getCityId };
