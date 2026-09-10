/**
 * JWT Config
 */

// TEST_ENABLE_SECURITY=1 switches the "secured" fixture server variant to
// actually enforce JWT on /secure — the default variant keeps it disabled.
const securityEnabled = process.env.TEST_ENABLE_SECURITY === '1';

module.exports = {

  // Enable JWT
  // @type Boolean
  enabled: securityEnabled,

  // Secret key — use https://api.wordpress.org/secret-key/1.1/salt/ to generate one
  // @type String
  key: process.env.JWT_SECRET_KEY || '',

  // Header name used to send the token
  // @type String
  header: 'x-token-auth',

  // Query parameter name used to send the token
  // @type String
  queryParameter: 'token',

  // Cookie name used to send the token
  // @type String
  cookieName: 'token',

  // Path where the token is required
  // @type String
  path: securityEnabled ? '/secure' : '/api/',

  // Paths excluded from token verification
  // See https://github.com/jfromaniello/express-unless for pattern examples
  // @type Array
  ignore: securityEnabled ? [] : [
    '/api/',
    /^\/api\/auth(?!\/(current))/i
  ]

};
