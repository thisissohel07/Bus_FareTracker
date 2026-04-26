/**
 * Email Notification Service
 * 
 * Uses Resend API to send price drop notification emails.
 * Falls back to console logging if API key is not configured.
 */

const { Resend } = require('resend');
const logger = require('../utils/logger');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a price drop notification email
 * @param {Object} params - Notification parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.source - Source city
 * @param {string} params.destination - Destination city
 * @param {Date} params.date - Travel date
 * @param {number} params.oldPrice - Previous price
 * @param {number} params.newPrice - New (lower) price
 * @param {string} params.busName - Bus operator name
 * @param {string} params.busType - Type of bus (AC/Non-AC etc)
 * @param {string} params.departureTime - Departure time
 * @param {string} params.url - Search URL for booking
 */
const sendPriceDropEmail = async ({ to, source, destination, date, oldPrice, newPrice, busName, busType, departureTime, url }) => {
  const savings = oldPrice - newPrice;
  const percentDrop = ((savings / oldPrice) * 100).toFixed(1);
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:600px;margin:20px auto;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">🚌 BusFare Tracker</h1>
          <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">Price Drop Alert</p>
        </div>
        <div style="padding:32px;">
          <div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
            <p style="color:#6ee7b7;margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Price Dropped!</p>
            <p style="color:#fff;margin:0;font-size:36px;font-weight:bold;">₹${newPrice}</p>
            <p style="color:#a7f3d0;margin:8px 0 0;font-size:14px;">
              <span style="text-decoration:line-through;">₹${oldPrice}</span> → Save ₹${savings} (${percentDrop}% off)
            </p>
          </div>
          <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #334155;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">Route</td><td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;">${capitalizeFirst(source)} → ${capitalizeFirst(destination)}</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;border-top:1px solid #334155;">Date</td><td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;border-top:1px solid #334155;">${formattedDate}</td></tr>
              ${busName ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;border-top:1px solid #334155;">Bus</td><td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;border-top:1px solid #334155;">${busName}</td></tr>` : ''}
              ${busType ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;border-top:1px solid #334155;">Type</td><td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;border-top:1px solid #334155;">${busType}</td></tr>` : ''}
              ${departureTime ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;border-top:1px solid #334155;">Time</td><td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;border-top:1px solid #334155;">${departureTime}</td></tr>` : ''}
            </table>
          </div>
          <a href="${url}" style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:600;">🎫 Book Now &amp; Save ₹${savings}!</a>
        </div>
        <div style="padding:20px 32px;text-align:center;border-top:1px solid #334155;">
          <p style="color:#64748b;margin:0;font-size:12px;">You're receiving this because you set up a price alert on BusFare Tracker.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `🔔 Price Drop! ${capitalizeFirst(source)} → ${capitalizeFirst(destination)} now ₹${newPrice} (Save ₹${savings})`;

  try {
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_')) {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [to],
        subject,
        html: htmlContent,
      });

      if (error) {
        logger.error(`❌ Resend error for ${to}:`, error.message);
        return { success: false, error: error.message };
      }

      logger.info(`📧 Price drop email sent to ${to} (ID: ${data?.id})`);
      return { success: true, id: data?.id };
    } else {
      // Development fallback
      logger.info(`📧 [DEV MODE] Would send email to ${to}:`);
      logger.info(`   Subject: ${subject}`);
      logger.info(`   Body: Price dropped from ₹${oldPrice} to ₹${newPrice}. Save ₹${savings}!`);
      return { success: true };
    }
  } catch (error) {
    logger.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPriceDropEmail };
