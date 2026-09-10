/**
 * Cookies Config
 */

// TEST_ENABLE_SECURITY=1 switches the "secured" fixture server variant to
// actually enable cookies (and, in turn, sessions) — the default variant
// keeps it disabled.
module.exports = {

  // Enable cookie parser middleware
  // @type Boolean
  enabled: process.env.TEST_ENABLE_SECURITY === '1',

  // Secret key used to sign cookies — use https://api.wordpress.org/secret-key/1.1/salt/
  // @type String
  secret: process.env.COOKIES_SECRET_KEY || ''

};
