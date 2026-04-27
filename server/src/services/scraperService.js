/**
 * Scraper Service
 * 
 * Uses Puppeteer to scrape real bus ticket prices from AbhiBus.
 * Extracts ALL buses (private + government) with actual fares.
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
  // Fallback URL format without IDs
  return `https://www.abhibus.com/bus-tickets/${encodeURIComponent(src)}-to-${encodeURIComponent(dst)}-bus/${formattedDate}`;
};

/**
 * Scrape ALL bus prices from AbhiBus (private + government)
 */
const scrapeBusPrices = async (source, destination, date, busName = null) => {
  let browser = null;

  try {
    const url = await buildSearchUrl(source, destination, date);
    logger.info(`🔍 Scraping: ${url}`);

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    // Realistic user-agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    // Block images/CSS for faster loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for bus listings to appear
    const scrapeDelay = parseInt(process.env.SCRAPE_DELAY_MS) || 4000;
    await delay(scrapeDelay);

    // Scroll down to trigger lazy-loaded private bus listings
    await autoScroll(page);
    await delay(2000);

    // Try clicking all "View Buses" buttons to expand aggregator blocks (KSRTC etc.)
    try {
      const viewBtns = await page.$$('button, a, div, span');
      for (const btn of viewBtns) {
        const text = await page.evaluate(el => el.textContent?.trim(), btn);
        if (text && (text.includes('View Buses') || text.includes('View All'))) {
          try { await btn.click(); await delay(1500); } catch {}
        }
      }
    } catch {}

    // Scroll again after expanding
    await autoScroll(page);
    await delay(1500);

    // ─── Extract bus data from the page ───────────────────
    const results = await page.evaluate((targetBus) => {
      const buses = [];
      const processedCards = new Set();
      
      // Find all buttons that indicate a bus booking action
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], span.button'));
      const bookButtons = buttons.filter(btn => {
        const t = (btn.innerText || '').toLowerCase();
        return t.includes('select seat') || t.includes('show seat') || t.includes('book');
      });

      bookButtons.forEach(btn => {
        // Traverse up to find the container card (usually tall and contains ₹)
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
          console.log("LINES FOR BUS:", lines.join(' | '));
          // 1. Extract Name (Ignore "From", "To")
          let name = '';
          const nameEl = card.querySelector('.travels-name, .operator-name, h5, h4, h3, [class*="travels"], [class*="operator"]');
          if (nameEl && nameEl.innerText.length > 3 && !nameEl.innerText.toLowerCase().startsWith('from')) {
            name = nameEl.innerText.trim();
          } else {
            const travelLine = lines.find(l => l.match(/travels|transport|tours|ksrtc|apsrtc|tgsrtc|msrtc|srtc|lines/i) && l.length < 60);
            if (travelLine) {
              name = travelLine;
            } else {
              name = lines.find(l => l.length > 4 && !l.includes('₹') && !l.match(/\d{2}:\d{2}/) && !l.toLowerCase().includes('save') && !l.toLowerCase().startsWith('from') && !l.toLowerCase().startsWith('to') && !l.toLowerCase().includes('offer') && !l.toLowerCase().includes('off per seat')) || 'Unknown Operator';
            }
          }
          // Clean up name
          name = name.split('\n')[0].trim();

          // 2. Extract Price (Ignore "Save ₹" or "Off ₹")
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
          if (!price) return; // Must have a valid fare

          // 3. Extract original/struck price
          let originalPrice = null;
          const struckEl = card.querySelector('del, s, [class*="strike"], [class*="original"], [class*="old-price"]');
          if (struckEl) {
            const m = struckEl.textContent.match(/[\d,]+/);
            if (m) originalPrice = parseInt(m[0].replace(/,/g, ''));
          }

          // 4. Extract Departure
          let departure = '';
          const times = text.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm|Hrs|hrs)?\b/g);
          if (times && times.length > 0) departure = times[0];

          // 5. Extract Bus Type
          let busType = '';
          const typePatterns = ['AC Sleeper', 'Non AC Sleeper', 'AC Seater', 'Non AC Seater', 'Volvo', 'AC Semi Sleeper', 'Multi Axle', 'Scania', 'Mercedes', 'A/C', 'Non A/C', 'Sleeper', 'Seater', 'Push Back'];
          for (const tp of typePatterns) {
            if (text.toLowerCase().includes(tp.toLowerCase())) {
              busType = tp; break;
            }
          }

          // 6. Extract Rating
          let rating = null;
          const ratingMatch = text.match(/(\d+\.?\d*)\s*\/\s*5|★\s*(\d+\.?\d*)/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1] || ratingMatch[2]);

          // 7. Extract Seats
          let seats = null;
          const seatMatch = text.match(/(\d+)\s*seat/i);
          if (seatMatch) seats = parseInt(seatMatch[1]);

          buses.push({
            name, price, originalPrice, departure, busType, rating, seats,
            discount: originalPrice && originalPrice > price ? originalPrice - price : null,
          });
        } catch (e) {}
      });

      // Filter by specific bus operator if provided
      if (targetBus && buses.length > 0) {
        const filtered = buses.filter(b => b.name.toLowerCase().includes(targetBus.toLowerCase()));
        if (filtered.length > 0) return filtered;
      }

      // Deduplicate
      const seen = new Set();
      const unique = [];
      for (const b of buses) {
        const key = `${b.name}-${b.price}`;
        if (!seen.has(key)) { seen.add(key); unique.push(b); }
      }

      return unique;
    }, busName);

    // Sort by price ascending
    results.sort((a, b) => a.price - b.price);

    if (results.length === 0) {
      logger.warn(`No prices found for ${source} → ${destination}`);
      return {
        success: false, price: null, buses: [],
        message: 'No buses found for this route/date. Try a different date or city.',
        url, totalResults: 0,
      };
    }

    const lowestPrice = results[0].price;
    logger.info(`✅ Found ${results.length} buses. Lowest: ₹${lowestPrice} (${results[0].name})`);

    return {
      success: true,
      price: lowestPrice,
      buses: results,
      cheapestBus: results[0],
      totalResults: results.length,
      url,
    };

  } catch (error) {
    logger.error(`❌ Scraping error for ${source} → ${destination}:`, error.message);
    return {
      success: false, price: null, buses: [],
      message: error.message,
      url: `https://www.abhibus.com/`, // fallback
    };
  } finally {
    if (browser) await browser.close();
  }
};

/**
 * Auto-scroll page to trigger lazy loading
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const scrollStep = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, scrollStep);
        totalHeight += scrollStep;
        if (totalHeight >= document.body.scrollHeight || totalHeight > 15000) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
}

module.exports = { scrapeBusPrices, buildSearchUrl, formatDateForUrl, getCityId };
