/**
 * Session Config
 *
 * Requires cookies.js to be enabled — the secret key is shared with
 * the cookie parser (COOKIES_SECRET_KEY / cookies.js "secret").
 */

module.exports = {

  // Enable express-session middleware
  // @type Boolean
  enabled: false,

  // Force session save on every request, even if unmodified
  // @type Boolean
  resave: false,

  // Prevent saving uninitialized sessions
  // @type Boolean
  saveUninitialized: false,

  // Cookie options
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    secure: false, // set true when behind HTTPS
    httpOnly: true
  }

};
