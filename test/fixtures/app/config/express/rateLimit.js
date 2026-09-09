/**
 * Rate Limit
 *
 * https://github.com/express-rate-limit/express-rate-limit
 */

module.exports = {

  // Enable rate limiting
  enabled: false,

  // Time window in ms
  windowMs: 15 * 60 * 1000,

  // Max requests per IP within windowMs
  limit: 100,

  // Send RateLimit-* headers (draft-8 standard)
  standardHeaders: 'draft-8',

  // Disable the deprecated X-RateLimit-* headers
  legacyHeaders: false

};
