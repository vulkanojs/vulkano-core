/**
 * CORS Config
 */

module.exports = {

  // Enable CORS
  // @type Boolean
  enabled: false,

  // Path where CORS headers are applied
  // @type String
  path: '/',

  // Allowed origin
  // @type String
  origin: '*',

  // Additional allowed request headers
  // @type Array
  headers: ['x-token-auth']

};
