/**
 * Session Config
 *
 * Requires cookies.js to be enabled — the secret key is shared with the
 * cookie parser (COOKIES_SECRET_KEY / cookies.js "secret").
 *
 * TEST_ENABLE_SECURITY=1 switches the "secured" fixture server variant to
 * actually enable sessions — the default variant keeps it disabled.
 */

module.exports = {

  // Enable express-session middleware
  // @type Boolean
  enabled: process.env.TEST_ENABLE_SECURITY === '1',

  // Force session save on every request, even if unmodified
  // @type Boolean
  resave: false,

  // Prevent saving uninitialized sessions
  // @type Boolean
  saveUninitialized: false,

  // Cookie options
  cookie: {
    maxAge: 60 * 1000,
    secure: false,
    httpOnly: true
  }

};
