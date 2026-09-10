/**
 * Rate Limit
 *
 * https://github.com/express-rate-limit/express-rate-limit
 */

// TEST_ENABLE_SECURITY=1 switches the "secured" fixture server variant to
// actually enforce rate limiting on /limited — the default variant keeps
// it disabled. Limit set low (3/min) so a test can trip 429 in a handful
// of requests instead of waiting out a realistic production window.
const securityEnabled = process.env.TEST_ENABLE_SECURITY === '1';

module.exports = {

  // Enable rate limiting
  enabled: securityEnabled,

  // Scope: '*' (all routes, default), a single path, or an array of paths
  path: '/limited',

  // Time window in ms
  windowMs: 60 * 1000,

  // Max requests per IP within windowMs
  limit: 3,

  // Send RateLimit-* headers (draft-8 standard)
  standardHeaders: 'draft-8',

  // Disable the deprecated X-RateLimit-* headers
  legacyHeaders: false

};
