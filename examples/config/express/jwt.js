/**
 * JWT Config
 */

module.exports = {

  // Enable JWT
  // @type Boolean
  enabled: false,

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
  path: '/api/',

  // Paths excluded from token verification
  // See https://github.com/jfromaniello/express-unless for pattern examples
  // @type Array
  ignore: [
    '/api/',
    /^\/api\/auth(?!\/(current))/i
  ]

};
